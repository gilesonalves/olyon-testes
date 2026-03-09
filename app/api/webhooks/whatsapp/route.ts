// app/api/webhooks/whatsapp/route.ts
import { NextRequest } from "next/server"
import { prisma, Prisma } from "@/lib/prisma"
import { parseIncomingWhatsApp } from "@/lib/whatsapp/parse"
import { handleIncomingMessage } from "@/lib/bot/flow"

function normalizeText(input: string) {
    return input
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
    try {
        return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
    } catch {
        return { error: "non-serializable payload" } as Prisma.InputJsonValue
    }
}

export async function POST(req: NextRequest) {
    const storeId = req.headers.get("x-store-id")
    const secret = req.headers.get("x-webhook-secret")

    if (!storeId) {
        return Response.json({ ok: false, message: "Missing x-store-id" }, { status: 400 })
    }

    const expected = process.env.WHATSAPP_WEBHOOK_SECRET
    if (expected && secret !== expected) {
        return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 })
    }

    const payload = (await req.json()) as unknown
    const msg = parseIncomingWhatsApp(payload)

    if (!msg) {
        return Response.json(
            { ok: false, message: "Unsupported payload format (dry-run parser)" },
            { status: 400 }
        )
    }

    // 1) Upsert conversation (sempre existe)
    const conversation = await prisma.conversation.upsert({
        where: {
            storeId_channel_contact: { storeId, channel: "WHATSAPP", contact: msg.from },
        },
        update: { lastMessageAt: new Date() },
        create: {
            storeId,
            channel: "WHATSAPP",
            contact: msg.from,
            state: "IDLE",
            lastMessageAt: new Date(),
        },
    })

    // 2) Persistir IN (idempotente)
    const savedIn = await prisma.conversationMessage.upsert({
        where: {
            storeId_providerMessageId: { storeId, providerMessageId: msg.providerMessageId },
        },
        update: {},
        create: {
            storeId,
            conversationId: conversation.id,
            direction: "IN",
            providerMessageId: msg.providerMessageId,
            text: msg.text ?? undefined,
            payload: toJsonValue(msg.raw),
        },
    })

    // 3) Rodar flow
    const bot = handleIncomingMessage({
        state: conversation.state,
        text: msg.text,
    })

    // 4) Aplicar ações em transação (SaaS real)
    const outMessages: string[] = []
    let nextState: string | null = null
    let ensuredDraftId: string | null = null

    await prisma.$transaction(async (tx) => {
        for (const action of bot.actions) {
            if (action.type === "SET_STATE") {
                nextState = action.state
                await tx.conversation.update({
                    where: { id: conversation.id },
                    data: { state: action.state, lastMessageAt: new Date() },
                })
            }

            if (action.type === "SELECT_SERVICE_FROM_TEXT") {
                // garante que temos draftId
                if (!ensuredDraftId) {
                    // se por algum motivo ENSURE_DRAFT não rodou antes
                    const draft = await tx.appointmentDraft.findFirst({
                        where: { storeId, conversationId: conversation.id, status: "DRAFT" },
                        orderBy: { createdAt: "desc" },
                    });

                    if (draft) ensuredDraftId = draft.id;
                    else {
                        const created = await tx.appointmentDraft.create({
                            data: {
                                storeId,
                                conversationId: conversation.id,
                                status: "DRAFT",
                                channel: "WHATSAPP",
                                customerPhone: msg.from,
                            },
                        });
                        ensuredDraftId = created.id;
                    }
                }

                const query = normalizeText(action.text);

                // busca serviços ativos da loja (só 2 hoje, então ok pegar todos)
                const services = await tx.service.findMany({
                    where: { storeId, active: true },
                    select: { id: true, name: true, durationMin: true },
                    orderBy: { name: "asc" },
                });

                const matched =
                    services.find((s) => normalizeText(s.name) === query) ??
                    services.find((s) => normalizeText(s.name).includes(query) || query.includes(normalizeText(s.name)));

                if (!matched) {
                    const list = services
                        .map((s, idx) => `${idx + 1}) ${s.name}`)
                        .join("\n");

                    const textOut =
                        services.length
                            ? `Não encontrei esse serviço. Escolha uma opção:\n${list}`
                            : "Ainda não há serviços cadastrados. Peça para o admin cadastrar um serviço primeiro.";

                    outMessages.push(textOut);
                    await tx.conversationMessage.create({
                        data: {
                            storeId,
                            conversationId: conversation.id,
                            direction: "OUT",
                            text: textOut,
                            payload: toJsonValue({ source: "bot", text: textOut }),
                        },
                    });

                    // mantém state em CHOOSING_SERVICE
                    await tx.conversation.update({
                        where: { id: conversation.id },
                        data: { state: "CHOOSING_SERVICE", lastMessageAt: new Date() },
                    });

                    nextState = "CHOOSING_SERVICE";
                    return;
                }

                // Achou: salva no draft + avança estado
                await tx.appointmentDraft.update({
                    where: { id: ensuredDraftId },
                    data: { serviceId: matched.id },
                });

                const textOut = `Show! Serviço: ${matched.name} (${matched.durationMin} min). Agora me diga o dia e horário (ex: amanhã 14h).`;

                await tx.conversation.update({
                    where: { id: conversation.id },
                    data: { state: "CHOOSING_TIME", lastMessageAt: new Date() },
                });

                nextState = "CHOOSING_TIME";
                outMessages.push(textOut);

                await tx.conversationMessage.create({
                    data: {
                        storeId,
                        conversationId: conversation.id,
                        direction: "OUT",
                        text: textOut,
                        payload: toJsonValue({ source: "bot", text: textOut, serviceId: matched.id }),
                    },
                });
            }

            if (action.type === "ENSURE_DRAFT") {
                // Upsert "draft ativo" (v1): 1 draft DRAFT por conversation.
                // (Mais tarde: activeDraftId)
                const draft = await tx.appointmentDraft.findFirst({
                    where: { storeId, conversationId: conversation.id, status: "DRAFT" },
                    orderBy: { createdAt: "desc" },
                })

                if (draft) {
                    ensuredDraftId = draft.id
                } else {
                    const created = await tx.appointmentDraft.create({
                        data: {
                            storeId,
                            conversationId: conversation.id,
                            status: "DRAFT",
                            channel: "WHATSAPP",
                            customerPhone: msg.from,
                        },
                    })
                    ensuredDraftId = created.id
                }
            }

            if (action.type === "REPLY_TEXT") {
                outMessages.push(action.text)

                await tx.conversationMessage.create({
                    data: {
                        storeId,
                        conversationId: conversation.id,
                        direction: "OUT",
                        // OUT não precisa providerMessageId (vem do provider quando enviar de verdade)
                        text: action.text,
                        payload: toJsonValue({ source: "bot", text: action.text }),
                    },
                })
            }
        }
    })

    return Response.json({
        ok: true,
        data: {
            conversationId: conversation.id,
            messageId: savedIn.id,
            nextState,
            draftId: ensuredDraftId,
            replies: outMessages,
        },
    })
}