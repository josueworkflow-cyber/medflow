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
import { Button } from "@/components/ui/button";
import { History, MoreHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function EstoqueTabelaPosicao() {
  const { data, isLoading } = useSWR("/api/estoque/lote", fetcher);

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
            <TableHead>Produto</TableHead>
            <TableHead>Lote</TableHead>
            <TableHead>Validade</TableHead>
            <TableHead className="text-right">Disponível</TableHead>
            <TableHead className="text-right">Reservado</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Localização</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {item.produto?.descricao}
                <div className="text-xs text-muted-foreground font-normal">
                  Cód: {item.produto?.codigoInterno}
                </div>
              </TableCell>
              <TableCell>{item.lote?.numeroLote || "-"}</TableCell>
              <TableCell>
                {item.lote?.validade 
                  ? new Date(item.lote.validade).toLocaleDateString("pt-BR") 
                  : "-"}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {item.quantidadeDisponivel}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {item.quantidadeReservada}
              </TableCell>
              <TableCell>
                <Badge variant={item.status === 'DISPONIVEL' ? 'outline' : 'secondary'}>
                  {item.status}
                </Badge>
              </TableCell>
              <TableCell>{item.localizacao?.nome || "-"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" title="Ver Histórico">
                    <History className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {data?.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                Nenhum produto em estoque
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
