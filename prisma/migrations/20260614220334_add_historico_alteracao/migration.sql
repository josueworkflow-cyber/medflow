-- CreateEnum
CREATE TYPE "TipoEntidadeAuditada" AS ENUM ('PRODUTO', 'LOTE', 'MOVIMENTACAO_ESTOQUE');

-- CreateTable
CREATE TABLE "HistoricoAlteracao" (
    "id" SERIAL NOT NULL,
    "grupoId" TEXT NOT NULL,
    "entidade" "TipoEntidadeAuditada" NOT NULL,
    "entidadeId" INTEGER NOT NULL,
    "campo" TEXT NOT NULL,
    "valorAnterior" TEXT,
    "valorNovo" TEXT,
    "motivo" TEXT NOT NULL,
    "usuarioId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoAlteracao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistoricoAlteracao_entidade_entidadeId_idx" ON "HistoricoAlteracao"("entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "HistoricoAlteracao_grupoId_idx" ON "HistoricoAlteracao"("grupoId");

-- CreateIndex
CREATE INDEX "HistoricoAlteracao_usuarioId_idx" ON "HistoricoAlteracao"("usuarioId");

-- CreateIndex
CREATE INDEX "HistoricoAlteracao_createdAt_idx" ON "HistoricoAlteracao"("createdAt");

-- AddForeignKey
ALTER TABLE "HistoricoAlteracao" ADD CONSTRAINT "HistoricoAlteracao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
