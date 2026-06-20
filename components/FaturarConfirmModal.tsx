"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, FileText, Loader2, X, Building2, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { TaxCalculationResult } from "@/lib/types/fiscal-tax";

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
    id: number;
    razaoSocial: string;
    nomeFantasia: string | null;
    cnpjCpf: string | null;
    email: string | null;
    endereco: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
    telefone: string | null;
    codigoMunicipio: string | null;
    inscricaoEstadual: string | null;
    contribuinteICMS: boolean;
    consumidorFinal: boolean;
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
    produto: {
      descricao: string;
      codigoInterno: string | null;
      ncm?: string | null;
      cfop?: string | null;
      unidadeFiscal?: string | null;
      unidadeVenda?: string | null;
      aliquotaIcms?: number | null;
      aliquotaIpi?: number | null;
    };
  }[];
};

export type FaturamentoConfirmPayload = {
  naturezaOperacaoId: number;
  naturezaOperacao: string;
  informacoesComplementares: string | null;
  observacao: string | null;
  formaPagamento: string | null;
  prazoPagamento: string | null;
  cliente: {
    razaoSocial: string;
    nomeFantasia: string | null;
    cnpjCpf: string | null;
    email: string | null;
    telefone: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
    codigoMunicipio: string | null;
    inscricaoEstadual: string | null;
    contribuinteICMS: boolean;
    consumidorFinal: boolean;
  };
};

type NaturezaFiscal = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  padrao: boolean;
  ativa: boolean;
  _count?: { regras: number };
};

type ClienteFiscalForm = {
  razaoSocial: string;
  nomeFantasia: string;
  cnpjCpf: string;
  email: string;
  telefone: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  codigoMunicipio: string;
  inscricaoEstadual: string;
  contribuinteICMS: boolean;
  consumidorFinal: boolean;
};

const formaLabel: Record<string, string> = {
  PIX: "PIX", BOLETO: "Boleto", CARTAO_CREDITO: "Crédito",
  CARTAO_DEBITO: "Débito", DINHEIRO: "Dinheiro",
  TRANSFERENCIA: "Transferência", A_PRAZO: "A Prazo", CHEQUE: "Cheque",
};

const formaOptions = Object.entries(formaLabel);

const emptyClienteFiscal: ClienteFiscalForm = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpjCpf: "",
  email: "",
  telefone: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
  codigoMunicipio: "",
  inscricaoEstadual: "",
  contribuinteICMS: false,
  consumidorFinal: false,
};

function toNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildClienteFiscalForm(cliente: PedidoNF["cliente"]): ClienteFiscalForm {
  return {
    razaoSocial: cliente.razaoSocial || "",
    nomeFantasia: cliente.nomeFantasia || "",
    cnpjCpf: cliente.cnpjCpf || "",
    email: cliente.email || "",
    telefone: cliente.telefone || "",
    logradouro: cliente.logradouro || cliente.endereco?.split(",")[0]?.trim() || "",
    numero: cliente.numero || cliente.endereco?.split(",")[1]?.trim() || "",
    complemento: cliente.complemento || "",
    bairro: cliente.bairro || "",
    cidade: cliente.cidade || "",
    estado: cliente.estado || "",
    cep: cliente.cep || "",
    codigoMunicipio: cliente.codigoMunicipio || "",
    inscricaoEstadual: cliente.inscricaoEstadual || "",
    contribuinteICMS: Boolean(cliente.contribuinteICMS),
    consumidorFinal: Boolean(cliente.consumidorFinal),
  };
}

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
  onConfirm: (dados: FaturamentoConfirmPayload) => void;
  loading: boolean;
}) {
  const [pedido, setPedido] = useState<PedidoNF | null>(null);
  const [fetching, setFetching] = useState(false);
  const [naturezas, setNaturezas] = useState<NaturezaFiscal[]>([]);
  const [naturezaOperacaoId, setNaturezaOperacaoId] = useState("");
  const [taxPreview, setTaxPreview] = useState<TaxCalculationResult | null>(null);
  const [taxError, setTaxError] = useState("");
  const [calculandoTributos, setCalculandoTributos] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [prazoPagamento, setPrazoPagamento] = useState("");
  const [observacao, setObservacao] = useState("");
  const [informacoesComplementares, setInformacoesComplementares] = useState("");
  const [clienteFiscal, setClienteFiscal] = useState<ClienteFiscalForm>(emptyClienteFiscal);

  useEffect(() => {
    if (!open || !pedidoId) return;
    setFetching(true);
    fetch(`/api/vendas/${pedidoId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPedido(data);
        setFormaPagamento(data.formaPagamento || "");
        setPrazoPagamento(data.prazoPagamento || "");
        setObservacao(data.observacao || "");
        setInformacoesComplementares(data.observacao || "");
        setClienteFiscal(buildClienteFiscalForm(data.cliente));
      })
      .catch(() => setPedido(null))
      .finally(() => setFetching(false));
  }, [open, pedidoId]);

  useEffect(() => {
    if (!open || !empresaFiscalId) return;
    setNaturezas([]);
    setNaturezaOperacaoId("");
    setTaxPreview(null);
    setTaxError("");
    fetch(`/api/fiscal/naturezas?empresaFiscalId=${empresaFiscalId}`)
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || "Erro ao carregar naturezas fiscais.");
        const ativas = (data as NaturezaFiscal[]).filter((item) => item.ativa);
        setNaturezas(ativas);
        const padrao = ativas.find((item) => item.padrao && (item._count?.regras || 0) > 0);
        if (padrao) {
          setNaturezaOperacaoId(String(padrao.id));
        } else if (ativas.every((item) => (item._count?.regras || 0) === 0)) {
          setTaxError("Nenhuma natureza possui regra tributária ativa para esta empresa.");
        }
      })
      .catch((error) => setTaxError(error.message));
  }, [open, empresaFiscalId]);

  useEffect(() => {
    if (!open || !pedidoId || !empresaFiscalId || !naturezaOperacaoId || !clienteFiscal.estado) {
      setTaxPreview(null);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setCalculandoTributos(true);
      setTaxError("");
      fetch("/api/fiscal/tributacao/simular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          pedidoVendaId: pedidoId,
          empresaFiscalId,
          naturezaOperacaoId: Number(naturezaOperacaoId),
          cliente: {
            estado: clienteFiscal.estado,
            contribuinteICMS: clienteFiscal.contribuinteICMS,
            consumidorFinal: clienteFiscal.consumidorFinal,
          },
        }),
      })
        .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) throw new Error(data.error || "Nao foi possivel calcular os tributos.");
          setTaxPreview(data);
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            setTaxPreview(null);
            setTaxError(error.message);
          }
        })
        .finally(() => setCalculandoTributos(false));
    }, 300);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [open, pedidoId, empresaFiscalId, naturezaOperacaoId, clienteFiscal.estado, clienteFiscal.contribuinteICMS, clienteFiscal.consumidorFinal]);

  const totalItens = pedido?.itens.reduce((s, i) => s + i.subtotal, 0) || 0;
  const baseIcms = taxPreview?.totais.baseIcms || 0;
  const valorIcms = taxPreview?.totais.valorIcms || 0;
  const valorIpi = taxPreview?.totais.valorIpi || 0;
  const naturezaSelecionada = naturezas.find((item) => item.id === Number(naturezaOperacaoId));
  const hoje = new Date().toLocaleDateString("pt-BR");
  const emissor = pedido?.empresaFiscal || { razaoSocial: empresaNome, nomeFantasia: null, cnpj: null, inscricaoEstadual: null, regimeTributario: null };
  const podeEmitir = Boolean(
    naturezaOperacaoId &&
    taxPreview &&
    !taxError &&
    formaPagamento &&
    clienteFiscal.razaoSocial.trim() &&
    clienteFiscal.cnpjCpf.trim() &&
    clienteFiscal.logradouro.trim() &&
    clienteFiscal.numero.trim() &&
    clienteFiscal.bairro.trim() &&
    clienteFiscal.cidade.trim() &&
    clienteFiscal.estado.trim() &&
    clienteFiscal.cep.trim() &&
    clienteFiscal.codigoMunicipio.trim()
  );

  function updateClienteFiscal<K extends keyof ClienteFiscalForm>(field: K, value: ClienteFiscalForm[K]) {
    setClienteFiscal((prev) => ({ ...prev, [field]: value }));
  }

  function handleConfirm() {
    onConfirm({
      naturezaOperacaoId: Number(naturezaOperacaoId),
      naturezaOperacao: naturezaSelecionada?.nome || "",
      informacoesComplementares: toNullable(informacoesComplementares),
      observacao: toNullable(observacao),
      formaPagamento: formaPagamento || null,
      prazoPagamento: toNullable(prazoPagamento),
      cliente: {
        razaoSocial: clienteFiscal.razaoSocial.trim(),
        nomeFantasia: toNullable(clienteFiscal.nomeFantasia),
        cnpjCpf: toNullable(clienteFiscal.cnpjCpf),
        email: toNullable(clienteFiscal.email),
        telefone: toNullable(clienteFiscal.telefone),
        logradouro: toNullable(clienteFiscal.logradouro),
        numero: toNullable(clienteFiscal.numero),
        complemento: toNullable(clienteFiscal.complemento),
        bairro: toNullable(clienteFiscal.bairro),
        cidade: toNullable(clienteFiscal.cidade),
        estado: toNullable(clienteFiscal.estado)?.toUpperCase() || null,
        cep: toNullable(clienteFiscal.cep),
        codigoMunicipio: toNullable(clienteFiscal.codigoMunicipio),
        inscricaoEstadual: toNullable(clienteFiscal.inscricaoEstadual),
        contribuinteICMS: clienteFiscal.contribuinteICMS,
        consumidorFinal: clienteFiscal.consumidorFinal,
      },
    });
  }

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
            {/* Pre-conferencia fiscal: o DANFe oficial so existe apos autorizacao. */}
            <div className="border border-slate-200 rounded-t-lg mx-2 mt-2 mb-0 overflow-hidden">

              {/* <- HEADER -> */}
              <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/10 rounded p-1.5">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.2em] uppercase">Pré-conferência fiscal</p>
                    <p className="text-[10px] text-white/60">Dados que serão usados na emissão</p>
                  </div>
                </div>
                <div className="text-center">
                  <h1 className="text-base font-black tracking-wide">EMISSÃO DE NF-e</h1>
                  <p className="text-[10px] text-white/60 tracking-wide">O DANFe oficial só existe após autorização</p>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* <- NF NUMBER & DATE -> */}
              <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x divide-slate-200 border-b border-slate-200">
                <div className="px-5 py-2.5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Identificação provisória</p>
                  <p className="text-xl font-black font-mono">NF-{pedido.numero}</p>
                </div>
                <div className="px-5 py-2.5 text-right">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Data da tentativa</p>
                  <p className="text-xl font-bold">{hoje}</p>
                </div>
              </div>

              {/* <- DADOS EDITAVEIS DA EMISSAO -> */}
              <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 space-y-3">
                <p className="text-[11px] font-black text-slate-900 uppercase tracking-wider">Dados da emissão</p>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 md:col-span-5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Natureza da operação</label>
                    <Select value={naturezaOperacaoId} onValueChange={setNaturezaOperacaoId}>
                      <SelectTrigger className="h-9 bg-white text-xs">
                        <SelectValue placeholder="Selecione uma natureza configurada" />
                      </SelectTrigger>
                      <SelectContent>
                        {naturezas.map((natureza) => (
                          <SelectItem
                            key={natureza.id}
                            value={String(natureza.id)}
                            disabled={(natureza._count?.regras || 0) === 0}
                          >
                            {natureza.nome} ({natureza.codigo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Pagamento</label>
                    <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                      <SelectTrigger className="h-9 bg-white text-xs">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {formaOptions.map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-12 md:col-span-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Prazo</label>
                    <Input
                      className="h-9 bg-white text-xs"
                      value={prazoPagamento}
                      onChange={(e) => setPrazoPagamento(e.target.value)}
                      placeholder="À vista"
                    />
                  </div>
                  <div className="col-span-12 md:col-span-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Empresa</label>
                    <Input
                      className="h-9 bg-white text-xs"
                      value={empresaNome || (empresaFiscalId ? `#${empresaFiscalId}` : "Não selecionada")}
                      disabled
                    />
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Observação do pedido</label>
                    <Textarea
                      className="min-h-16 bg-white text-xs"
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      placeholder="Observações internas/comerciais do pedido"
                    />
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Informações complementares da NF</label>
                    <Textarea
                      className="min-h-16 bg-white text-xs"
                      value={informacoesComplementares}
                      maxLength={5000}
                      onChange={(e) => setInformacoesComplementares(e.target.value)}
                      placeholder="Texto que vai no campo infCpl do XML, quando necessário"
                    />
                  </div>
                </div>
                {(taxError || calculandoTributos) && (
                  <div className={`flex items-center gap-2 rounded border px-3 py-2 text-xs ${taxError ? "border-red-200 bg-red-50 text-red-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>
                    {taxError ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
                    <span>{taxError || "Calculando tributos conforme a regra fiscal..."}</span>
                  </div>
                )}
              </div>

              {/* <- EMITENTE / DESTINATÁRIO -> */}
              <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x divide-slate-200 border-b border-slate-200">
                <div className="px-5 py-3.5">
                  <p className="text-[11px] font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-500" />
                    Emitente
                  </p>
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
                  <p className="text-[11px] font-black text-slate-900 uppercase tracking-wider mb-2">Destinatário / Cliente</p>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-12 md:col-span-7">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Razão social</label>
                      <Input className="h-8 text-xs" value={clienteFiscal.razaoSocial} onChange={(e) => updateClienteFiscal("razaoSocial", e.target.value)} />
                    </div>
                    <div className="col-span-12 md:col-span-5">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Nome fantasia</label>
                      <Input className="h-8 text-xs" value={clienteFiscal.nomeFantasia} onChange={(e) => updateClienteFiscal("nomeFantasia", e.target.value)} />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">CNPJ/CPF</label>
                      <Input className="h-8 text-xs" value={clienteFiscal.cnpjCpf} onChange={(e) => updateClienteFiscal("cnpjCpf", e.target.value)} />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">IE</label>
                      <Input className="h-8 text-xs" value={clienteFiscal.inscricaoEstadual} onChange={(e) => updateClienteFiscal("inscricaoEstadual", e.target.value)} />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Código IBGE</label>
                      <Input className="h-8 text-xs" value={clienteFiscal.codigoMunicipio} onChange={(e) => updateClienteFiscal("codigoMunicipio", e.target.value)} />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Logradouro</label>
                      <Input className="h-8 text-xs" value={clienteFiscal.logradouro} onChange={(e) => updateClienteFiscal("logradouro", e.target.value)} />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Número</label>
                      <Input className="h-8 text-xs" value={clienteFiscal.numero} onChange={(e) => updateClienteFiscal("numero", e.target.value)} />
                    </div>
                    <div className="col-span-6 md:col-span-4">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Complemento</label>
                      <Input className="h-8 text-xs" value={clienteFiscal.complemento} onChange={(e) => updateClienteFiscal("complemento", e.target.value)} />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Bairro</label>
                      <Input className="h-8 text-xs" value={clienteFiscal.bairro} onChange={(e) => updateClienteFiscal("bairro", e.target.value)} />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Cidade</label>
                      <Input className="h-8 text-xs" value={clienteFiscal.cidade} onChange={(e) => updateClienteFiscal("cidade", e.target.value)} />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">UF</label>
                      <Input className="h-8 text-xs uppercase" maxLength={2} value={clienteFiscal.estado} onChange={(e) => updateClienteFiscal("estado", e.target.value.toUpperCase())} />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">CEP</label>
                      <Input className="h-8 text-xs" value={clienteFiscal.cep} onChange={(e) => updateClienteFiscal("cep", e.target.value)} />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">E-mail</label>
                      <Input className="h-8 text-xs" value={clienteFiscal.email} onChange={(e) => updateClienteFiscal("email", e.target.value)} />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Telefone</label>
                      <Input className="h-8 text-xs" value={clienteFiscal.telefone} onChange={(e) => updateClienteFiscal("telefone", e.target.value)} />
                    </div>
                    <label className="col-span-12 md:col-span-6 flex items-center gap-2 text-[11px] font-medium text-slate-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={clienteFiscal.contribuinteICMS}
                        onChange={(e) => updateClienteFiscal("contribuinteICMS", e.target.checked)}
                      />
                      Contribuinte ICMS
                    </label>
                    <label className="col-span-12 md:col-span-6 flex items-center gap-2 text-[11px] font-medium text-slate-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={clienteFiscal.consumidorFinal}
                        onChange={(e) => updateClienteFiscal("consumidorFinal", e.target.checked)}
                      />
                      Consumidor final
                    </label>
                  </div>
                </div>
              </div>

              {/* <- METADATA STRIP -> */}
              <div className="grid grid-cols-4 divide-x divide-slate-200 border-b border-slate-200 text-center">
                <div className="px-2 py-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Natureza</p>
                  <p className="text-xs font-semibold">{naturezaSelecionada?.nome || "—"}</p>
                </div>
                <div className="px-2 py-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Pagamento</p>
                  <p className="text-xs font-semibold">{formaPagamento ? formaLabel[formaPagamento] || formaPagamento : "—"}</p>
                </div>
                <div className="px-2 py-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Prazo</p>
                  <p className="text-xs font-semibold">{prazoPagamento ? `${prazoPagamento} dias` : "À vista"}</p>
                </div>
                <div className="px-2 py-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Pedido</p>
                  <p className="text-xs font-semibold font-mono">{pedido.numero.slice(-8)}</p>
                </div>
              </div>

              {/* <- ITEMS TABLE -> */}
              <div className="border-b border-slate-200">
                <div className="grid grid-cols-12 bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase text-slate-600">
                  <div className="col-span-1 px-3 py-2 border-r border-slate-200 text-center">Item</div>
                  <div className="col-span-4 px-3 py-2 border-r border-slate-200">Produto</div>
                  <div className="col-span-1 px-3 py-2 border-r border-slate-200 text-center">NCM</div>
                  <div className="col-span-1 px-3 py-2 border-r border-slate-200 text-center">CFOP</div>
                  <div className="col-span-1 px-3 py-2 border-r border-slate-200 text-center">Qtd</div>
                  <div className="col-span-2 px-3 py-2 border-r border-slate-200 text-right">Unitário</div>
                  <div className="col-span-2 px-3 py-2 text-right">Total</div>
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
                    <div className="col-span-1 px-3 py-2.5 border-r border-slate-200 text-center font-mono text-xs text-slate-600">
                      {item.produto.ncm || "-"}
                    </div>
                    <div className="col-span-1 px-3 py-2.5 border-r border-slate-200 text-center font-mono text-xs text-slate-600">
                      {taxPreview?.itens.find((tax) => tax.itemPedidoId === item.id)?.cfop || "-"}
                    </div>
                    <div className="col-span-1 px-3 py-2.5 border-r border-slate-200 text-center font-medium text-slate-600">{item.quantidade}</div>
                    <div className="col-span-2 px-3 py-2.5 border-r border-slate-200 text-right font-mono text-xs text-slate-600">
                      {item.precoUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="col-span-2 px-3 py-2.5 text-right font-semibold text-slate-800 font-mono text-xs">
                      {item.subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}

                {/* TOTALS ROW */}
                <div className="grid grid-cols-12 bg-slate-50">
                  <div className="col-span-7 px-4 py-3 border-r border-slate-200">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Observações</p>
                    <p className="text-[11px] text-slate-500 italic">
                      {observacao || "Nenhuma observação."}
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
                          {(taxPreview?.totais.valorNota ?? pedido.valorTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* <- FOOTER INFO -> */}
              <div className="grid grid-cols-2 md:grid-cols-6 divide-x divide-slate-200 bg-slate-50">
                <div className="px-4 py-2">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">Base Cálc. ICMS</p>
                  <p className="text-xs font-mono font-medium">{baseIcms.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="px-4 py-2">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">Valor ICMS</p>
                  <p className="text-xs font-mono font-medium">{valorIcms.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="px-4 py-2">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">FCP / ST</p>
                  <p className="text-xs font-mono font-medium">{((taxPreview?.totais.valorFcp || 0) + (taxPreview?.totais.valorIcmsSt || 0) + (taxPreview?.totais.valorFcpSt || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="px-4 py-2">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">Valor IPI</p>
                  <p className="text-xs font-mono font-medium">{valorIpi.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="px-4 py-2">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">PIS / COFINS</p>
                  <p className="text-xs font-mono font-medium">{((taxPreview?.totais.valorPis || 0) + (taxPreview?.totais.valorCofins || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="px-4 py-2">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">Valor Total NF</p>
                  <p className="text-xs font-mono font-bold text-emerald-700">{(taxPreview?.totais.valorNota ?? pedido.valorTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

            </div>

            {/* ═══════════════ ACTIONS ═══════════════ */}
            <div className="px-2 pb-3 pt-2 flex items-center justify-between">
              <p className="text-[11px] text-slate-400">
                {podeEmitir
                  ? "Confira os dados acima. O XML e o DANFe serão gerados após autorização da SEFAZ."
                  : "Preencha natureza, pagamento e dados fiscais obrigatórios do cliente para emitir."}
              </p>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2 px-6"
                  onClick={handleConfirm}
                  disabled={loading || !podeEmitir}
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
