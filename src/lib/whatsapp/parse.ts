// src/lib/whatsapp/parse.ts

export type IncomingWhatsApp = {
  providerMessageId: string;
  from: string; // E.164
  text: string | null;
  raw: unknown;
};

type TestPayload = {
  providerMessageId?: unknown;
  from?: unknown;
  text?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Parser mínimo (dry-run).
 * Suporta payload de teste:
 * { providerMessageId, from, text }
 */
export function parseIncomingWhatsApp(payload: unknown): IncomingWhatsApp | null {
  if (!isObject(payload)) return null;

  const p = payload as TestPayload;

  if (typeof p.providerMessageId === "string" && typeof p.from === "string") {
    return {
      providerMessageId: p.providerMessageId,
      from: p.from,
      text: typeof p.text === "string" ? p.text : null,
      raw: payload,
    };
  }

  return null;
}