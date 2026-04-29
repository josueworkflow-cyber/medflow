-- CreateEnum
CREATE TYPE "StatusEstoque" AS ENUM ('DISPONIVEL', 'RESERVADO', 'BLOQUEADO', 'VENCIDO', 'QUARENTENA');

-- CreateEnum
CREATE TYPE "TipoDocumentoFiscal" AS ENUM ('NFE_ENTRADA', 'NFE_SAIDA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "StatusDocumentoFiscal" AS ENUM ('PENDENTE', 'EMITIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusMovimentacaoFiscal" AS ENUM ('PENDENTE', 'EMITIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "RegimeTributario" AS ENUM ('SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL');

-- CreateEnum
CREATE TYPE "StatusPedidoCompra" AS ENUM ('RASCUNHO', 'ENVIADO', 'PARCIAL', 'RECEBIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusPedidoVenda" AS ENUM ('RASCUNHO', 'APROVADO', 'SEPARACAO', 'CONFERENCIA', 'FATURADO', 'ENTREGUE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusSeparacao" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONFERIDO', 'ENVIADO');

-- CreateEnum
CREATE TYPE "TipoConta" AS ENUM ('RECEBER', 'PAGAR');

-- CreateEnum
CREATE TYPE "StatusConta" AS ENUM ('ABERTA', 'PAGA', 'VENCIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('ADMINISTRADOR', 'VENDAS', 'ESTOQUE', 'FINANCEIRO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoMovimentacao" ADD VALUE 'CANCELAMENTO_RESERVA';
ALTER TYPE "TipoMovimentacao" ADD VALUE 'DEVOLUCAO';

-- AlterTable
ALTER TABLE "EstoqueAtual" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "custoUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "status" "StatusEstoque" NOT NULL DEFAULT 'DISPONIVEL';

-- AlterTable
ALTER TABLE "MovimentacaoEstoque" ADD COLUMN     "destino" TEXT,
ADD COLUMN     "origem" TEXT,
ADD COLUMN     "pedidoVendaId" INTEGER,
ADD COLUMN     "usuarioId" INTEGER;

-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "categoriaId" INTEGER,
ADD COLUMN     "estoqueMinimo" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "perfil" "PerfilUsuario" NOT NULL DEFAULT 'VENDAS',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "empresaId" INTEGER NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fornecedor" (
    "id" SERIAL NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpjCpf" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "limiteCredito" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendedor" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "comissao" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metaMensal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usuarioId" INTEGER,

    CONSTRAINT "Vendedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoCompra" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "fornecedorId" INTEGER NOT NULL,
    "status" "StatusPedidoCompra" NOT NULL DEFAULT 'RASCUNHO',
    "observacao" TEXT,
    "valorTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PedidoCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPedidoCompra" (
    "id" SERIAL NOT NULL,
    "pedidoCompraId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "precoUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ItemPedidoCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoVenda" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "vendedorId" INTEGER,
    "status" "StatusPedidoVenda" NOT NULL DEFAULT 'RASCUNHO',
    "desconto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "valorTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PedidoVenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPedidoVenda" (
    "id" SERIAL NOT NULL,
    "pedidoVendaId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "precoUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "desconto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ItemPedidoVenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TabelaPreco" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "clienteId" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TabelaPreco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemTabelaPreco" (
    "id" SERIAL NOT NULL,
    "tabelaPrecoId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,
    "descontoMax" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ItemTabelaPreco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Separacao" (
    "id" SERIAL NOT NULL,
    "pedidoVendaId" INTEGER NOT NULL,
    "status" "StatusSeparacao" NOT NULL DEFAULT 'PENDENTE',
    "responsavel" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Separacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemSeparacao" (
    "id" SERIAL NOT NULL,
    "separacaoId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "loteId" INTEGER,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "conferido" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ItemSeparacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Romaneio" (
    "id" SERIAL NOT NULL,
    "separacaoId" INTEGER NOT NULL,
    "motorista" TEXT,
    "veiculo" TEXT,
    "statusEntrega" TEXT NOT NULL DEFAULT 'PENDENTE',
    "dataEntrega" TIMESTAMP(3),
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Romaneio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conta" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoConta" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "status" "StatusConta" NOT NULL DEFAULT 'ABERTA',
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clienteId" INTEGER,
    "fornecedorId" INTEGER,
    "pedidoVendaId" INTEGER,

    CONSTRAINT "Conta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmpresaFiscal" (
    "id" SERIAL NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT NOT NULL,
    "inscricaoEstadual" TEXT,
    "regimeTributario" "RegimeTributario",
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmpresaFiscal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoFiscal" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoDocumentoFiscal" NOT NULL,
    "numero" TEXT NOT NULL,
    "chaveAcesso" TEXT,
    "empresaFiscalId" INTEGER NOT NULL,
    "fornecedorId" INTEGER,
    "clienteId" INTEGER,
    "pedidoVendaId" INTEGER,
    "status" "StatusDocumentoFiscal" NOT NULL DEFAULT 'PENDENTE',
    "dataEmissao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoFiscal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentacaoFiscal" (
    "id" SERIAL NOT NULL,
    "movimentacaoEstoqueId" INTEGER NOT NULL,
    "pedidoVendaId" INTEGER,
    "clienteId" INTEGER,
    "empresaFiscalId" INTEGER NOT NULL,
    "documentoFiscalId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "loteId" INTEGER,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "StatusMovimentacaoFiscal" NOT NULL DEFAULT 'PENDENTE',
    "dataEmissao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoFiscal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Fornecedor_cnpj_key" ON "Fornecedor"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_cnpjCpf_key" ON "Cliente"("cnpjCpf");

-- CreateIndex
CREATE UNIQUE INDEX "Vendedor_usuarioId_key" ON "Vendedor"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "PedidoCompra_numero_key" ON "PedidoCompra"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "PedidoVenda_numero_key" ON "PedidoVenda"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Separacao_pedidoVendaId_key" ON "Separacao"("pedidoVendaId");

-- CreateIndex
CREATE UNIQUE INDEX "Romaneio_separacaoId_key" ON "Romaneio"("separacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "EmpresaFiscal_cnpj_key" ON "EmpresaFiscal"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "MovimentacaoFiscal_movimentacaoEstoqueId_key" ON "MovimentacaoFiscal"("movimentacaoEstoqueId");

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_pedidoVendaId_fkey" FOREIGN KEY ("pedidoVendaId") REFERENCES "PedidoVenda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendedor" ADD CONSTRAINT "Vendedor_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoCompra" ADD CONSTRAINT "PedidoCompra_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedidoCompra" ADD CONSTRAINT "ItemPedidoCompra_pedidoCompraId_fkey" FOREIGN KEY ("pedidoCompraId") REFERENCES "PedidoCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedidoCompra" ADD CONSTRAINT "ItemPedidoCompra_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoVenda" ADD CONSTRAINT "PedidoVenda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoVenda" ADD CONSTRAINT "PedidoVenda_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Vendedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedidoVenda" ADD CONSTRAINT "ItemPedidoVenda_pedidoVendaId_fkey" FOREIGN KEY ("pedidoVendaId") REFERENCES "PedidoVenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedidoVenda" ADD CONSTRAINT "ItemPedidoVenda_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TabelaPreco" ADD CONSTRAINT "TabelaPreco_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTabelaPreco" ADD CONSTRAINT "ItemTabelaPreco_tabelaPrecoId_fkey" FOREIGN KEY ("tabelaPrecoId") REFERENCES "TabelaPreco"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTabelaPreco" ADD CONSTRAINT "ItemTabelaPreco_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Separacao" ADD CONSTRAINT "Separacao_pedidoVendaId_fkey" FOREIGN KEY ("pedidoVendaId") REFERENCES "PedidoVenda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemSeparacao" ADD CONSTRAINT "ItemSeparacao_separacaoId_fkey" FOREIGN KEY ("separacaoId") REFERENCES "Separacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemSeparacao" ADD CONSTRAINT "ItemSeparacao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemSeparacao" ADD CONSTRAINT "ItemSeparacao_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Romaneio" ADD CONSTRAINT "Romaneio_separacaoId_fkey" FOREIGN KEY ("separacaoId") REFERENCES "Separacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conta" ADD CONSTRAINT "Conta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conta" ADD CONSTRAINT "Conta_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conta" ADD CONSTRAINT "Conta_pedidoVendaId_fkey" FOREIGN KEY ("pedidoVendaId") REFERENCES "PedidoVenda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoFiscal" ADD CONSTRAINT "DocumentoFiscal_empresaFiscalId_fkey" FOREIGN KEY ("empresaFiscalId") REFERENCES "EmpresaFiscal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoFiscal" ADD CONSTRAINT "DocumentoFiscal_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoFiscal" ADD CONSTRAINT "DocumentoFiscal_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoFiscal" ADD CONSTRAINT "DocumentoFiscal_pedidoVendaId_fkey" FOREIGN KEY ("pedidoVendaId") REFERENCES "PedidoVenda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoFiscal" ADD CONSTRAINT "MovimentacaoFiscal_movimentacaoEstoqueId_fkey" FOREIGN KEY ("movimentacaoEstoqueId") REFERENCES "MovimentacaoEstoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoFiscal" ADD CONSTRAINT "MovimentacaoFiscal_pedidoVendaId_fkey" FOREIGN KEY ("pedidoVendaId") REFERENCES "PedidoVenda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoFiscal" ADD CONSTRAINT "MovimentacaoFiscal_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoFiscal" ADD CONSTRAINT "MovimentacaoFiscal_empresaFiscalId_fkey" FOREIGN KEY ("empresaFiscalId") REFERENCES "EmpresaFiscal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoFiscal" ADD CONSTRAINT "MovimentacaoFiscal_documentoFiscalId_fkey" FOREIGN KEY ("documentoFiscalId") REFERENCES "DocumentoFiscal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoFiscal" ADD CONSTRAINT "MovimentacaoFiscal_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoFiscal" ADD CONSTRAINT "MovimentacaoFiscal_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
