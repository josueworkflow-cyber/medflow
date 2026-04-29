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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function EstoqueTabelaMovimentacoes() {
  const { data, isLoading } = useSWR("/api/estoque/movimentacoes", fetcher);

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
            <TableHead>Tipo</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Lote</TableHead>
            <TableHead className="text-right">Qtd</TableHead>
            <TableHead>Origem/Destino</TableHead>
            <TableHead>Usuário</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((mov: any) => (
            <TableRow key={mov.id}>
              <TableCell className="text-xs">
                {new Date(mov.createdAt).toLocaleString("pt-BR")}
              </TableCell>
              <TableCell>
                <Badge variant={
                  mov.tipo === 'ENTRADA' ? 'default' : 
                  mov.tipo === 'SAIDA' ? 'destructive' : 
                  'outline'
                }>
                  {mov.tipo}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">
                {mov.produto?.descricao}
              </TableCell>
              <TableCell>{mov.lote?.numeroLote || "-"}</TableCell>
              <TableCell className="text-right font-semibold">
                {mov.quantidade}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {mov.origem || mov.destino || "-"}
              </TableCell>
              <TableCell className="text-xs">
                {mov.usuario || "Sistema"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
