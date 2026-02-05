"use client"
import { signOut } from "next-auth/react"
import * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { LogOut } from "lucide-react"
import { Select, SelectContent, SelectGroup, SelectTrigger, SelectValue } from "./select"

// This is sample data.
const data = {
  versions: ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"],
  navMain: [
    {
      title: "Eventos",
      url: "#",
      items: [
        {
          title: "Tipos de eventos",
          url: "/eventos",
        },

      ],
    },
    {
      title: "Agendamentos",
      url: "#",
      items: [
        {
          title: "Gerenciar Agendamentos",
          url: "/agendamentos",
        },
        {
          title: "Horários de atendimento",
          url: "/horarios-de-atendimento",
        },
      ],
    },
    {
      title: "Equipes",
      url: "#",
      items: [
        {
          title: "Equipe",
          url: "/equipe",
        },
      ],
    },
    {
      title: "Serviços",
      url: "#",
      items: [
        {
          title: "Serviços",
          url: "/servicos",
        },

      ],
    },
    {
      title: "Financeiro",
      url: "#",
      items: [
        {
          title: "Entradas/Saídas",
          url: "/entradas-saidas",
        },
        {
          title: "Contas a Pagar",
          url: "/contas-a-pagar",
        },
        {
          title: "Controle de Pagamentos",
          url: "/controle-pagamentos",
        },
      ],
    },
    {
      title: "Cadastros",
      url: "#",
      items: [
        {
          title: "Usuários",
          url: "/usuarios",
        },
        {
          title: "Clientes",
          url: "/",
        },

      ],
    },
  ],
}

function handleLogout() {
  signOut({ callbackUrl: "/login" })
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <picture>
          <img className="block pt-3"
            src="/imagens/logo-login.svg"

            alt=""
          />
        </picture>
        <div className="mt-4 flex-1">
          <Select>
            <SelectTrigger className="mb-4 bg-white text-black w-full">
              <SelectValue placeholder="Selecione uma loja" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>

              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* We create a SidebarGroup for each parent. */}
        {data.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={item.isActive}>
                      <a href={item.url}>{item.title}</a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 py-2 text-sm cursor-pointer w-full"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
