/*
  Warnings:

  - A unique constraint covering the columns `[estornoDeMovimentacaoId]` on the table `MovimentacaoEstoque` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "StatusSeparacao" ADD VALUE 'CANCELADA';

-- AlterTable
ALTER TABLE "DocumentoFiscal" ADD COLUMN     "nSeqEventoCancelamento" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Lote" ADD COLUMN     "bloqueadoEm" TIMESTAMP(3),
ADD COLUMN     "bloqueadoPor" INTEGER,
ADD COLUMN     "motivoBloqueio" TEXT;

-- AlterTable
ALTER TABLE "MovimentacaoEstoque" ADD COLUMN     "estornoDeMovimentacaoId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "MovimentacaoEstoque_estornoDeMovimentacaoId_key" ON "MovimentacaoEstoque"("estornoDeMovimentacaoId");

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_estornoDeMovimentacaoId_fkey" FOREIGN KEY ("estornoDeMovimentacaoId") REFERENCES "MovimentacaoEstoque"("id") ON DELETE SET NULL ON UPDATE CASCADE;
