-- AlterTable
ALTER TABLE "EmpresaFiscal" ADD COLUMN     "aliquotaIss" DECIMAL(65,30),
ADD COLUMN     "codigoNbs" TEXT,
ADD COLUMN     "codigoTributacaoIss" TEXT,
ADD COLUMN     "percentualTributosEstaduais" TEXT,
ADD COLUMN     "percentualTributosFederais" TEXT;
