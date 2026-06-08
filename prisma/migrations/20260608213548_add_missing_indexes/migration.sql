/*
  Warnings:

  - The `statusAnterior` column on the `HistoricoPedido` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `PedidoVenda` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `statusNovo` on the `HistoricoPedido` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ClasseRisco" AS ENUM ('I', 'II', 'III', 'IV');

-- CreateEnum
CREATE TYPE "Apresentacao" AS ENUM ('AMPOLA', 'FRASCO', 'CAIXA', 'SACHE', 'BOLSA', 'SERINGA', 'TUBO', 'BLISTER', 'BOMBONA', 'LATA', 'GALERIA', 'UNIDADE', 'OUTRA');

-- CreateEnum
CREATE TYPE "StatusLote" AS ENUM ('DISPONIVEL', 'QUARENTENA', 'BLOQUEADO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'BOLETO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO', 'TRANSFERENCIA', 'A_PRAZO', 'CHEQUE');

-- CreateEnum
CREATE TYPE "TipoPedido" AS ENUM ('PEDIDO_NORMAL', 'PEDIDO_INTERNO');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('PEDIDO_CRIADO', 'AGUARDANDO_ESTOQUE', 'ESTOQUE_CONFIRMADO', 'ESTOQUE_PARCIAL', 'ESTOQUE_INDISPONIVEL', 'AGUARDANDO_FORNECEDOR', 'AGUARDANDO_APROVACAO_FINANCEIRA', 'APROVADO_FINANCEIRO', 'REPROVADO_FINANCEIRO', 'PAGAMENTO_PENDENTE', 'CONDICAO_COMERCIAL_PENDENTE', 'AGUARDANDO_CONFIRMACAO_CLIENTE', 'CLIENTE_CONFIRMOU', 'PEDIDO_EM_REVISAO', 'AGUARDANDO_FATURAMENTO', 'PEDIDO_INTERNO_AUTORIZADO', 'AUTORIZADO_PARA_SEPARACAO', 'EM_SEPARACAO', 'SEPARADO', 'FATURADO', 'DESPACHADO', 'FINALIZADO', 'CANCELADO', 'CANCELADO_PELO_CLIENTE');

-- AlterTable
ALTER TABLE "Categoria" ADD COLUMN     "parentId" INTEGER;

-- AlterTable
ALTER TABLE "Conta" ADD COLUMN     "categoria" TEXT,
ADD COLUMN     "formaPagamento" "FormaPagamento",
ADD COLUMN     "parcelaNumero" INTEGER,
ADD COLUMN     "parcelaTotal" INTEGER,
ADD COLUMN     "valorPago" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "HistoricoPedido" DROP COLUMN "statusAnterior",
ADD COLUMN     "statusAnterior" "StatusPedido",
DROP COLUMN "statusNovo",
ADD COLUMN     "statusNovo" "StatusPedido" NOT NULL;

-- AlterTable
ALTER TABLE "Lote" ADD COLUMN     "enderecoEstoque" TEXT,
ADD COLUMN     "fornecedorId" INTEGER,
ADD COLUMN     "precoCusto" DOUBLE PRECISION,
ADD COLUMN     "status" "StatusLote" NOT NULL DEFAULT 'DISPONIVEL';

-- AlterTable
ALTER TABLE "MovimentacaoEstoque" ADD COLUMN     "empresaFiscalId" INTEGER;

-- AlterTable
ALTER TABLE "PedidoVenda" ADD COLUMN     "empresaFiscalId" INTEGER,
ADD COLUMN     "formaPagamento" "FormaPagamento",
ADD COLUMN     "prazoPagamento" TEXT,
ADD COLUMN     "tipoPedido" "TipoPedido" NOT NULL DEFAULT 'PEDIDO_NORMAL',
DROP COLUMN "status",
ADD COLUMN     "status" "StatusPedido" NOT NULL DEFAULT 'PEDIDO_CRIADO';

-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "apresentacao" "Apresentacao",
ADD COLUMN     "classeRisco" "ClasseRisco",
ADD COLUMN     "cnpjFabricante" TEXT,
ADD COLUMN     "codigoFabricante" TEXT,
ADD COLUMN     "concentracaoUnidade" TEXT,
ADD COLUMN     "concentracaoValor" DOUBLE PRECISION,
ADD COLUMN     "conteudoEmbalagem" INTEGER,
ADD COLUMN     "localizacaoEstoque" TEXT,
ADD COLUMN     "marca" TEXT,
ADD COLUMN     "pontoReposicao" DOUBLE PRECISION,
ADD COLUMN     "principioAtivo" TEXT;

-- DropEnum
DROP TYPE "StatusPedidoVenda";

-- CreateTable
CREATE TABLE "HistoricoPagamento" (
    "id" SERIAL NOT NULL,
    "contaId" INTEGER NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "formaPagamento" "FormaPagamento",
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoPagamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistoricoPedido_createdAt_idx" ON "HistoricoPedido"("createdAt");

-- CreateIndex
CREATE INDEX "ItemSeparacao_loteId_idx" ON "ItemSeparacao"("loteId");

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_empresaFiscalId_fkey" FOREIGN KEY ("empresaFiscalId") REFERENCES "EmpresaFiscal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoVenda" ADD CONSTRAINT "PedidoVenda_empresaFiscalId_fkey" FOREIGN KEY ("empresaFiscalId") REFERENCES "EmpresaFiscal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoPagamento" ADD CONSTRAINT "HistoricoPagamento_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoPedido" ADD CONSTRAINT "HistoricoPedido_pedidoVendaId_fkey" FOREIGN KEY ("pedidoVendaId") REFERENCES "PedidoVenda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoPedido" ADD CONSTRAINT "HistoricoPedido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
