/*
  Warnings:

  - The values [EMITIDA] on the enum `StatusDocumentoFiscal` will be removed. If these variants are still used in the database, this will fail.
  - The values [EMITIDA] on the enum `StatusMovimentacaoFiscal` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StatusDocumentoFiscal_new" AS ENUM ('PENDENTE', 'AUTORIZADA', 'REJEITADA', 'CANCELADA');
ALTER TABLE "public"."DocumentoFiscal" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "DocumentoFiscal" ALTER COLUMN "status" TYPE "StatusDocumentoFiscal_new" USING ("status"::text::"StatusDocumentoFiscal_new");
ALTER TYPE "StatusDocumentoFiscal" RENAME TO "StatusDocumentoFiscal_old";
ALTER TYPE "StatusDocumentoFiscal_new" RENAME TO "StatusDocumentoFiscal";
DROP TYPE "public"."StatusDocumentoFiscal_old";
ALTER TABLE "DocumentoFiscal" ALTER COLUMN "status" SET DEFAULT 'PENDENTE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "StatusMovimentacaoFiscal_new" AS ENUM ('PENDENTE', 'AUTORIZADA', 'CANCELADA');
ALTER TABLE "public"."MovimentacaoFiscal" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "MovimentacaoFiscal" ALTER COLUMN "status" TYPE "StatusMovimentacaoFiscal_new" USING ("status"::text::"StatusMovimentacaoFiscal_new");
ALTER TYPE "StatusMovimentacaoFiscal" RENAME TO "StatusMovimentacaoFiscal_old";
ALTER TYPE "StatusMovimentacaoFiscal_new" RENAME TO "StatusMovimentacaoFiscal";
DROP TYPE "public"."StatusMovimentacaoFiscal_old";
ALTER TABLE "MovimentacaoFiscal" ALTER COLUMN "status" SET DEFAULT 'PENDENTE';
COMMIT;

-- AlterEnum
ALTER TYPE "TipoDocumentoFiscal" ADD VALUE 'NFSE';

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "codigoMunicipio" TEXT,
ADD COLUMN     "complemento" TEXT,
ADD COLUMN     "consumidorFinal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contribuinteICMS" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inscricaoEstadual" TEXT,
ADD COLUMN     "inscricaoMunicipal" TEXT,
ADD COLUMN     "logradouro" TEXT,
ADD COLUMN     "numero" TEXT;

-- AlterTable
ALTER TABLE "DocumentoFiscal" ADD COLUMN     "codigoRejeicao" TEXT,
ADD COLUMN     "danfePdfBase64" TEXT,
ADD COLUMN     "dataAutorizacao" TIMESTAMP(3),
ADD COLUMN     "dataCancelamento" TIMESTAMP(3),
ADD COLUMN     "mensagemRejeicao" TEXT,
ADD COLUMN     "motivoCancelamento" TEXT,
ADD COLUMN     "protocolo" TEXT,
ADD COLUMN     "serie" TEXT,
ADD COLUMN     "xmlAutorizadoBase64" TEXT,
ADD COLUMN     "xmlCancelamento" TEXT;

-- AlterTable
ALTER TABLE "EmpresaFiscal" ADD COLUMN     "ambienteSEFAZ" TEXT NOT NULL DEFAULT 'homologacao',
ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "certificadoPfxBase64" TEXT,
ADD COLUMN     "certificadoSenha" TEXT,
ADD COLUMN     "certificadoValidade" TIMESTAMP(3),
ADD COLUMN     "codigoMunicipio" TEXT,
ADD COLUMN     "complemento" TEXT,
ADD COLUMN     "inscricaoMunicipal" TEXT,
ADD COLUMN     "logradouro" TEXT,
ADD COLUMN     "municipio" TEXT,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "numeroUltimaNFSe" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "numeroUltimaNFe" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "serieNFSe" TEXT NOT NULL DEFAULT '1',
ADD COLUMN     "serieNFe" TEXT NOT NULL DEFAULT '1',
ADD COLUMN     "uf" TEXT;

-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "aliquotaCofins" DOUBLE PRECISION,
ADD COLUMN     "aliquotaIcms" DOUBLE PRECISION,
ADD COLUMN     "aliquotaIpi" DOUBLE PRECISION,
ADD COLUMN     "aliquotaPis" DOUBLE PRECISION,
ADD COLUMN     "cfop" TEXT,
ADD COLUMN     "csosn" TEXT,
ADD COLUMN     "cst" TEXT,
ADD COLUMN     "ncm" TEXT,
ADD COLUMN     "origemMercadoria" TEXT,
ADD COLUMN     "unidadeFiscal" TEXT;
