"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Package, PackageCheck, Wrench, Send, CheckCircle2, AlertTriangle,
  Clock, User, ShoppingCart, RefreshCw, Layers, Truck,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const filtros = [
  { value: "verificacao", label: "Verificacao de estoque" },
  { value: "separacao", label: "Separacao" },
  { value: "despacho", label: "Aguardando despacho" },
  { value: "finalizados", label: "Finalizados" },
  { value: "todos", label: "Todos" },
];

const statusLabel: Record<string, string> = {
  PEDIDO_CRIADO: "Pedido criado",
  AGUARDANDO_ESTOQUE: "Ag. estoque",
  ESTOQUE_CONFIRMADO: "Estoque confirmado",
  ESTOQUE_PARCIAL: "Estoque parcial",
  ESTOQUE_INDISPONIVEL: "Indisponivel",
  AGUARDANDO_FORNECEDOR: "Ag. fornecedor",
  AUTORIZADO_PARA_SEPARACAO: "Autorizado",
  EM_SEPARACAO: "Em separacao",
  SEPARADO: "Separado",
  DESPACHADO: "Despachado",
  FINALIZADO: "Finalizado",
  FATURADO: "Faturado",
  PEDIDO_INTERNO_AUTORIZADO: "Interno autorizado",
};

const statusBadgeColor: Record<string, string> = {
  PEDIDO_CRIADO: "bg-blue-100 text-blue-700",
  AGUARDANDO_ESTOQUE: "bg-blue-100 text-blue-700",
  ESTOQUE_CONFIRMADO: "bg-emerald-100 text-emerald-700",
  ESTOQUE_PARCIAL: "bg-amber-100 text-amber-700",
  ESTOQUE_INDISPONIVEL: "bg-red-100 text-red-700",
  AGUARDANDO_FORNECEDOR: "bg-orange-100 text-orange-700",
  AUTORIZADO_PARA_SEPARACAO: "bg-indigo-100 text-indigo-700",
  EM_SEPARACAO: "bg-purple-100 text-purple-700",
  SEPARADO: "bg-teal-100 text-teal-700",
  DESPACHADO: "bg-slate-100 text-slate-600",
  FINALIZADO: "bg-slate-100 text-slate-500",
};

