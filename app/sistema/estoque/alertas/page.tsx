"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  AlertTriangle,
  Clock,
  ArrowRight,
  ShoppingCart,
  ShieldAlert,
  Info,
  MapPin,
  Tag,
  Ban
} from "lucide-react";
import Link from "next/link";

type Alerta = {
  loteId: number;
  numeroLote: string;
  validade: string;
  produto: string;
  codigo: string | null;
  quantidade: number;
  localizacao?: string;
};

type EstoqueMin = {
  id: number;
  descricao: string;
  codigoInterno: string | null;
  estoqueMinimo: number;
  estoqueAtual: number;
  diferenca: number;
  categoria?: string;
};

type AlertaData = {
  vencendo: Alerta[];
  vencidos: Alerta[];
  abaixoMinimo: EstoqueMin[];
  valorEmRisco: number;
  totais: { vencendo: number; vencidos: number; abaixoMinimo: number };
};

export default function AlertasEstoquePage() {
  const [data, setData] = useState<AlertaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dias, setDias] = useState<30 | 60 | 90>(30);
  
  // Estados do modal de bloqueio
  const [modalOpen, setModalOpen] = useState(false);
  const [loteParaBloquear, setLoteParaBloquear] = useState<Alerta | null>(null);
  const [motivo, setMotivo] = useState("");
  const [bloqueando, setBloqueando] = useState(false);

  const carregarAlertas = (diasFiltro: number) => {
    setLoading(true);
    fetch(`/api/estoque/alertas?dias=${diasFiltro}`)
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao buscar alertas.");
        return r.json();
      })
      .then(setData)
      .catch((err) => {
        console.error(err);
        toast.error("Erro ao carregar dados dos alertas.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregarAlertas(dias);
  }, [dias]);

  const handleAbrirBloqueio = (lote: Alerta) => {
    setLoteParaBloquear(lote);
    setMotivo("");
    setModalOpen(true);
  };

  const handleConfirmarBloqueio = async () => {
    if (!loteParaBloquear) return;
    if (!motivo.trim() || motivo.trim().length < 5) {
      toast.error("Por favor, digite um motivo justificável (mínimo de 5 caracteres).");
      return;
    }

    setBloqueando(true);
    try {
      const res = await fetch("/api/estoque/lote/bloquear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loteId: loteParaBloquear.loteId,
          status: "QUARENTENA",
          motivo: motivo.trim()
        })
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Erro ao mover lote para Quarentena.");

      toast.success(`Lote ${loteParaBloquear.numeroLote} colocado em Quarentena com sucesso!`);
      setModalOpen(false);
      setLoteParaBloquear(null);
      carregarAlertas(dias);
    } catch (err: any) {
      toast.error(err.message || "Erro ao bloquear lote.");
    } finally {
      setBloqueando(false);
    }
  };

  const getDiasRestantes = (validadeStr: string) => {
    const validadeDate = new Date(validadeStr);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    validadeDate.setHours(0, 0, 0, 0);
    const diffTime = validadeDate.getTime() - hoje.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const renderBadgeUrgencia = (diasRestantes: number) => {
    if (diasRestantes <= 7) {
      return <Badge className="bg-red-100 text-red-700 border-red-200">Crítico (≤ 7 dias)</Badge>;
    } else if (diasRestantes <= 30) {
      return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Urgente (8–30 dias)</Badge>;
    } else if (diasRestantes <= 60) {
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Atenção (31–60 dias)</Badge>;
    } else {
      return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Sob controle ({diasRestantes} dias)</Badge>;
    }
  };

  if (loading && !data) {
    return (
      <main className="p-6 space-y-4">
        <h1 className="text-3xl font-semibold">Alertas de Estoque</h1>
        <p className="text-slate-500">Carregando dados e verificando validades...</p>
      </main>
    );
  }

  const d = data || {
    vencendo: [],
    vencidos: [],
    abaixoMinimo: [],
    valorEmRisco: 0,
    totais: { vencendo: 0, vencidos: 0, abaixoMinimo: 0 }
  };

  return (
    <main className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Gestão Sanitária & Controle de Nível</p>
          <h1 className="text-3xl font-bold text-slate-950">Alertas de Estoque</h1>
        </div>

        {/* Filtro por dias */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 px-2">Janela de Validade:</span>
          {([30, 60, 90] as const).map((v) => (
            <button
              key={v}
              onClick={() => setDias(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dias === v
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              {v} dias
            </button>
          ))}
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className={d.totais.vencendo > 0 ? "border-amber-200 bg-amber-50/10 shadow-sm" : "shadow-sm"}>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Próximos de Vencer</p>
              <h3 className={`text-3xl font-bold mt-1.5 ${d.totais.vencendo > 0 ? "text-amber-600" : "text-slate-800"}`}>
                {d.totais.vencendo}
              </h3>
            </div>
            <Clock className={`h-8 w-8 ${d.totais.vencendo > 0 ? "text-amber-500" : "text-slate-300"}`} />
          </CardContent>
        </Card>

        <Card className={d.totais.vencidos > 0 ? "border-red-200 bg-red-50/10 shadow-sm" : "shadow-sm"}>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lotes Vencidos</p>
              <h3 className={`text-3xl font-bold mt-1.5 ${d.totais.vencidos > 0 ? "text-red-600" : "text-slate-800"}`}>
                {d.totais.vencidos}
              </h3>
            </div>
            <Ban className={`h-8 w-8 ${d.totais.vencidos > 0 ? "text-red-500" : "text-slate-300"}`} />
          </CardContent>
        </Card>

        <Card className={d.totais.abaixoMinimo > 0 ? "border-orange-200 bg-orange-50/10 shadow-sm" : "shadow-sm"}>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Abaixo do Mínimo</p>
              <h3 className={`text-3xl font-bold mt-1.5 ${d.totais.abaixoMinimo > 0 ? "text-orange-600" : "text-slate-800"}`}>
                {d.totais.abaixoMinimo}
              </h3>
            </div>
            <AlertTriangle className={`h-8 w-8 ${d.totais.abaixoMinimo > 0 ? "text-orange-500" : "text-slate-300"}`} />
          </CardContent>
        </Card>

        <Card className={d.valorEmRisco > 0 ? "border-red-200 shadow-sm" : "shadow-sm"}>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor em Risco</p>
              <h3 className={`text-2xl font-bold mt-1.5 ${d.valorEmRisco > 0 ? "text-red-600" : "text-slate-800"}`}>
                R$ {d.valorEmRisco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <ShieldAlert className={`h-8 w-8 ${d.valorEmRisco > 0 ? "text-red-400" : "text-slate-300"}`} />
          </CardContent>
        </Card>
      </div>

      {/* PAINEL 1 — Lotes Vencidos */}
      {d.vencidos.length > 0 && (
        <Card className="border-red-200 shadow-sm">
          <CardHeader className="bg-red-50/40 border-b p-4">
            <CardTitle className="text-base font-bold text-red-800 flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-600" />
              Lotes Vencidos — Bloqueio e Descarte Obrigatório
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs font-bold text-slate-500 bg-slate-50 border-b">
                  <tr>
                    <th className="py-2.5 px-4">Produto</th>
                    <th className="px-4">Lote</th>
                    <th className="px-4">Validade</th>
                    <th className="px-4">Qtd Disponível</th>
                    <th className="px-4">Localização</th>
                    <th className="px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {d.vencidos.map((a) => (
                    <tr key={a.loteId} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{a.produto}</td>
                      <td className="px-4 font-mono text-xs text-slate-600">{a.numeroLote}</td>
                      <td className="px-4 text-red-600 font-semibold">{new Date(a.validade).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 font-bold text-slate-700">{a.quantidade}</td>
                      <td className="px-4 text-xs text-slate-500 flex items-center gap-1 mt-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {a.localizacao || "Não informada"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link href={`/sistema/estoque/lotes/${a.loteId}`}>
                          <Button size="sm" variant="outline" className="text-xs h-7 px-3 border-slate-200 hover:bg-slate-100">
                            Ver distribuição
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PAINEL 1 — Lotes Vencendo em breve */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b p-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Lotes Vencendo em Breve ({dias} dias)
          </CardTitle>
          <Badge className="bg-slate-100 text-slate-700">{d.vencendo.length} lotes encontrados</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {d.vencendo.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Nenhum lote com validade expirando no período selecionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs font-bold text-slate-500 bg-slate-50 border-b">
                  <tr>
                    <th className="py-2.5 px-4">Produto</th>
                    <th className="px-4">Lote</th>
                    <th className="px-4">Validade</th>
                    <th className="px-4">Status / Dias</th>
                    <th className="px-4">Qtd Disponível</th>
                    <th className="px-4">Localização</th>
                    <th className="px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {d.vencendo.map((a) => {
                    const diasRestantes = getDiasRestantes(a.validade);
                    return (
                      <tr key={a.loteId} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{a.produto}</td>
                        <td className="px-4 font-mono text-xs text-slate-600">{a.numeroLote}</td>
                        <td className="px-4 text-slate-700">{new Date(a.validade).toLocaleDateString("pt-BR")}</td>
                        <td className="px-4">{renderBadgeUrgencia(diasRestantes)}</td>
                        <td className="px-4 font-bold text-slate-700">{a.quantidade}</td>
                        <td className="px-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            {a.localizacao || "Não informada"}
                          </span>
                        </td>
                         <td className="px-4 py-2 text-right flex justify-end gap-2">
                           <Link href={`/sistema/estoque/lotes/${a.loteId}`}>
                             <Button size="sm" variant="outline" className="text-xs h-7 px-3 border-slate-200 hover:bg-slate-100">
                               Ver distribuição
                             </Button>
                           </Link>
                           <Button
                             size="sm"
                             variant="outline"
                             className="text-xs border-amber-300 text-amber-700 hover:bg-amber-50 h-7 px-3"
                             onClick={() => handleAbrirBloqueio(a)}
                           >
                             Bloquear lote
                           </Button>
                         </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PAINEL 2 — Estoque abaixo do mínimo */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b p-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Produtos com Estoque Abaixo do Mínimo
          </CardTitle>
          <Badge className="bg-orange-100 text-orange-700">{d.abaixoMinimo.length} pendentes</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {d.abaixoMinimo.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Todos os produtos possuem níveis de estoque adequados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs font-bold text-slate-500 bg-slate-50 border-b">
                  <tr>
                    <th className="py-2.5 px-4">Produto</th>
                    <th className="px-4">Mínimo</th>
                    <th className="px-4">Atual</th>
                    <th className="px-4">Diferença</th>
                    <th className="px-4">Categoria</th>
                    <th className="px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {d.abaixoMinimo.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{a.descricao}</td>
                      <td className="px-4 text-slate-600">{a.estoqueMinimo}</td>
                      <td className="px-4 font-bold text-slate-700">{a.estoqueAtual}</td>
                      <td className="px-4">
                        <Badge className="bg-red-50 text-red-600 border-red-100 font-bold">
                          {a.diferenca} unidades
                        </Badge>
                      </td>
                      <td className="px-4 text-xs text-slate-500">
                        {a.categoria ? (
                          <span className="flex items-center gap-1">
                            <Tag className="h-3.5 w-3.5 text-slate-400" />
                            {a.categoria}
                          </span>
                        ) : (
                          "Geral"
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link href={`/sistema/compras?produtoId=${a.id}&quantidade=${Math.abs(a.diferenca)}`}>
                          <Button
                            size="sm"
                            className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-7 px-3 flex items-center gap-1.5"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                            Criar pedido de compra
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL DE CONFIRMAÇÃO DE BLOQUEIO / QUARENTENA */}
      <Dialog open={modalOpen} onOpenChange={(val) => !bloqueando && setModalOpen(val)}>
        <DialogContent className="sm:max-w-[460px] p-6 bg-white rounded-lg">
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Mover Lote para Quarentena
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Você está colocando o lote em isolamento sanitário preventivo.
          </DialogDescription>

          <div className="space-y-4 py-3">
            {/* Informações Operacionais da Quarentena */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex items-start gap-2.5">
              <Info className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-800">Isolamento Sanitário (Quarentena)</p>
                <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                  O lote será movido para Quarentena. Produtos em quarentena não podem ser vendidos ou separados até liberação manual.
                </p>
              </div>
            </div>

            {/* Dados do lote */}
            {loteParaBloquear && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
                <p className="font-semibold text-slate-700">Produto: <span className="font-normal text-slate-600">{loteParaBloquear.produto}</span></p>
                <p className="font-semibold text-slate-700">Lote: <span className="font-mono font-normal text-slate-600">{loteParaBloquear.numeroLote}</span></p>
                <p className="font-semibold text-slate-700">Qtd Disponível: <span className="font-normal text-slate-600">{loteParaBloquear.quantidade} unidades</span></p>
              </div>
            )}

            {/* Input de motivo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Motivo da Quarentena <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Descreva o motivo sanitário ou operacional do bloqueio..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                disabled={bloqueando}
                className="text-xs bg-white border-slate-200 focus:border-amber-500 focus:ring-amber-500 focus:ring-1 resize-none"
              />
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                <span>Mínimo 5 caracteres</span>
                <span>{motivo.length} caracteres</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalOpen(false)}
              disabled={bloqueando}
              className="text-xs text-slate-500 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmarBloqueio}
              disabled={bloqueando || motivo.trim().length < 5}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-4 font-semibold"
            >
              Confirmar Quarentena
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
