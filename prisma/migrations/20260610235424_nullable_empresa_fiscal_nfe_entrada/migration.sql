-- DropForeignKey
ALTER TABLE "DocumentoFiscal" DROP CONSTRAINT "DocumentoFiscal_empresaFiscalId_fkey";

-- AlterTable
ALTER TABLE "DocumentoFiscal" ALTER COLUMN "empresaFiscalId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Fornecedor" ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "codigoMunicipio" TEXT,
ADD COLUMN     "complemento" TEXT,
ADD COLUMN     "inscricaoEstadual" TEXT,
ADD COLUMN     "inscricaoMunicipal" TEXT,
ADD COLUMN     "logradouro" TEXT,
ADD COLUMN     "numero" TEXT;

-- AddForeignKey
ALTER TABLE "DocumentoFiscal" ADD CONSTRAINT "DocumentoFiscal_empresaFiscalId_fkey" FOREIGN KEY ("empresaFiscalId") REFERENCES "EmpresaFiscal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
