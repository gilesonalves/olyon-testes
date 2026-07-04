"use client"

import * as React from "react"
import { signOut, useSession } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { LogOut, MessageCircle, type LucideIcon } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select"
import { Store } from "../../../types/store"

type SidebarNavItem = {
  title: string
  url: string
  isActive?: boolean
  icon?: LucideIcon
}

type SidebarNavGroup = {
  title: string
  url: string
  items: SidebarNavItem[]
}

const data: {
  versions: string[]
  navMain: SidebarNavGroup[]
} = {
  versions: ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"],
  navMain: [
    {
      title: "Home",
      url: "#",
      items: [
        {
          title: "Home",
          url: "/dashboard",
        },
      ],
    },
    {
      title: "Atendimento",
      url: "#",
      items: [
        {
          title: "Atendimento",
          url: "/atendimento",
          icon: MessageCircle,
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
          title: "Agenda online",
          url: "/agenda-online",
        },
        {
          title: "Horarios de atendimento",
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
      title: "Servicos",
      url: "#",
      items: [
        {
          title: "Servicos",
          url: "/servicos",
        },
      ],
    },
    {
      title: "Financeiro",
      url: "#",
      items: [
        {
          title: "Entradas/Saidas",
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
        {
          title: "Minha assinatura",
          url: "/financeiro",
        },
      ],
    },
    {
      title: "Cadastros",
      url: "#",
      items: [
        {
          title: "Usuarios",
          url: "/usuarios",
        },
        {
          title: "Clientes",
          url: "/clientes",
        },
      ],
    },
    {
      title: "Configuracoes",
      url: "#",
      items: [
        {
          title: "Dados da loja",
          url: "/configuracoes/loja",
        },
        {
          title: "Configuracoes do Bot",
          url: "/configuracoes/bot",
        },
        {
          title: "WhatsApp Meta",
          url: "/configuracoes/whatsapp",
        },
      ],
    },
  ],
}

function handleLogout() {
  signOut({ callbackUrl: "/login" })
}

export function AppSidebar({
  operationalStatus,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  operationalStatus: "ACTIVE" | "SUSPENDED"
}) {
  const [activeStoreId, setActiveStoreId] = React.useState("")
  const [stores, setStores] = React.useState<Store[]>([])
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const navGroups =
    operationalStatus === "SUSPENDED"
      ? data.navMain
          .map((group) => ({
            ...group,
            items: group.items.filter(
              (item) =>
                item.url === "/dashboard" || item.url === "/financeiro"
            ),
          }))
          .filter((group) => group.items.length > 0)
      : data.navMain

  React.useEffect(() => {
    if (session?.user.storeId && stores.length > 0) {
      setActiveStoreId(session.user.storeId)
    }
  }, [session?.user.storeId, stores.length])

  React.useEffect(() => {
    async function loadStores() {
      const res = await fetch("/api/store/list")
      const data = await res.json()
      setStores(data)
    }

    void loadStores()
  }, [])

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <picture>
          <img className="block pt-3" src="/imagens/logo-login.svg" alt="" />
        </picture>

        <div className="mt-4 flex-1">
          <Select
            value={activeStoreId}
            onValueChange={async (storeId) => {
              await fetch("/api/store/switch", {
                method: "POST",
                body: JSON.stringify({ storeId }),
              })

              setActiveStoreId(storeId)
              router.refresh()
            }}
          >
            <SelectTrigger className="mb-4 w-full bg-white text-black">
              <SelectValue placeholder="Selecione uma loja" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((navItem) => (
                  <SidebarMenuItem key={navItem.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        navItem.isActive ??
                        (pathname === navItem.url ||
                          pathname.startsWith(`${navItem.url}/`))
                      }
                    >
                      <a href={navItem.url}>
                        {navItem.icon ? <navItem.icon className="size-4" /> : null}
                        <span>{navItem.title}</span>
                      </a>
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
          className="flex w-full cursor-pointer items-center gap-2 py-2 text-sm"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
