"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useSWRConfig } from "swr";

interface EstoqueEntradaDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Fornecedor {
  id: number;
  razaoSocial: string;
}

interface Produto {
  id: number;
  descricao: string;
  controlaLote: boolean;
  controlaValidade: boolean;
}

export function EstoqueEntradaDialog({
  isOpen,
  onOpenChange,
  onSuccess,
}: EstoqueEntradaDialogProps) {
  const { mutate } = useSWRConfig();
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [formData, setFormData] = useState({
    produtoId: "",
    quantidade: "",
    numeroLote: "",
    validade: "",
    custoUnitario: "",
    fornecedorId: "",
    enderecoEstoque: "",
    status: "DISPONIVEL",
    observacao: "",
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        produtoId: "",
        quantidade: "",
        numeroLote: "",
        validade: "",
        custoUnitario: "",
        fornecedorId: "",
        enderecoEstoque: "",
        status: "DISPONIVEL",
        observacao: "",
      });
      Promise.all([
        fetch("/api/produto").then(res => res.json()),
        fetch("/api/fornecedores").then(res => res.json()),
      ]).then(([produtosData, fornecedoresData]) => {
        setProdutos(Array.isArray(produtosData) ? produtosData : []);
        setFornecedores(Array.isArray(fornecedoresData) ? fornecedoresData : []);
      });
    }
  }, [isOpen]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.produtoId || !formData.quantidade) {
      return toast.error("Produto e quantidade são obrigatórios");
    }

    const selectedProduto = produtos.find(p => p.id.toString() === formData.produtoId);
    if (selectedProduto?.controlaLote && !formData.numeroLote) {
      return toast.error("Este produto requer número de lote");
    }
    if (selectedProduto?.controlaValidade && !formData.validade) {
      return toast.error("Este produto requer data de validade");
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        produtoId: Number(formData.produtoId),
        quantidade: Number(formData.quantidade),
        numeroLote: formData.numeroLote || undefined,
        validade: formData.validade || undefined,
        custoUnitario: formData.custoUnitario ? Number(formData.custoUnitario) : undefined,
        fornecedorId: formData.fornecedorId ? Number(formData.fornecedorId) : undefined,
        enderecoEstoque: formData.enderecoEstoque || undefined,
        status: formData.status,
        observacao: formData.observacao || undefined,
      };

      const res = await fetch("/api/estoque/lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao registrar entrada");

      toast.success("Entrada registrada!");
      mutate("/api/estoque/lote");
      mutate("/api/estoque/resumo");
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const selectedProduto = produtos.find(p => p.id.toString() === formData.produtoId);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base">Nova Entrada de Estoque</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3 py-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Produto *</label>
            <Select
              value={formData.produtoId}
              onValueChange={(v) => setFormData({ ...formData, produtoId: v })}
            >
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {produtos.length === 0 ? (
                  <SelectItem value="empty" disabled>Nenhum produto cadastrado</SelectItem>
                ) : (
                  produtos.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.descricao}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Quantidade *</label>
              <Input
                type="number"
                value={formData.quantidade}
                onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                className="h-9 text-sm"
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Custo Unit. (R$)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.custoUnitario}
                onChange={(e) => setFormData({ ...formData, custoUnitario: e.target.value })}
                className="h-9 text-sm"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">
                Nº Lote {selectedProduto?.controlaLote && <span className="text-red-500">*</span>}
              </label>
              <Input
                value={formData.numeroLote}
                onChange={(e) => setFormData({ ...formData, numeroLote: e.target.value })}
                placeholder="LOT-001"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">
                Validade {selectedProduto?.controlaValidade && <span className="text-red-500">*</span>}
              </label>
              <Input
                type="date"
                value={formData.validade}
                onChange={(e) => setFormData({ ...formData, validade: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Fornecedor</label>
              <Select
                value={formData.fornecedorId}
                onValueChange={(v) => setFormData({ ...formData, fornecedorId: v })}
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {fornecedores.length === 0 ? (
                    <SelectItem value="empty" disabled>Sem fornecedores</SelectItem>
                  ) : (
                    fornecedores.map((f) => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        {f.razaoSocial}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Status Lote</label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DISPONIVEL">Disponível</SelectItem>
                  <SelectItem value="QUARENTENA">Quarentena</SelectItem>
                  <SelectItem value="BLOQUEADO">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Endereço Estoque</label>
            <Input
              value={formData.enderecoEstoque}
              onChange={(e) => setFormData({ ...formData, enderecoEstoque: e.target.value })}
              placeholder="Ex: Corredor A, Prateleira 3"
              className="h-9 text-sm"
            />
          </div>

          <Button type="submit" disabled={loading || !formData.produtoId || !formData.quantidade} className="w-full h-10 text-sm font-bold">
            {loading ? "Registrando..." : "Confirmar Entrada"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}