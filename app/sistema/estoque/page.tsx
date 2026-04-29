"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EstoqueCards } from "@/components/estoque/estoque-cards";
import { EstoqueFiltros } from "@/components/estoque/estoque-filtros";
import { EstoqueTabelaPosicao } from "@/components/estoque/estoque-tabela-posicao";
import { EstoqueTabelaMovimentacoes } from "@/components/estoque/estoque-tabela-movimentacoes";
import { EstoqueTabelaFiscal } from "@/components/estoque/estoque-tabela-fiscal";
import { EstoqueEntradaDialog } from "@/components/estoque/estoque-entrada-dialog";
import { EstoqueSaidaDialog } from "@/components/estoque/estoque-saida-dialog";
import { motion } from "framer-motion";

export default function EstoquePage() {
  const [activeTab, setActiveTab] = useState("posicao");
  const [isEntradaOpen, setIsEntradaOpen] = useState(false);
  const [isSaidaOpen, setIsSaidaOpen] = useState(false);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Estoque Central</h2>
          <p className="text-muted-foreground">
            Gestão unificada de saldo operacional e movimentações fiscais.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Botões rápidos se necessário */}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <EstoqueCards />
      </motion.div>

      <div className="space-y-4">
        <EstoqueFiltros 
          onOpenEntrada={() => setIsEntradaOpen(true)} 
          onOpenSaida={() => setIsSaidaOpen(true)}
        />

        <Tabs defaultValue="posicao" className="space-y-4" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
            <TabsTrigger value="posicao">Posição Atual</TabsTrigger>
            <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
            <TabsTrigger value="fiscal">Camada Fiscal</TabsTrigger>
          </TabsList>
          
          <TabsContent value="posicao" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <EstoqueTabelaPosicao />
            </motion.div>
          </TabsContent>

          <TabsContent value="movimentacoes" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <EstoqueTabelaMovimentacoes />
            </motion.div>
          </TabsContent>

          <TabsContent value="fiscal" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <EstoqueTabelaFiscal />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modais */}
      <EstoqueEntradaDialog 
        isOpen={isEntradaOpen} 
        onOpenChange={setIsEntradaOpen} 
      />
      <EstoqueSaidaDialog 
        isOpen={isSaidaOpen} 
        onOpenChange={setIsSaidaOpen} 
      />
    </div>
  );
}