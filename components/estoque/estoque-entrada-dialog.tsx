"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
}

export function EstoqueEntradaDialog({
  isOpen,
  onOpenChange,
}: EstoqueEntradaDialogProps) {
  const { mutate } = useSWRConfig();
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    produtoId: "",
    quantidade: "",
    numeroLote: "",
    validade: "",
    custoUnitario: "",
    observacao: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetch("/api/produto")
        .then((res) => res.json())
        .then((data) => setProdutos(data));
    }
  }, [isOpen]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.produtoId || !formData.quantidade) {
      return toast.error("Produto e quantidade são obrigatórios");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/estoque/lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Erro ao registrar entrada");

      toast.success("Entrada registrada com sucesso!");
      mutate("/api/estoque/lote");
      mutate("/api/estoque/resumo");
      onOpenChange(false);
      setFormData({
        produtoId: "",
        quantidade: "",
        numeroLote: "",
        validade: "",
        custoUnitario: "",
        observacao: "",
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Entrada Operacional</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Produto</label>
            <Select
              value={formData.produtoId}
              onValueChange={(v) => setFormData({ ...formData, produtoId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                {produtos.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantidade</label>
              <Input
                type="number"
                value={formData.quantidade}
                onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Custo Unit.</label>
              <Input
                type="number"
                step="0.01"
                value={formData.custoUnitario}
                onChange={(e) => setFormData({ ...formData, custoUnitario: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Lote</label>
              <Input
                value={formData.numeroLote}
                onChange={(e) => setFormData({ ...formData, numeroLote: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Validade</label>
              <Input
                type="date"
                value={formData.validade}
                onChange={(e) => setFormData({ ...formData, validade: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Registrando..." : "Confirmar Entrada"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
