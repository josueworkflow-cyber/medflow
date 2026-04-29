"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Shield, Building, Bell, User } from "lucide-react";

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Configurações do Sistema</h1>
        <p className="text-muted-foreground">Gerencie as preferências da plataforma e parâmetros globais.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
            <Building className="h-5 w-5 text-slate-500" />
            <CardTitle className="text-lg">Dados da Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">CNPJ, endereço, logotipo e informações fiscais da distribuidora.</CardDescription>
            <button className="text-sm font-semibold text-primary hover:underline">Editar informações</button>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
            <Shield className="h-5 w-5 text-slate-500" />
            <CardTitle className="text-lg">Segurança</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">Políticas de senha, autenticação em duas etapas e logs de acesso.</CardDescription>
            <button className="text-sm font-semibold text-primary hover:underline">Configurar segurança</button>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
            <Bell className="h-5 w-5 text-slate-500" />
            <CardTitle className="text-lg">Notificações</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">Alertas de estoque baixo, vencimentos e novos pedidos por e-mail.</CardDescription>
            <button className="text-sm font-semibold text-primary hover:underline">Gerenciar alertas</button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-slate-50/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-slate-500" /> Parâmetros do Sistema
          </CardTitle>
          <CardDescription>Estes ajustes afetam o cálculo de impostos e regras de negócio globais.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
            <div>
              <p className="text-sm font-medium">Backup Automático</p>
              <p className="text-xs text-slate-500">Realizar backup da base de dados diariamente às 03:00</p>
            </div>
            <div className="h-6 w-11 bg-slate-200 rounded-full relative cursor-pointer opacity-50">
              <div className="absolute left-1 top-1 h-4 w-4 bg-white rounded-full"></div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
            <div>
              <p className="text-sm font-medium">Modo Homologação NF-e</p>
              <p className="text-xs text-slate-500">Emitir notas sem valor fiscal para fins de teste</p>
            </div>
            <div className="h-6 w-11 bg-emerald-500 rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 h-4 w-4 bg-white rounded-full shadow-sm"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
