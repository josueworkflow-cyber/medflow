"use client";

import * as React from "react";
import {
  BarChart3,
  Boxes,
  ChevronRight,
  ClipboardList,
  DollarSign,
  Kanban,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  UserCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type Perfil = "ADMINISTRADOR" | "VENDAS" | "ESTOQUE" | "FINANCEIRO";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  children?: { title: string; url: string }[];
};

const mainItems: NavItem[] = [
  { title: "Dashboard", url: "/sistema", icon: LayoutDashboard },
  { title: "Funil de Vendas", url: "/sistema/pedidos/funil", icon: Kanban },
];

const cadastrosItems: NavItem[] = [
  {
    title: "Cadastros",
    url: "#",
    icon: ClipboardList,
    children: [
      { title: "Produtos", url: "/sistema/produtos" },
      { title: "Categorias", url: "/sistema/categorias" },
      { title: "Clientes", url: "/sistema/clientes" },
      { title: "Vendedores", url: "/sistema/vendedores" },
      { title: "Fornecedores", url: "/sistema/fornecedores" },
    ],
  },
];

const comercialItems: NavItem[] = [
  {
    title: "Comercial",
    url: "#",
    icon: ShoppingCart,
    children: [
      { title: "Vendas", url: "/sistema/vendas" },
      { title: "Compras", url: "/sistema/compras" },
      { title: "Importar NF-e", url: "/sistema/compras/importar" },
    ],
  },
];

const estoqueItems: NavItem[] = [
  {
    title: "Estoque",
    url: "#",
    icon: Boxes,
    children: [
      { title: "Visao Geral", url: "/sistema/estoque" },
      { title: "Pedidos Estoque", url: "/sistema/estoque/pedidos" },
      { title: "Movimentacoes", url: "/sistema/estoque/movimentacoes" },
      { title: "Entrada", url: "/sistema/estoque/entrada" },
      { title: "Alertas", url: "/sistema/estoque/alertas" },
      { title: "Giro", url: "/sistema/estoque/giro" },
    ],
  },
];

const financeiroItems: NavItem[] = [
  {
    title: "Financeiro",
    url: "#",
    icon: DollarSign,
    children: [
      { title: "Dashboard", url: "/sistema/financeiro" },
      { title: "Pedidos Financeiros", url: "/sistema/financeiro/pedidos" },
      { title: "Contas", url: "/sistema/financeiro/contas" },
      { title: "Fluxo de Caixa", url: "/sistema/financeiro/fluxo-caixa" },
      { title: "Contabilidade", url: "/sistema/financeiro/contabilidade" },
    ],
  },
];

const adminItems: NavItem[] = [
  { title: "Usuarios", url: "/sistema/usuarios", icon: UserCircle },
  { title: "Relatorios", url: "/sistema/relatorios", icon: BarChart3, children: [
    { title: "Margem", url: "/sistema/relatorios/margem" },
    { title: "Validade", url: "/sistema/relatorios/validade" },
  ]},
  { title: "Configuracoes", url: "/sistema/configuracoes", icon: Settings },
];

function CollapsibleNavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const isChildActive = item.children?.some(
    (child) => pathname === child.url || pathname.startsWith(child.url + "/")
  );
  const [open, setOpen] = React.useState(isChildActive || false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title} isActive={isChildActive}>
            <item.icon />
            <span>{item.title}</span>
            <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children?.map((child) => (
              <SidebarMenuSubItem key={child.url}>
                <SidebarMenuSubButton
                  asChild
                  isActive={pathname === child.url || pathname.startsWith(child.url + "/")}
                >
                  <Link href={child.url}>
                    <span>{child.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const perfil = ((session?.user as any)?.role || "ADMINISTRADOR") as Perfil;

  const podeVer = (url: string) => {
    if (perfil === "ADMINISTRADOR") return true;
    if (url === "#" || url === "/sistema" || url.startsWith("/sistema/pedidos")) return true;

    if (url.startsWith("/sistema/financeiro")) return perfil === "FINANCEIRO";

    if (url.startsWith("/sistema/estoque") || url.startsWith("/sistema/compras")) return perfil === "ESTOQUE";

    if (url.startsWith("/sistema/fornecedores")) return perfil === "ESTOQUE" || perfil === "FINANCEIRO";

    if (
      url.startsWith("/sistema/vendas") ||
      url.startsWith("/sistema/clientes") ||
      url.startsWith("/sistema/vendedores")
    ) {
      return perfil === "VENDAS";
    }

    if (url.startsWith("/sistema/produtos") || url.startsWith("/sistema/categorias")) {
      return perfil === "VENDAS" || perfil === "ESTOQUE";
    }

    if (
      url.startsWith("/sistema/usuarios") ||
      url.startsWith("/sistema/relatorios") ||
      url.startsWith("/sistema/configuracoes")
    ) {
      return false;
    }

    return false;
  };

  const filtrarItem = (item: NavItem): NavItem | null => {
    if (item.children) {
      const children = item.children.filter((child) => podeVer(child.url));
      return children.length ? { ...item, children } : null;
    }
    return podeVer(item.url) ? item : null;
  };

  const renderItem = (item: NavItem) => {
    if (item.children) {
      return <CollapsibleNavItem key={item.title} item={item} pathname={pathname} />;
    }

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
          <Link href={item.url}>
            <item.icon />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const gestao = [...cadastrosItems, ...comercialItems, ...estoqueItems, ...financeiroItems]
    .map(filtrarItem)
    .filter(Boolean) as NavItem[];
  const admin = adminItems.map(filtrarItem).filter(Boolean) as NavItem[];

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold leading-none tracking-tight">MedFlow</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">
              ERP Distribuidora
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{mainItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Gestao</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{gestao.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {admin.length > 0 && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel>Administracao</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{admin.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 px-2 py-1.5 text-left text-sm">
          <UserCircle className="h-8 w-8 text-muted-foreground" />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold text-slate-700">{session?.user?.name || "Usuario"}</span>
            <span className="truncate text-xs text-slate-500">{perfil}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
