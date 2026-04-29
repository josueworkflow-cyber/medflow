"use client";

import useSWR from "swr";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function EstoqueTabelaFiscal() {
  const { data, isLoading } = useSWR("/api/fiscal/movimentacoes", fetcher);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Empresa Emissora</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead className="text-right">Qtd</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((fisc: any) => (
            <TableRow key={fisc.id}>
              <TableCell className="text-xs">
                {new Date(fisc.createdAt).toLocaleDateString("pt-BR")}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3 text-blue-500" />
                  <span className="font-medium">{fisc.documentoFiscal?.numero}</span>
                  <Badge variant="outline" className="text-[10px] scale-90">
                    {fisc.documentoFiscal?.tipo}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-xs">
                {fisc.empresaFiscal?.nomeFantasia}
              </TableCell>
              <TableCell className="text-xs font-medium">
                {fisc.cliente?.razaoSocial}
              </TableCell>
              <TableCell className="text-xs">
                {fisc.produto?.descricao}
              </TableCell>
              <TableCell className="text-right">
                {fisc.quantidade}
              </TableCell>
              <TableCell className="text-right font-semibold text-emerald-600">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(fisc.valorTotal)}
              </TableCell>
            </TableRow>
          ))}
          {data?.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                Nenhuma movimentação fiscal registrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
