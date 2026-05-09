"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, X, Building2, MapPin, Phone, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type PedidoNF = {
  id: number;
  numero: string;
  valorTotal: number;
  desconto: number;
  formaPagamento: string | null;
  prazoPagamento: string | null;
  observacao: string | null;
  status: string;
  cliente: {
    razaoSocial: string;
    nomeFantasia: string | null;
    cnpjCpf: string | null;
    endereco: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
    telefone: string | null;
  };
  empresaFiscal: {
    razaoSocial: string;
    nomeFantasia: string | null;
    cnpj: string | null;
    inscricaoEstadual: string | null;
    regimeTributario: string | null;
  } | null;
  itens: {
    id: number;
    quantidade: number;
    precoUnitario: number;
    subtotal: number;
    produto: { descricao: string; codigoInterno: string | null };
  }[];
};

const formaLabel: Record<string, string> = {
  PIX: "PIX", BOLETO: "Boleto", CARTAO_CREDITO: "Crédito",
  CARTAO_DEBITO: "Débito", DINHEIRO: "Dinheiro",
  TRANSFERENCIA: "Transferência", A_PRAZO: "A Prazo", CHEQUE: "Cheque",
};

export default function FaturarConfirmModal({
  pedidoId,
  empresaFiscalId,
  empresaNome,
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  pedidoId: number | null;
  empresaFiscalId: number | null;
  empresaNome: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const [pedido, setPedido] = useState<PedidoNF | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!open || !pedidoId) return;
    setFetching(true);
    fetch(`/api/vendas/${pedidoId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPedido(data);
      })
      .catch(() => setPedido(null))
      .finally(() => setFetching(false));
  }, [open, pedidoId]);

  const totalItens = pedido?.itens.reduce((s, i) => s + i.subtotal, 0) || 0;
  const hoje = new Date().toLocaleDateString("pt-BR");
  const emissor = pedido?.empresaFiscal || { razaoSocial: empresaNome, nomeFantasia: null, cnpj: null, inscricaoEstadual: null, regimeTributario: null };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[98vw] max-h-[94vh] overflow-auto p-0 gap-0 rounded-lg bg-white [&>button]:hidden">
        <DialogTitle className="sr-only">Confirmar Emissão de Nota Fiscal</DialogTitle>
        <DialogDescription className="sr-only">Revise os dados antes de emitir a nota fiscal</DialogDescription>

        {fetching ? (
          <div className="p-10 space-y-6">
            <Skeleton className="h-10 w-80 mx-auto" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : pedido ? (
          <div className="flex flex-col">
            {/* ═══════════════ NF BODY ═══════════════ */}
            <div className="border-4 border-black rounded-t-lg mx-2 mt-2 mb-0">

              {/* <- HEADER -> */}
              <div className="bg-black text-white px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white rounded p-1.5">
                    <FileText className="h-6 w-6 text-black" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.2em] uppercase">Receita Federal</p>
                    <p className="text-[10px] text-white/60">Ministério da Fazenda</p>
                  </div>
                </div>
                <div className="text-center">
                  <h1 className="text-base font-black tracking-wide">NOTA FISCAL ELETRÔNICA</h1>
                  <p className="text-[10px] text-white/60 tracking-wide">DANFE — Documento Auxiliar da NF-e</p>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* <- NF NUMBER & DATE -> */}
              <div className="grid grid-cols-2 divide-x-2 divide-black border-b-2 border-black">
                <div className="px-5 py-2.5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Número da NF-e</p>
                  <p className="text-xl font-black font-mono">NF-{pedido.numero}</p>
                </div>
                <div className="px-5 py-2.5 text-right">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Data de Emissão</p>
                  <p className="text-xl font-bold">{hoje}</p>
                </div>
              </div>

              {/* <- EMITENTE / DESTINATÁRIO -> */}
              <div className="grid grid-cols-2 divide-x-2 divide-black border-b-2 border-black">
                <div className="px-5 py-3.5">
                  <p className="text-[11px] font-black text-black uppercase tracking-wider mb-2">Emitente</p>
                  <p className="text-sm font-bold">{emissor.nomeFantasia || emissor.razaoSocial || empresaNome}</p>
                  <p className="text-xs text-slate-500">{emissor.razaoSocial !== (emissor.nomeFantasia || empresaNome) ? emissor.razaoSocial : ""}</p>
                  <div className="mt-2 space-y-0.5 text-xs text-slate-600">
                    {emissor.cnpj && (
                      <p className="flex items-center gap-1"><span className="font-semibold text-slate-400 text-[10px]">CNPJ</span> {emissor.cnpj}</p>
                    )}
                    {emissor.inscricaoEstadual && (
                      <p className="flex items-center gap-1"><span className="font-semibold text-slate-400 text-[10px]">IE</span> {emissor.inscricaoEstadual}</p>
                    )}
                    {emissor.regimeTributario && (
                      <p className="flex items-center gap-1"><span className="font-semibold text-slate-400 text-[10px]">Regime</span> {emissor.regimeTributario}</p>
                    )}
                  </div>
                </div>
                <div className="px-5 py-3.5">
                  <p className="text-[11px] font-black text-black uppercase tracking-wider mb-2">Destinatário / Cliente</p>
                  <p className="text-sm font-bold">{pedido.cliente.razaoSocial}</p>
                  {pedido.cliente.nomeFantasia && <p className="text-xs text-slate-500">{pedido.cliente.nomeFantasia}</p>}
                  <div className="mt-2 space-y-0.5 text-xs text-slate-600">
                    {pedido.cliente.cnpjCpf && (
                      <p className="flex items-center gap-1"><span className="font-semibold text-slate-400 text-[10px]">CNPJ/CPF</span> {pedido.cliente.cnpjCpf}</p>
                    )}
                    {(pedido.cliente.endereco || pedido.cliente.cep) && (
                      <p className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {[pedido.cliente.endereco, pedido.cliente.cidade, pedido.cliente.estado, pedido.cliente.cep].filter(Boolean).join(" — ")}
                      </p>
                    )}
                    {pedido.cliente.telefone && (
                      <p className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-slate-400" />{pedido.cliente.telefone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* <- METADATA STRIP -> */}
              <div className="grid grid-cols-4 divide-x-2 divide-black border-b-2 border-black text-center">
                <div className="px-2 py-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Natureza</p>
                  <p className="text-xs font-semibold">Venda de mercadorias</p>
                </div>
                <div className="px-2 py-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Pagamento</p>
                  <p className="text-xs font-semibold">{pedido.formaPagamento ? formaLabel[pedido.formaPagamento] || pedido.formaPagamento : "—"}</p>
                </div>
                <div className="px-2 py-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Prazo</p>
                  <p className="text-xs font-semibold">{pedido.prazoPagamento ? `${pedido.prazoPagamento} dias` : "À vista"}</p>
                </div>
                <div className="px-2 py-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Pedido</p>
                  <p className="text-xs font-semibold font-mono">{pedido.numero.slice(-8)}</p>
                </div>
              </div>

              {/* <- ITEMS TABLE -> */}
              <div className="border-b-2 border-black">
                <div className="grid grid-cols-12 bg-slate-100 border-b border-black text-[10px] font-black uppercase text-slate-600">
                  <div className="col-span-1 px-3 py-2 border-r border-black text-center">Item</div>
                  <div className="col-span-4 px-3 py-2 border-r border-black">Produto</div>
                  <div className="col-span-2 px-3 py-2 border-r border-black text-center">Qtd</div>
                  <div className="col-span-2 px-3 py-2 border-r border-black text-right">Unitário</div>
                  <div className="col-span-3 px-3 py-2 text-right">Total</div>
                </div>
                {pedido.itens.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-12 border-b border-slate-200 text-sm">
                    <div className="col-span-1 px-3 py-2.5 border-r border-slate-200 text-center text-slate-500 font-mono">{idx + 1}</div>
                    <div className="col-span-4 px-3 py-2.5 border-r border-slate-200">
                      <p className="font-medium text-slate-800">{item.produto.descricao}</p>
                      {item.produto.codigoInterno && (
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">REF: {item.produto.codigoInterno}</p>
                      )}
                    </div>
                    <div className="col-span-2 px-3 py-2.5 border-r border-slate-200 text-center font-medium text-slate-600">{item.quantidade}</div>
                    <div className="col-span-2 px-3 py-2.5 border-r border-slate-200 text-right font-mono text-xs text-slate-600">
                      {item.precoUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="col-span-3 px-3 py-2.5 text-right font-semibold text-slate-800 font-mono text-xs">
                      {item.subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}

                {/* TOTALS ROW */}
                <div className="grid grid-cols-12 bg-slate-50">
                  <div className="col-span-7 px-4 py-3 border-r border-slate-200">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Observações</p>
                    <p className="text-[11px] text-slate-500 italic">
                      {pedido.observacao || "Nenhuma observação."}
                    </p>
                  </div>
                  <div className="col-span-5">
                    <div className="divide-y border-slate-200">
                      <div className="flex justify-between px-4 py-2 text-xs">
                        <span className="text-slate-500">Subtotal itens ({pedido.itens.length})</span>
                        <span className="font-mono font-semibold">{totalItens.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                      {pedido.desconto > 0 && (
                        <div className="flex justify-between px-4 py-2 text-xs text-red-500">
                          <span>Desconto</span>
                          <span className="font-mono font-semibold">-{pedido.desconto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="flex justify-between px-4 py-2.5 bg-slate-100">
                        <span className="text-sm font-black uppercase text-slate-700">Valor Total</span>
                        <span className="font-black font-mono text-emerald-700 text-base">
                          {pedido.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* <- FOOTER INFO -> */}
              <div className="grid grid-cols-4 divide-x-2 divide-black bg-slate-50">
                <div className="px-4 py-2">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">Base Cálc. ICMS</p>
                  <p className="text-xs font-mono font-medium">{totalItens.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="px-4 py-2">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">Valor ICMS</p>
                  <p className="text-xs font-mono font-medium">{(totalItens * 0.18).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="px-4 py-2">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">Valor IPI</p>
                  <p className="text-xs font-mono font-medium">{(totalItens * 0.04).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="px-4 py-2">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">Valor Total NF</p>
                  <p className="text-xs font-mono font-bold text-emerald-700">{pedido.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

            </div>

            {/* ═══════════════ ACTIONS ═══════════════ */}
            <div className="px-2 pb-3 pt-2 flex items-center justify-between">
              <p className="text-[11px] text-slate-400">
                Confira todos os dados acima. A NF será emitida em nome da empresa selecionada.
              </p>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2 px-6"
                  onClick={onConfirm}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Emitindo NF...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" /> Confirmar & Emitir Nota Fiscal
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
            <Hash className="h-10 w-10 opacity-20" />
            <p className="font-medium">Erro ao carregar dados do pedido.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
