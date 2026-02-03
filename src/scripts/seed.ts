import { prisma } from "@/lib/prisma";

async function main() {
  const user = await prisma.user.create({
    data: {
      email: "teste@olyon.dev",
      name: "Usuário Teste",
    },
  });

  console.log(user);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
