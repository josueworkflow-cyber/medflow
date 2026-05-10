"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Shield, Building, Bell, Clock } from "lucide-react";

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
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600">
              <Clock className="h-3.5 w-3.5" /> Em breve
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
            <Shield className="h-5 w-5 text-slate-500" />
            <CardTitle className="text-lg">Segurança</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">Políticas de senha, autenticação em duas etapas e logs de acesso.</CardDescription>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600">
              <Clock className="h-3.5 w-3.5" /> Em breve
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
            <Bell className="h-5 w-5 text-slate-500" />
            <CardTitle className="text-lg">Notificações</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">Alertas de estoque baixo, vencimentos e novos pedidos por e-mail.</CardDescription>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600">
              <Clock className="h-3.5 w-3.5" /> Em breve
            </span>
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
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 opacity-60">
            <div>
              <p className="text-sm font-medium">Backup Automático</p>
              <p className="text-xs text-slate-500">Realizar backup da base de dados diariamente às 03:00</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
              <Clock className="h-3 w-3" /> Em breve
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 opacity-60">
            <div>
              <p className="text-sm font-medium">Modo Homologação NF-e</p>
              <p className="text-xs text-slate-500">Emitir notas sem valor fiscal para fins de teste</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
              <Clock className="h-3 w-3" /> Em breve
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
