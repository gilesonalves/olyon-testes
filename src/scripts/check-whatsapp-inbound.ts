import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  const storeId = "cmml6v12y0000rc75l0pq874n";
  const contact = "27998238437";

  const conversation = await prisma.conversation.findFirst({
    where: {
      storeId,
      channel: "WHATSAPP",
      contact,
    },
    orderBy: {
      lastMessageAt: "desc",
    },
    select: {
      id: true,
      storeId: true,
      channel: true,
      contact: true,
      state: true,
      createdAt: true,
      lastMessageAt: true,
    },
  });

  console.log("Conversation:", conversation);

  const messages = await prisma.conversationMessage.findMany({
    where: {
      storeId,
      conversation: {
        contact,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      storeId: true,
      conversationId: true,
      direction: true,
      providerMessageId: true,
      text: true,
      createdAt: true,
    },
  });

  console.log("Messages:", messages);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });