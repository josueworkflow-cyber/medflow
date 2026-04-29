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
import { AlertCircle } from "lucide-react";

interface EstoqueSaidaDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EstoqueSaidaDialog({
  isOpen,
  onOpenChange,
}: EstoqueSaidaDialogProps) {
  const { mutate } = useSWRConfig();
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    empresaFiscalId: "",
    documentoFiscalNumero: "",
    clienteId: "",
    pedidoVendaId: "1", // Mock por agora
    itens: [
      { produtoId: "", loteId: "", quantidade: "", valorTotal: "" }
    ]
  });

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        fetch("/api/fiscal/empresas").then(r => r.json()),
        fetch("/api/produto").then(r => r.json()),
        fetch("/api/cliente").then(r => r.json()),
      ]).then(([e, p, c]) => {
        setEmpresas(e);
        setProdutos(p);
        setClientes(c);
      });
    }
  }, [isOpen]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validação básica
    if (!formData.empresaFiscalId || !formData.documentoFiscalNumero || !formData.clienteId) {
      return toast.error("Campos fiscais são obrigatórios");
    }

    setLoading(true);
    try {
      // 1. Criar Documento Fiscal (Simplificado para o demo)
      // Em produção isso seria uma transação mais robusta
      
      const payload = {
        ...formData,
        itens: formData.itens.map(i => ({
          ...i,
          valorTotal: Number(i.quantidade) * 10 // Mock de valor
        })),
        documentoFiscalId: 1 // Mock id retornado
      };

      const res = await fetch("/api/estoque/saida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro no faturamento");
      }

      toast.success("Faturamento e baixa de estoque realizados!");
      mutate("/api/estoque/lote");
      mutate("/api/estoque/resumo");
      mutate("/api/fiscal/movimentacoes");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Saída / Faturamento Fiscal
          </DialogTitle>
        </DialogHeader>
        
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-md mb-4 flex gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800">
            Esta operação exige vinculação fiscal obrigatória. O estoque físico será baixado simultaneamente.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Empresa Emissora</label>
              <Select onValueChange={(v) => setFormData({...formData, empresaFiscalId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.nomeFantasia}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">NF-e / Documento</label>
              <Input 
                placeholder="Número da nota" 
                onChange={e => setFormData({...formData, documentoFiscalNumero: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Cliente</label>
            <Select onValueChange={(v) => setFormData({...formData, clienteId: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clientes.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.razaoSocial}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4">
            <label className="text-sm font-semibold mb-2 block">Itens da Nota</label>
            <div className="space-y-3">
              {formData.itens.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_80px] gap-2">
                  <Select onValueChange={(v) => {
                    const newItens = [...formData.itens];
                    newItens[idx].produtoId = v;
                    setFormData({...formData, itens: newItens});
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Produto..." />
                    </SelectTrigger>
                    <SelectContent>
                      {produtos.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.descricao}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input 
                    type="number" 
                    placeholder="Qtd" 
                    onChange={e => {
                      const newItens = [...formData.itens];
                      newItens[idx].quantidade = e.target.value;
                      setFormData({...formData, itens: newItens});
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {loading ? "Processando..." : "Faturar e Dar Baixa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
