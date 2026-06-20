#!/usr/bin/env node
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const execute = process.argv.includes("--execute");
const SOURCE_FILE = "produtos_854968.csv";
const IMPORT_TAG = "IMPORT_PRODUTOS_854968";

try {
  const before = await getCounts(prisma);
  printCounts("Estoque da importacao encontrado", before);

  if (!execute) {
    console.log("");
    console.log("Nada foi apagado. Para remover somente o estoque importado, rode com --execute.");
    process.exit(0);
  }

  const deleted = await prisma.$transaction(async (tx) => {
    const estoqueAtual = await tx.$executeRaw`
      DELETE FROM "EstoqueAtual"
      WHERE "produtoId" IN (
        SELECT id FROM "Produto"
        WHERE "dadosOrigem"->>'fonte' = ${SOURCE_FILE}
      )
    `;

    const movimentacoes = await tx.$executeRaw`
      DELETE FROM "MovimentacaoEstoque"
      WHERE "fonteImportacao" = ${IMPORT_TAG}
         OR "produtoId" IN (
           SELECT id FROM "Produto"
           WHERE "dadosOrigem"->>'fonte' = ${SOURCE_FILE}
         )
    `;

    const lotes = await tx.$executeRaw`
      DELETE FROM "Lote"
      WHERE "produtoId" IN (
        SELECT id FROM "Produto"
        WHERE "dadosOrigem"->>'fonte' = ${SOURCE_FILE}
      )
    `;

    return { estoqueAtual, movimentacoes, lotes };
  });

  printCounts("Estoque apagado", { ...deleted, produtos: 0 });

  const after = await getCounts(prisma);
  printCounts("Estoque restante dessa importacao", after);
} finally {
  await prisma.$disconnect();
}

async function getCounts(client) {
  const [produtos, lotes, movimentacoes, estoqueAtual] = await Promise.all([
    client.$queryRaw`
      SELECT count(*)::int AS count FROM "Produto"
      WHERE "dadosOrigem"->>'fonte' = ${SOURCE_FILE}
    `,
    client.$queryRaw`
      SELECT count(*)::int AS count FROM "Lote"
      WHERE "produtoId" IN (
        SELECT id FROM "Produto"
        WHERE "dadosOrigem"->>'fonte' = ${SOURCE_FILE}
      )
    `,
    client.$queryRaw`
      SELECT count(*)::int AS count FROM "MovimentacaoEstoque"
      WHERE "fonteImportacao" = ${IMPORT_TAG}
         OR "produtoId" IN (
           SELECT id FROM "Produto"
           WHERE "dadosOrigem"->>'fonte' = ${SOURCE_FILE}
         )
    `,
    client.$queryRaw`
      SELECT count(*)::int AS count FROM "EstoqueAtual"
      WHERE "produtoId" IN (
        SELECT id FROM "Produto"
        WHERE "dadosOrigem"->>'fonte' = ${SOURCE_FILE}
      )
    `,
  ]);

  return {
    produtos: produtos[0].count,
    lotes: lotes[0].count,
    movimentacoes: movimentacoes[0].count,
    estoqueAtual: estoqueAtual[0].count,
  };
}

function printCounts(title, counts) {
  console.log(title);
  console.log("-------------------------------");
  console.log(`Produtos preservados: ${counts.produtos}`);
  console.log(`Lotes: ${counts.lotes}`);
  console.log(`Movimentacoes: ${counts.movimentacoes}`);
  console.log(`EstoqueAtual: ${counts.estoqueAtual}`);
}
