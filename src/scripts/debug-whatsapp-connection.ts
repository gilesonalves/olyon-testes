import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  const storeId = "cmml6v12y0000rc75l0pq874n";

  console.log("== CRIAR WhatsAppConnection ==");

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      state: true,
    },
  });

  console.log("Store encontrada:", store);

  if (!store) {
    throw new Error(`Store nao encontrada para id=${storeId}`);
  }

  const existing = await prisma.whatsAppConnection.findFirst({
    where: {
      OR: [
        { storeId },
        { phoneNumberId: "TEST_PHONE_NUMBER_ID_1" },
        { verifyToken: "olyon-loja-teste-123" },
      ],
    },
    select: {
      id: true,
      storeId: true,
      phoneNumberId: true,
      verifyToken: true,
      status: true,
      isActive: true,
    },
  });

  if (existing) {
    console.log("Ja existe conexao parecida:", existing);
    return;
  }

  const created = await prisma.whatsAppConnection.create({
    data: {
      storeId,
      provider: "META_WHATSAPP",
      phoneNumberId: "TEST_PHONE_NUMBER_ID_1",
      businessAccountId: "TEST_WABA_1",
      displayPhoneNumber: "+55 11 99999-9999",
      verifyToken: "olyon-loja-teste-123",
      accessToken: "test_access_token",
      status: "CONNECTED",
      isActive: true,
    },
    select: {
      id: true,
      storeId: true,
      provider: true,
      phoneNumberId: true,
      businessAccountId: true,
      displayPhoneNumber: true,
      verifyToken: true,
      status: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  console.log("WhatsAppConnection criada com sucesso:", created);
}

main()
  .catch((error) => {
    console.error("ERRO AO CRIAR WhatsAppConnection:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });