import { prisma } from "@/lib/prisma";

export async function atualizarLotesVencidos(): Promise<void> {
  const now = new Date();
  
  // Buscar todos os lotes vencidos que estejam DISPONIVEL ou QUARENTENA
  const lotes = await prisma.lote.findMany({
    where: {
      validade: { lt: now },
      status: { in: ["DISPONIVEL", "QUARENTENA"] }
    },
    include: {
      estoqueAtual: true
    }
  });

  let count = 0;

  for (const lote of lotes) {
    await prisma.$transaction(async (tx) => {
      // 1. Atualizar o Lote para VENCIDO
      await tx.lote.update({
        where: { id: lote.id },
        data: { status: "VENCIDO" }
      });

      // 2. Atualizar todos os EstoqueAtual correspondentes para VENCIDO
      await tx.estoqueAtual.updateMany({
        where: { loteId: lote.id },
        data: { status: "VENCIDO" }
      });

      // Calcular a quantidade disponível que foi bloqueada
      const totalDisponivel = lote.estoqueAtual.reduce((sum, item) => sum + item.quantidadeDisponivel, 0);

      // 3. Criar MovimentacaoEstoque do tipo BLOQUEIO
      await tx.movimentacaoEstoque.create({
        data: {
          produtoId: lote.produtoId,
          loteId: lote.id,
          tipo: "BLOQUEIO",
          quantidade: totalDisponivel,
          observacao: "Lote vencido — bloqueio automático",
          origem: "Job Lote Vencimento"
        }
      });
    });
    count++;
  }

  console.log(JSON.stringify({
    job: "atualizarLotesVencidos",
    lotesAtualizados: count,
    executadoEm: new Date().toISOString()
  }));
}
