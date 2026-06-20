-- Expande o cadastro e o estoque para preservar todos os dados da base legada
-- produtos_854968.csv sem misturar dados mestres com dados por lote.

ALTER TABLE "Produto"
ADD COLUMN "estoqueMaximo" DOUBLE PRECISION,
ADD COLUMN "tipoItem" TEXT,
ADD COLUMN "produtoVariado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "pesoBruto" DOUBLE PRECISION,
ADD COLUMN "pesoLiquido" DOUBLE PRECISION,
ADD COLUMN "observacoes" TEXT,
ADD COLUMN "numeroOrdem" TEXT,
ADD COLUMN "tamanho" TEXT,
ADD COLUMN "categoriaLegadoId" TEXT,
ADD COLUMN "subcategoriaLegadoId" TEXT,
ADD COLUMN "dadosOrigem" JSONB,
ADD COLUMN "codigoBeneficioFiscal" TEXT,
ADD COLUMN "cest" TEXT,
ADD COLUMN "tipoClassificacaoFiscal" TEXT;

ALTER TABLE "Lote"
ADD COLUMN "codigoProdutoLegado" TEXT,
ADD COLUMN "nomeProdutoOrigem" TEXT,
ADD COLUMN "fornecedorOrigem" TEXT,
ADD COLUMN "fornecedorLegadoId" TEXT,
ADD COLUMN "marcaOrigem" TEXT,
ADD COLUMN "gtinOrigem" TEXT,
ADD COLUMN "unidadeOrigem" TEXT,
ADD COLUMN "situacaoOrigem" TEXT,
ADD COLUMN "observacoesOrigem" TEXT,
ADD COLUMN "estoqueMinimoOrigem" DOUBLE PRECISION,
ADD COLUMN "estoqueMaximoOrigem" DOUBLE PRECISION,
ADD COLUMN "valorVendaOrigem" DOUBLE PRECISION,
ADD COLUMN "valorCustoOrigem" DOUBLE PRECISION,
ADD COLUMN "linhaFonteOrigem" INTEGER,
ADD COLUMN "dadosOrigem" JSONB;

ALTER TABLE "MovimentacaoEstoque"
ADD COLUMN "fonteImportacao" TEXT,
ADD COLUMN "linhaFonteOrigem" INTEGER,
ADD COLUMN "codigoProdutoLegado" TEXT,
ADD COLUMN "dadosOrigem" JSONB;

CREATE INDEX "Produto_categoriaLegadoId_idx" ON "Produto"("categoriaLegadoId");
CREATE INDEX "Produto_cest_idx" ON "Produto"("cest");
CREATE INDEX "Lote_codigoProdutoLegado_idx" ON "Lote"("codigoProdutoLegado");
CREATE INDEX "Lote_linhaFonteOrigem_idx" ON "Lote"("linhaFonteOrigem");
CREATE INDEX "MovimentacaoEstoque_fonteImportacao_idx" ON "MovimentacaoEstoque"("fonteImportacao");
CREATE INDEX "MovimentacaoEstoque_linhaFonteOrigem_idx" ON "MovimentacaoEstoque"("linhaFonteOrigem");