export default function EstoquePedidosPage() {
  const [filtro, setFiltro] = useState("verificacao");
  const { data, isLoading, mutate } = useSWR(
    `/api/estoque/pedidos?filtro=${filtro}`,
    fetcher,
    { refreshInterval: 30000 }
  );
  const [observacao, setObservacao] = useState<Record<number, string>>({});

  const pedidos = data?.pedidos || [];

  async function transicionar(pedidoId: number, acao: string, dados?: any) {
    try {
      const res = await fetch(`/api/vendas/${pedidoId}/transicao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, dados }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success("Pedido atualizado.");
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const verificacao = pedidos.filter((p: any) =>
    ["PEDIDO_CRIADO", "AGUARDANDO_ESTOQUE", "ESTOQUE_PARCIAL", "ESTOQUE_INDISPONIVEL", "AGUARDANDO_FORNECEDOR"].includes(p.status)
  );
  const separacao = pedidos.filter((p: any) =>
    ["AUTORIZADO_PARA_SEPARACAO", "EM_SEPARACAO", "FATURADO", "PEDIDO_INTERNO_AUTORIZADO"].includes(p.status)
  );
  const despacho = pedidos.filter((p: any) => p.status === "SEPARADO");
  const finalizados = pedidos.filter((p: any) => ["DESPACHADO", "FINALIZADO"].includes(p.status));

  const showVerificacao = ["verificacao", "todos"].includes(filtro);
  const showSeparacao = ["separacao", "todos"].includes(filtro);
  const showDespacho = ["despacho", "todos"].includes(filtro);
  const showFinalizados = ["finalizados", "todos"].includes(filtro);

  return (
    <main className="flex-1 p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pedidos Estoque</h1>
        <p className="text-xs text-slate-500">Verificacao de disponibilidade, separacao e despacho</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filtros.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filtro === f.value
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {f.label}
          </button>
        ))}
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => mutate()} className="h-8 text-xs">
          <RefreshCw className="h-3 w-3 mr-1" /> Atualizar
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>
      ) : (
        <div className="space-y-6">
          {/* Verificacao de Estoque */}
          {showVerificacao && verificacao.length > 0 && (
            <Card>
              <CardHeader className="bg-blue-50/50 border-b pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Verificacao de Estoque
                  <Badge className="ml-2 bg-blue-100 text-blue-700">{verificacao.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {verificacao.map((p: any) => (
                  <div key={p.id} className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-slate-500">#{p.numero.slice(-8)}</span>
                          <Badge variant="outline" className={cn("text-[9px]",
                            p.tipoPedido === "PEDIDO_NORMAL" ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"
                          )}>
                            {p.tipoPedido === "PEDIDO_NORMAL" ? "Normal (NF)" : "Interno"}
                          </Badge>
                          <Badge className={cn("text-[9px]", statusBadgeColor[p.status] || "bg-slate-100")}>
                            {statusLabel[p.status] || p.status}
                          </Badge>
                        </div>
                        <p className="font-semibold text-slate-800">{p.cliente.razaoSocial}</p>
                        <p className="text-xs text-slate-400">
                          Vendedor: {p.vendedor?.nome || "Direto"} &middot; {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-800">R$ {p.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Itens</p>
                      {p.itens.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between py-1 text-sm border-b border-slate-100 last:border-0">
                          <span className="text-slate-700">{item.produto.descricao}</span>
                          <span className="text-slate-500 font-semibold">{item.quantidade} un</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 pt-2 flex-wrap">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs"
                        onClick={() => transicionar(p.id, "verificar_estoque")}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Verificar
                      </Button>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                        onClick={() => transicionar(p.id, "confirmar_estoque")}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmar & Enviar
                      </Button>
                      {p.status !== "PEDIDO_CRIADO" && (
                        <>
                          <div className="flex-1 min-w-[150px]">
                            <Textarea
                              placeholder="Motivo para fornecedor..."
                              className="h-8 text-xs resize-none"
                              value={observacao[p.id] || ""}
                              onChange={(e) => setObservacao({ ...observacao, [p.id]: e.target.value })}
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                            onClick={() => transicionar(p.id, "aguardar_fornecedor", { observacao: observacao[p.id] })}
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" /> Fornecedor
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Separacao */}
          {showSeparacao && separacao.length > 0 && (
            <Card>
              <CardHeader className="bg-indigo-50/50 border-b pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-indigo-600" />
                  Separacao Autorizada
                  <Badge className="ml-2 bg-indigo-100 text-indigo-700">{separacao.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {separacao.map((p: any) => (
                  <div key={p.id} className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-slate-500">#{p.numero.slice(-8)}</span>
                          <Badge variant="outline" className={cn("text-[9px]",
                            p.tipoPedido === "PEDIDO_NORMAL" ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"
                          )}>
                            {p.tipoPedido === "PEDIDO_NORMAL" ? "Normal (NF)" : "Interno"}
                          </Badge>
                          {p.empresaFiscal && (
                            <Badge variant="outline" className="text-[9px] bg-slate-50">
                              {p.empresaFiscal.nomeFantasia || p.empresaFiscal.razaoSocial}
                            </Badge>
                          )}
                          <Badge className={cn("text-[9px]", statusBadgeColor[p.status] || "bg-slate-100")}>
                            {statusLabel[p.status] || p.status}
                          </Badge>
                        </div>
                        <p className="font-semibold text-slate-800">{p.cliente.razaoSocial}</p>
                        <p className="text-xs text-slate-400">
                          {p.separacao?.status === "EM_ANDAMENTO" ? "Separacao em andamento" : "Aguardando inicio"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-800">R$ {p.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Itens</p>
                      {p.itens.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between py-1 text-sm border-b border-slate-100 last:border-0">
                          <span className="text-slate-700">{item.produto.descricao}</span>
                          <span className="text-slate-500 font-semibold">{item.quantidade} un</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      {p.status !== "EM_SEPARACAO" ? (
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs"
                          onClick={() => transicionar(p.id, "iniciar_separacao")}>
                          <Layers className="h-3 w-3 mr-1" /> Iniciar Separacao
                        </Button>
                      ) : (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                          onClick={() => transicionar(p.id, "finalizar_separacao")}>
                          <PackageCheck className="h-3 w-3 mr-1" /> Finalizar Separacao
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Despacho */}
          {showDespacho && despacho.length > 0 && (
            <Card>
              <CardHeader className="bg-emerald-50/50 border-b pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-5 w-5 text-emerald-600" />
                  Separados para Despacho
                  <Badge className="ml-2 bg-emerald-100 text-emerald-700">{despacho.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {despacho.map((p: any) => (
                  <div key={p.id} className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-slate-500">#{p.numero.slice(-8)}</span>
                          <Badge variant="outline" className={cn("text-[9px]",
                            p.tipoPedido === "PEDIDO_NORMAL" ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"
                          )}>
                            {p.tipoPedido === "PEDIDO_NORMAL" ? "Normal (NF)" : "Interno"}
                          </Badge>
                          {p.empresaFiscal && (
                            <Badge variant="outline" className="text-[9px] bg-slate-50">
                              {p.empresaFiscal.nomeFantasia || p.empresaFiscal.razaoSocial}
                            </Badge>
                          )}
                          <Badge className={cn("text-[9px]", "bg-teal-100 text-teal-700")}>Separado</Badge>
                        </div>
                        <p className="font-semibold text-slate-800">{p.cliente.razaoSocial}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-800">R$ {p.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Itens</p>
                      {p.itens.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between py-1 text-sm border-b border-slate-100 last:border-0">
                          <span className="text-slate-700">{item.produto.descricao}</span>
                          <span className="text-slate-500 font-semibold">{item.quantidade} un</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                        onClick={() => transicionar(p.id, "despachar")}>
                        <Truck className="h-3 w-3 mr-1" /> Marcar Despachado
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Finalizados */}
          {showFinalizados && finalizados.length > 0 && (
            <Card>
              <CardHeader className="bg-slate-50/50 border-b pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-slate-600" />
                  Pedidos Finalizados
                  <Badge className="ml-2 bg-slate-100 text-slate-700">{finalizados.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left border-b text-xs text-slate-500 bg-slate-50">
                      <tr>
                        <th className="py-2 px-3">Pedido</th>
                        <th className="px-3">Cliente</th>
                        <th className="px-3">Tipo</th>
                        <th className="px-3">Valor</th>
                        <th className="px-3">Status</th>
                        <th className="px-3">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {finalizados.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-mono text-xs font-bold text-slate-500">#{p.numero.slice(-8)}</td>
                          <td className="px-3 text-slate-700">{p.cliente.razaoSocial}</td>
                          <td className="px-3">
                            <Badge variant="outline" className={cn("text-[9px]",
                              p.tipoPedido === "PEDIDO_NORMAL" ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"
                            )}>
                              {p.tipoPedido === "PEDIDO_NORMAL" ? "NF" : "Interno"}
                            </Badge>
                          </td>
                          <td className="px-3 font-semibold">R$ {p.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                          <td className="px-3">
                            <Badge className={cn("text-[9px]", statusBadgeColor[p.status] || "bg-slate-100")}>
                              {statusLabel[p.status] || p.status}
                            </Badge>
                          </td>
                          <td className="px-3 text-slate-400 text-xs">{new Date(p.updatedAt).toLocaleDateString("pt-BR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {!isLoading && pedidos.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">Nenhum pedido encontrado neste filtro.</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
