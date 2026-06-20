-- Motor tributario configuravel por empresa, natureza e contexto da operacao.
CREATE TABLE "NaturezaOperacaoFiscal" (
    "id" SERIAL NOT NULL,
    "empresaFiscalId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipoOperacao" TEXT NOT NULL DEFAULT 'SAIDA',
    "finalidadeNFe" INTEGER NOT NULL DEFAULT 1,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "padrao" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NaturezaOperacaoFiscal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RegraTributaria" (
    "id" SERIAL NOT NULL,
    "empresaFiscalId" INTEGER NOT NULL,
    "naturezaOperacaoId" INTEGER NOT NULL,
    "produtoId" INTEGER,
    "nome" TEXT NOT NULL,
    "prioridade" INTEGER NOT NULL DEFAULT 100,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "ncmPrefixo" TEXT,
    "ufDestino" TEXT,
    "contribuinteICMS" BOOLEAN,
    "consumidorFinal" BOOLEAN,
    "cfop" TEXT NOT NULL,
    "origemMercadoria" TEXT,
    "cstIcms" TEXT,
    "csosn" TEXT,
    "modalidadeBcIcms" TEXT NOT NULL DEFAULT '3',
    "aliquotaIcms" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "reducaoBaseIcms" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "aliquotaFcp" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "modalidadeBcSt" TEXT NOT NULL DEFAULT '4',
    "mvaSt" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "aliquotaIcmsSt" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "aliquotaFcpSt" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "aliquotaInterestadual" DECIMAL(10,4),
    "aliquotaInternaDestino" DECIMAL(10,4),
    "cstIpi" TEXT NOT NULL DEFAULT '53',
    "aliquotaIpi" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "codigoEnquadramentoIpi" TEXT NOT NULL DEFAULT '999',
    "cstPis" TEXT NOT NULL DEFAULT '07',
    "aliquotaPis" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "cstCofins" TEXT NOT NULL DEFAULT '07',
    "aliquotaCofins" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "informacoesComplementares" TEXT,
    "vigenciaInicio" TIMESTAMP(3),
    "vigenciaFim" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegraTributaria_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DocumentoFiscal"
ADD COLUMN "naturezaOperacaoFiscalId" INTEGER,
ADD COLUMN "calculoTributario" JSONB;

CREATE UNIQUE INDEX "NaturezaOperacaoFiscal_empresaFiscalId_codigo_key"
ON "NaturezaOperacaoFiscal"("empresaFiscalId", "codigo");
CREATE INDEX "NaturezaOperacaoFiscal_empresaFiscalId_ativa_idx"
ON "NaturezaOperacaoFiscal"("empresaFiscalId", "ativa");
CREATE INDEX "RegraTributaria_empresaFiscalId_naturezaOperacaoId_ativa_idx"
ON "RegraTributaria"("empresaFiscalId", "naturezaOperacaoId", "ativa");
CREATE INDEX "RegraTributaria_produtoId_idx" ON "RegraTributaria"("produtoId");
CREATE INDEX "RegraTributaria_ncmPrefixo_idx" ON "RegraTributaria"("ncmPrefixo");
CREATE INDEX "DocumentoFiscal_naturezaOperacaoFiscalId_idx"
ON "DocumentoFiscal"("naturezaOperacaoFiscalId");

ALTER TABLE "NaturezaOperacaoFiscal"
ADD CONSTRAINT "NaturezaOperacaoFiscal_empresaFiscalId_fkey"
FOREIGN KEY ("empresaFiscalId") REFERENCES "EmpresaFiscal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegraTributaria"
ADD CONSTRAINT "RegraTributaria_empresaFiscalId_fkey"
FOREIGN KEY ("empresaFiscalId") REFERENCES "EmpresaFiscal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegraTributaria"
ADD CONSTRAINT "RegraTributaria_naturezaOperacaoId_fkey"
FOREIGN KEY ("naturezaOperacaoId") REFERENCES "NaturezaOperacaoFiscal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegraTributaria"
ADD CONSTRAINT "RegraTributaria_produtoId_fkey"
FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentoFiscal"
ADD CONSTRAINT "DocumentoFiscal_naturezaOperacaoFiscalId_fkey"
FOREIGN KEY ("naturezaOperacaoFiscalId") REFERENCES "NaturezaOperacaoFiscal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
