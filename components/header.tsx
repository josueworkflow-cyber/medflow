"use client";

import { Bell, Search, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex-1">
        <div className="relative max-w-md hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar pedido, produto ou cliente..."
            className="w-full rounded-lg bg-white border border-slate-200 pl-8 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative rounded-full p-2 hover:bg-slate-100 transition-colors">
          <Bell className="h-5 w-5 text-slate-600" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
        </button>
        <div className="h-8 w-px bg-slate-200 mx-1"></div>
        <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded-lg transition-colors">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-xs font-semibold text-slate-700 leading-none">Administrador</span>
            <span className="text-[10px] text-slate-500 mt-1">Gerente Geral</span>
          </div>
          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center border border-slate-300">
            <User className="h-5 w-5 text-slate-600" />
          </div>
        </div>
      </div>
    </header>
  );
}
