"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, RefreshCw, Layers, ArrowRight, Pencil, History } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HistoricoAlteracoes } from "@/components/auditoria/historico-alteracoes";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function LotesPage() {
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR(`/api/estoque/lotes?search=${encodeURIComponent(search)}`, fetcher);

  // Edit & History states
  const [editingLote, setEditingLote] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    numeroLote: "",
    validade: "",
    precoCusto: "",
    enderecoEstoque: "",
    fornecedorId: "",
  });
  const [editMotivo, setEditMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyLoteId, setHistoryLoteId] = useState<number | null>(null);
  const [historyLoteNumero, setHistoryLoteNumero] = useState("");

  const { data: fornecedores } = useSWR<any[]>("/api/fornecedores", fetcher);

  const formatToDateInput = (dateStr: string | null) => {
    if (!dateStr) return "";
    return dateStr.substring(0, 10); // "YYYY-MM-DD"
  };

  const openEdit = (l: any) => {
    setEditingLote(l);
    setEditForm({
      numeroLote: l.numeroLote || "",
      validade: formatToDateInput(l.validade),
      precoCusto: l.precoCusto !== null ? String(l.precoCusto) : "",
      enderecoEstoque: l.enderecoEstoque || "",
      fornecedorId: l.fornecedorId !== null ? String(l.fornecedorId) : "",
    });
    setEditMotivo("");
    setIsEditDialogOpen(true);
  };

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLote) return;
    if (!editForm.numeroLote.trim()) return toast.error("Número do lote é obrigatório");

    try {
      setSaving(true);
      const payload = {
        numeroLote: editForm.numeroLote.trim(),
        validade: editForm.validade !== "" ? editForm.validade : null,
        precoCusto: editForm.precoCusto !== "" ? Number(editForm.precoCusto) : null,
        enderecoEstoque: editForm.enderecoEstoque ? editForm.enderecoEstoque.trim() : null,
        fornecedorId: editForm.fornecedorId && editForm.fornecedorId !== "none" ? Number(editForm.fornecedorId) : null,
        motivo: editMotivo,
      };

      const res = await fetch(`/api/estoque/lote/${editingLote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resultado = await res.json();
      if (!res.ok) throw new Error(resultado.error);

      toast.success("Lote atualizado com sucesso!");
      setIsEditDialogOpen(false);
      setEditingLote(null);
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar lote.");
    } finally {
      setSaving(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;

    // Se houver correspondência exata de lote, redireciona diretamente
    const exactMatch = data?.find(
      (l: any) => l.numeroLote.toLowerCase() === search.trim().toLowerCase()
    );
    if (exactMatch) {
      router.push(`/sistema/estoque/lotes/${exactMatch.id}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DISPONIVEL":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "QUARENTENA":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "BLOQUEADO":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "VENCIDO":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Listagem de Lotes</h1>
          <p className="text-sm text-slate-500">Busca e rastreabilidade individual de lotes no estoque</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => mutate()} className="h-9 text-xs">
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      {/* Busca */}
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por lote ou nome do produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>
        <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white h-10 text-sm px-4">
          Buscar Lote
        </Button>
      </form>

      {/* Tabela de Lotes */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Layers className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum lote encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Lote</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Produto</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Validade</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase">Disponível</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase">Reservado</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase w-[240px]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.map((l: any) => {
                    const totalDisp = l.estoqueAtual?.reduce((sum: number, e: any) => sum + e.quantidadeDisponivel, 0) || 0;
                    const totalRes = l.estoqueAtual?.reduce((sum: number, e: any) => sum + e.quantidadeReservada, 0) || 0;

                    return (
                      <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-900">{l.numeroLote}</td>
                        <td className="px-4 py-3.5 font-medium text-slate-800">{l.produto?.descricao}</td>
                        <td className="px-4 py-3.5 text-slate-600 text-xs">
                          {l.validade ? new Date(l.validade).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-700">{totalDisp}</td>
                        <td className="px-4 py-3.5 text-right text-slate-500">{totalRes}</td>
                        <td className="px-4 py-3.5 text-center">
                          <Badge variant="outline" className={getStatusColor(l.status)}>
                            {l.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => {
                                setHistoryLoteId(l.id);
                                setHistoryLoteNumero(l.numeroLote);
                                setIsHistoryOpen(true);
                              }}
                              title="Histórico de Auditoria"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-primary"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => openEdit(l)}
                              title="Editar Lote"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-amber-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Link href={`/sistema/estoque/lotes/${l.id}`}>
                              <Button size="sm" variant="ghost" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                Rastrear <ArrowRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
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

      {/* DIALOG DE EDIÇÃO DE LOTE */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Pencil className="h-5 w-5 text-amber-500" />
              Editar Lote: <span className="text-slate-700 font-mono">{editingLote?.numeroLote}</span>
            </DialogTitle>
            <DialogDescription>
              Corrija os dados cadastrais do lote abaixo. A auditoria do sistema registrará a alteração.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={salvarEdicao} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Número do Lote</label>
                <Input
                  value={editForm.numeroLote}
                  onChange={(e) => setEditForm(prev => ({ ...prev, numeroLote: e.target.value }))}
                  placeholder="EX: L-100"
                  className="h-9 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Data de Validade</label>
                <Input
                  type="date"
                  value={editForm.validade}
                  onChange={(e) => setEditForm(prev => ({ ...prev, validade: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Preço de Custo (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.precoCusto}
                  onChange={(e) => setEditForm(prev => ({ ...prev, precoCusto: e.target.value }))}
                  placeholder="0.00"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Endereço no Estoque</label>
                <Input
                  value={editForm.enderecoEstoque}
                  onChange={(e) => setEditForm(prev => ({ ...prev, enderecoEstoque: e.target.value }))}
                  placeholder="Prateleira B3"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Fornecedor</label>
              <Select
                value={editForm.fornecedorId || "none"}
                onValueChange={(val) => setEditForm(prev => ({ ...prev, fornecedorId: val }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione o fornecedor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem fornecedor</SelectItem>
                  {fornecedores?.map((f: any) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.razaoSocial} {f.nomeFantasia ? `(${f.nomeFantasia})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SEÇÃO MOTIVO (OBRIGATÓRIA PARA SALVAR) */}
            <Card className="shadow-md border-amber-200 bg-amber-50/20">
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                    Motivo da Alteração <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={editMotivo}
                    onChange={(e) => setEditMotivo(e.target.value)}
                    placeholder="Descreva detalhadamente o motivo desta alteração (mínimo 5 caracteres)..."
                    className="min-h-16 text-sm bg-white border-slate-300 focus:border-primary"
                  />
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">
                      * Este motivo será gravado de forma permanente no histórico de auditoria do lote.
                    </span>
                    <span className={editMotivo.trim().length >= 5 ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
                      {editMotivo.trim().length} / 5 caracteres
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || editMotivo.trim().length < 5} className="font-bold">
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* SHEET DE HISTÓRICO */}
      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <SheetContent className="max-w-2xl sm:max-w-2xl overflow-y-auto w-full md:w-[600px]">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-primary" />
              Histórico do Lote
            </SheetTitle>
            <SheetDescription className="text-xs">
              Exibindo a linha do tempo de edições e auditorias realizadas no lote: <span className="font-semibold text-slate-800 font-mono">{historyLoteNumero}</span>
            </SheetDescription>
          </SheetHeader>

          {historyLoteId && (
            <div className="pt-4">
              <HistoricoAlteracoes entidade="lote" entidadeId={historyLoteId} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
