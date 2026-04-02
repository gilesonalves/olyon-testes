import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10)

  const user = await prisma.user.create({
    data: {
      email: "teste@olyon.dev",
      name: "Usuário Teste",
      password: passwordHash,
    },
  })

  console.log(user)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
