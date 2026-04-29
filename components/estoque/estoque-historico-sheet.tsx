"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, ArrowUpRight, ArrowDownLeft, Lock, Unlock, FileCheck } from "lucide-react";

interface HistoricoItem {
  id: number;
  tipo: string;
  quantidade: number;
  createdAt: string;
  usuarioRef?: { nome: string };
  observacao?: string;
  movimentacaoFiscal?: {
    empresaFiscal: { nomeFantasia: string };
    documentoFiscal: { numero: string; tipo: string };
  };
}

interface EstoqueHistoricoSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  produtoNome: string;
  loteNumero?: string;
  historico: HistoricoItem[];
}

export function EstoqueHistoricoSheet({
  isOpen,
  onOpenChange,
  produtoNome,
  loteNumero,
  historico,
}: EstoqueHistoricoSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Histórico do Item</SheetTitle>
          <SheetDescription>
            {produtoNome} {loteNumero ? ` - Lote: ${loteNumero}` : ""}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] mt-6 pr-4">
          <div className="space-y-6">
            {historico.map((item) => (
              <div key={item.id} className="relative pl-6 pb-6 border-l last:pb-0">
                <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-background border flex items-center justify-center">
                  {item.tipo === "ENTRADA" && <ArrowDownLeft className="h-2 w-2 text-emerald-500" />}
                  {item.tipo === "SAIDA" && <ArrowUpRight className="h-2 w-2 text-red-500" />}
                  {item.tipo === "RESERVA" && <Lock className="h-2 w-2 text-amber-500" />}
                  {item.tipo === "CANCELAMENTO_RESERVA" && <Unlock className="h-2 w-2 text-blue-500" />}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">
                      {item.tipo}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="font-semibold text-sm">
                    {item.tipo === "ENTRADA" ? "+" : "-"} {item.quantidade} unidades
                  </div>
                  {item.observacao && (
                    <p className="text-xs text-muted-foreground">{item.observacao}</p>
                  )}
                  {item.movimentacaoFiscal && (
                    <div className="mt-2 p-2 rounded bg-muted/50 border border-emerald-100 flex items-start gap-2">
                      <FileCheck className="h-3 w-3 text-emerald-500 mt-0.5" />
                      <div className="text-[10px]">
                        <div className="font-medium text-emerald-700">Faturado Fiscal</div>
                        <div>NF: {item.movimentacaoFiscal.documentoFiscal.numero} ({item.movimentacaoFiscal.documentoFiscal.tipo})</div>
                        <div>Emissor: {item.movimentacaoFiscal.empresaFiscal.nomeFantasia}</div>
                      </div>
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground pt-1">
                    Operador: {item.usuarioRef?.nome || "Sistema"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
