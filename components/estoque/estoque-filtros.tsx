"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Filter, Download, ArrowUpRight } from "lucide-react";

interface EstoqueFiltrosProps {
  onOpenEntrada: () => void;
  onOpenSaida: () => void;
}

export function EstoqueFiltros({ onOpenEntrada, onOpenSaida }: EstoqueFiltrosProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between py-4">
      <div className="flex flex-1 items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto ou lote..."
            className="pl-8"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onOpenSaida} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
          <ArrowUpRight className="mr-2 h-4 w-4" />
          Faturar Saída
        </Button>
        <Button onClick={onOpenEntrada} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Nova Entrada
        </Button>
      </div>
    </div>
  );
}
