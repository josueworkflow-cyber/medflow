"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Boxes,
  DollarSign,
  Truck,
  Users,
  Settings,
  UserCircle,
  FileText,
  BarChart3,
  Tag,
  Kanban,
} from "lucide-react";


import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    title: "Dashboard",
    url: "/sistema",
    icon: LayoutDashboard,
  },
  {
    title: "Produtos",
    url: "/sistema/produtos",
    icon: Package,
  },
  {
    title: "Categorias",
    url: "/sistema/categorias",
    icon: Tag,
  },
  {
    title: "Vendas",
    url: "/sistema/vendas",
    icon: ShoppingCart,
  },
  {
    title: "Funil de Pedidos",
    url: "/sistema/pedidos/funil",
    icon: Kanban,
  },

  {
    title: "Clientes",
    url: "/sistema/clientes",
    icon: Users,
  },
  {
    title: "Vendedores",
    url: "/sistema/vendedores",
    icon: UserCircle,
  },
  {
    title: "Estoque",
    url: "/sistema/estoque",
    icon: Boxes,
  },
  {
    title: "Compras",
    url: "/sistema/compras",
    icon: FileText,
  },
  {
    title: "Fornecedores",
    url: "/sistema/fornecedores",
    icon: Truck,
  },
  {
    title: "Financeiro",
    url: "/sistema/financeiro",
    icon: DollarSign,
  },
  {
    title: "Logística",
    url: "/sistema/logistica",
    icon: Truck,
  },
];

const secondaryItems = [
  {
    title: "Relatórios",
    url: "/sistema/relatorios",
    icon: BarChart3,
  },
  {
    title: "Usuários",
    url: "/sistema/usuarios",
    icon: Users,
  },
  {
    title: "Configurações",
    url: "/sistema/configuracoes",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold leading-none tracking-tight">MedFlow</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">ERP Distribuidora</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Administração</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 px-2 py-1.5 text-left text-sm">
          <UserCircle className="h-8 w-8 text-muted-foreground" />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold text-slate-700">Administrador</span>
            <span className="truncate text-xs text-slate-500">Logado agora</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
