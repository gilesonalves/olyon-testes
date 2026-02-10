import type { ReactNode } from "react"
import { SidebarTrigger } from "../ui/sidebar"

const HeaderPage = ({ children }: { children: ReactNode }) => {

    return <header className="flex justify-between w-full h-16 shrink-0 items-center gap-2 border-b border-gray-300 px-6 bg-white">
           <div className="flex items-center gap-2 w-full">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1">
              {children}
            </div>
          </div>
        </header>
}

export default HeaderPage