-- CreateEnum
CREATE TYPE "StatusEmail" AS ENUM ('PENDENTE', 'ENVIADO', 'FALHOU');

-- AlterTable
ALTER TABLE "EmpresaFiscal" ADD COLUMN     "emailApiKey" TEXT,
ADD COLUMN     "emailAtivo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailRemetente" TEXT;

-- CreateTable
CREATE TABLE "LogEmail" (
    "id" SERIAL NOT NULL,
    "destinatario" TEXT NOT NULL,
    "remetente" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "status" "StatusEmail" NOT NULL DEFAULT 'PENDENTE',
    "erroMensagem" TEXT,
    "pedidoVendaId" INTEGER,
    "documentoFiscalId" INTEGER,
    "empresaFiscalId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogEmail_pedidoVendaId_idx" ON "LogEmail"("pedidoVendaId");

-- CreateIndex
CREATE INDEX "LogEmail_documentoFiscalId_idx" ON "LogEmail"("documentoFiscalId");

-- CreateIndex
CREATE INDEX "LogEmail_empresaFiscalId_idx" ON "LogEmail"("empresaFiscalId");

-- CreateIndex
CREATE INDEX "LogEmail_createdAt_idx" ON "LogEmail"("createdAt");

-- AddForeignKey
ALTER TABLE "LogEmail" ADD CONSTRAINT "LogEmail_pedidoVendaId_fkey" FOREIGN KEY ("pedidoVendaId") REFERENCES "PedidoVenda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogEmail" ADD CONSTRAINT "LogEmail_documentoFiscalId_fkey" FOREIGN KEY ("documentoFiscalId") REFERENCES "DocumentoFiscal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogEmail" ADD CONSTRAINT "LogEmail_empresaFiscalId_fkey" FOREIGN KEY ("empresaFiscalId") REFERENCES "EmpresaFiscal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
