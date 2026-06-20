#!/usr/bin/env node
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const DEFAULT_CSV = "/Users/josuetecla/Downloads/produtos_854968.csv";
const DEFAULT_OUTPUT_DIR = path.join(projectRoot, "outputs", "produtos_854968");
const IMPORT_TAG = "IMPORT_PRODUTOS_854968";

const args = parseArgs(process.argv.slice(2));
const execute = Boolean(args.execute);
const checkDb = execute || Boolean(args["check-db"]);
const allowIncompleteStock = Boolean(args["allow-incomplete-stock"]);
const updateExisting = Boolean(args["update-existing"]);
const sourcePath = path.resolve(String(args.csv || DEFAULT_CSV));
const outputDir = path.resolve(String(args.output || DEFAULT_OUTPUT_DIR));
const categoryMapPath = path.join(outputDir, "mapa_produtos_categorias_854968.csv");

const today = new Date();
today.setHours(0, 0, 0, 0);

const rawText = await fs.readFile(sourcePath, "utf8");
const rawValues = parseCsv(rawText);

if (rawValues.length < 2) {
  throw new Error("CSV sem registros para importar.");
}

const headers = rawValues[0].map((value) => asText(value).replace(/^\uFEFF/, ""));
const records = rawValues
  .slice(1)
  .filter((row) => row.some((value) => asText(value)))
  .map((row, index) => {
    const object = Object.fromEntries(headers.map((header, column) => [header, row[column] ?? ""]));
    return { ...object, __sourceRow: index + 2 };
  });
const categoryMap = await loadCategoryMap(categoryMapPath);

const { candidates, stockEntries, issues } = buildImportPlan(records);
const plan = {
  importTag: IMPORT_TAG,
  sourcePath,
  generatedAt: new Date().toISOString(),
  mode: execute ? "execute" : "dry-run",
  options: { allowIncompleteStock, updateExisting, checkDb },
  summary: summarizePlan(candidates, stockEntries, issues),
  products: candidates.map((candidate) => ({
    key: candidate.key,
    action: "pending",
    sourceRows: candidate.rows.map((row) => row.__sourceRow),
    sourceCodes: candidate.codes,
    data: candidate.data,
    issues: candidate.issues,
  })),
  stockEntries: stockEntries.map((entry) => ({
    action: entry.ready ? "ready" : "pending",
    sourceRow: entry.sourceRow,
    productKey: entry.productKey,
    codigoProdutoLegado: entry.legacyCode,
    descricaoCadastro: entry.description,
    numeroLote: entry.numeroLote,
    validade: entry.validade ? dateToIso(entry.validade) : null,
    quantidade: entry.quantidade,
    custoUnitario: entry.custoUnitario,
    enderecoEstoque: entry.enderecoEstoque || null,
    codigoProdutoLegado: entry.codigoProdutoLegado || null,
    nomeProdutoOrigem: entry.nomeProdutoOrigem || null,
    fornecedorOrigem: entry.fornecedorOrigem || null,
    fornecedorLegadoId: entry.fornecedorLegadoId || null,
    marcaOrigem: entry.marcaOrigem || null,
    gtinOrigem: entry.gtinOrigem || null,
    unidadeOrigem: entry.unidadeOrigem || null,
    situacaoOrigem: entry.situacaoOrigem || null,
    observacoesOrigem: entry.observacoesOrigem || null,
    estoqueMinimoOrigem: entry.estoqueMinimoOrigem,
    estoqueMaximoOrigem: entry.estoqueMaximoOrigem,
    valorVendaOrigem: entry.valorVendaOrigem,
    valorCustoOrigem: entry.valorCustoOrigem,
    dadosOrigem: entry.dadosOrigem,
    issues: entry.issues,
  })),
  negativeStockRows: negativeStockRows(records),
  issues,
};

let dbResult = null;
let dbError = null;
if (checkDb) {
  let prisma = null;
  try {
    const { PrismaClient } = await import("@prisma/client");
    prisma = new PrismaClient();
    dbResult = execute
      ? await executeImport(prisma, candidates, stockEntries)
      : await checkDatabase(prisma, candidates, stockEntries);
    plan.database = dbResult;
  } catch (error) {
    dbError = error instanceof Error ? error.message : String(error);
    plan.databaseError = dbError;
    if (execute) process.exitCode = 1;
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(path.join(outputDir, "importacao_estoque_plano.json"), JSON.stringify(plan, null, 2));
await fs.writeFile(path.join(outputDir, "importacao_estoque_prontas.csv"), toCsv(readyStockRows(stockEntries)));
await fs.writeFile(path.join(outputDir, "importacao_estoque_pendencias.csv"), toCsv(pendingStockRows(stockEntries)));
await fs.writeFile(path.join(outputDir, "importacao_estoque_saldos_negativos.csv"), toCsv(negativeStockRowsCsv(records)));

printSummary(plan.summary, dbResult, dbError);
console.log("");
console.log(`Plano salvo em: ${path.join(outputDir, "importacao_estoque_plano.json")}`);
console.log(`Entradas prontas: ${path.join(outputDir, "importacao_estoque_prontas.csv")}`);
console.log(`Pendencias: ${path.join(outputDir, "importacao_estoque_pendencias.csv")}`);
console.log(`Saldos negativos: ${path.join(outputDir, "importacao_estoque_saldos_negativos.csv")}`);

if (!execute) {
  console.log("");
  console.log("Nada foi gravado. Para gravar no banco, rode com --execute.");
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      parsed[rawKey] = inlineValue;
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[rawKey] = next;
      index += 1;
    } else {
      parsed[rawKey] = true;
    }
  }
  return parsed;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}

async function loadCategoryMap(filePath) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    const rows = parseCsv(text);
    if (rows.length < 2) return { byCode: new Map(), byDescription: new Map(), count: 0 };

    const mapHeaders = rows[0].map((value) => asText(value).replace(/^\uFEFF/, ""));
    const entries = rows.slice(1)
      .filter((row) => row.some((value) => asText(value)))
      .map((row) => Object.fromEntries(mapHeaders.map((header, column) => [header, row[column] ?? ""])))
      .map((row) => ({
        codigo: asText(row.codigo),
        descricao: cleanDescription(row.descricao),
        macroCategoria: asText(row.macroCategoria),
        subcategoria: asText(row.subcategoria),
        categoriaId: parseInt(asText(row.categoriaId), 10) || null,
        categoriaLegadoId: asText(row.categoriaLegadoId),
        subcategoriaLegadoId: asText(row.subcategoriaLegadoId),
        ncm: onlyDigits(row.ncm),
      }));

    const byCode = new Map();
    const byDescription = new Map();
    for (const entry of entries) {
      if (entry.codigo) byCode.set(entry.codigo, entry);
      if (entry.descricao) byDescription.set(normalizeText(entry.descricao), entry);
    }
    return { byCode, byDescription, count: entries.length };
  } catch (error) {
    if (error?.code === "ENOENT") {
      console.warn(`Mapa de categorias nao encontrado em: ${filePath}`);
      return { byCode: new Map(), byDescription: new Map(), count: 0 };
    }
    throw error;
  }
}

function findCategoryMapping(codes, description) {
  for (const code of codes) {
    const mapped = categoryMap.byCode.get(code);
    if (mapped) return mapped;
  }
  return categoryMap.byDescription.get(normalizeText(description)) || null;
}

function buildImportPlan(sourceRecords) {
  const groups = new Map();
  for (const record of sourceRecords) {
    const description = cleanDescription(record["Nome do Produto (120)"]);
    const key = normalizeText(description) || `SEM_DESCRICAO_${record.__sourceRow}`;
    if (!groups.has(key)) groups.set(key, { key, description, rows: [] });
    groups.get(key).rows.push(record);
  }

  const barcodeGroups = new Map();
  for (const group of groups.values()) {
    for (const barcode of unique(group.rows.map((row) => onlyDigits(row["Codigo de Barras (GTIN-8,12,13,14)"] || row["Código de Barras (GTIN-8,12,13,14)"])))) {
      if (!barcodeGroups.has(barcode)) barcodeGroups.set(barcode, new Set());
      barcodeGroups.get(barcode).add(group.key);
    }
  }

  const candidates = [...groups.values()]
    .sort((a, b) => a.description.localeCompare(b.description, "pt-BR"))
    .map((group) => productCandidate(group, barcodeGroups));

  const candidateByKey = new Map(candidates.map((candidate) => [candidate.key, candidate]));
  const stockEntries = [];
  const issues = [];

  for (const record of sourceRecords) {
    const quantity = stockOf(record);
    if (quantity <= 0) continue;

    const description = cleanDescription(record["Nome do Produto (120)"]);
    const key = normalizeText(description) || `SEM_DESCRICAO_${record.__sourceRow}`;
    const candidate = candidateByKey.get(key);
    const validity = parseValidity(record["Nome do Produto (120)"]);
    const lot = parseLot(record["Nome do Produto (120)"]);
    const entryIssues = [];

    if (!candidate) entryIssues.push("produto mestre nao encontrado no plano");
    if (!lot) entryIssues.push("saldo positivo sem lote identificado");
    if (!validity) entryIssues.push("saldo positivo sem validade identificada");
    if (validity && validity < today) entryIssues.push("validade vencida; entrada bloqueada pelo ERP");

    const ready = allowIncompleteStock
      ? Boolean(candidate && quantity > 0 && (!validity || validity >= today))
      : Boolean(candidate && quantity > 0 && lot && validity && validity >= today);

    const marker = `${IMPORT_TAG}:linha=${record.__sourceRow}:codigo=${asText(record["Código do Produto (60)"])}`;
    stockEntries.push({
      productKey: key,
      sourceRow: record.__sourceRow,
      legacyCode: asText(record["Código do Produto (60)"]),
      description,
      numeroLote: lot,
      validade: validity,
      quantidade: quantity,
      custoUnitario: parsePtNumber(record["Valor Custo"]),
      enderecoEstoque: asText(record["Localização no Estoque"]),
      observation: [
        marker,
        `nomeOriginal=${asText(record["Nome do Produto (120)"])}`,
        `fornecedorLegado=${asText(record["Fornecedor"]) || asText(record["ID Fornecedor"])}`,
      ].filter(Boolean).join(" | "),
      marker,
      codigoProdutoLegado: asText(record["Código do Produto (60)"]),
      nomeProdutoOrigem: asText(record["Nome do Produto (120)"]),
      fornecedorOrigem: asText(record["Fornecedor"]),
      fornecedorLegadoId: asText(record["ID Fornecedor"]),
      marcaOrigem: asText(record["Marca (25)"]),
      gtinOrigem: onlyDigits(record["Código de Barras (GTIN-8,12,13,14)"]),
      unidadeOrigem: asText(record["Unidade (06)"]),
      situacaoOrigem: asText(record["Situação (Ativo/Inativo)"]),
      observacoesOrigem: asText(record["Observações"]),
      estoqueMinimoOrigem: parsePtNumber(record["Estoque Mínimo"]),
      estoqueMaximoOrigem: parsePtNumber(record["Estoque Máximo"]),
      valorVendaOrigem: parsePtNumber(record["Valor Venda (Tabela Padrão)"]),
      valorCustoOrigem: parsePtNumber(record["Valor Custo"]),
      dadosOrigem: sourceSnapshot(record),
      ready,
      issues: entryIssues,
    });

    if (entryIssues.length) {
      issues.push({
        type: "stock",
        sourceRow: record.__sourceRow,
        codigoProdutoLegado: asText(record["Código do Produto (60)"]),
        description,
        issues: entryIssues,
      });
    }
  }

  return { candidates, stockEntries, issues };
}

function productCandidate(group, barcodeGroups) {
  const sorted = [...group.rows].sort((a, b) => scoreRecord(b) - scoreRecord(a));
  const preferred = sorted[0];
  const codes = unique(group.rows.map((row) => row["Código do Produto (60)"]));
  const mappedCategory = findCategoryMapping(codes, group.description);
  const barcodes = unique(group.rows.map((row) => onlyDigits(row["Código de Barras (GTIN-8,12,13,14)"])));
  const validBarcodes = barcodes.filter((barcode) => [8, 12, 13, 14].includes(barcode.length));
  const brands = unique(group.rows.map((row) => row["Marca (25)"]));
  const packages = unique(group.rows.map((row) => row["Unidade (06)"]));
  const packageInfo = parsePackage(preferred["Unidade (06)"]);
  const concentration = parseConcentration(preferred["Tamanho"]);
  const ncmValues = unique(group.rows.map((row) => onlyDigits(row["NCM (8)"])));
  const validNcm = ncmValues.filter((ncm) => ncm.length === 8);
  const originValues = unique(group.rows.map((row) => row["Origem (0 a 8)"]));
  const taxUnitValues = unique(group.rows.map((row) => row["Unidade tributável"]));
  const locations = unique(group.rows.map((row) => row["Localização no Estoque"]));
  const types = unique(group.rows.map((row) => row["Tipo (Produto/Servico)"]));
  const produtoVariadoValues = unique(group.rows.map((row) => normalizeText(row["Produto Variado (Sim/Não)"])));
  const benefitValues = unique(group.rows.map((row) => row["Código Benefício Fiscal"]));
  const cestValues = unique(group.rows.map((row) => onlyDigits(row["Código CEST"])));
  const fiscalClassValues = unique(group.rows.map((row) => row["Tipo Class. (Fiscal)"]));
  const observations = unique(group.rows.map((row) => row["Observações"]));
  const categoryIds = unique(group.rows.map((row) => row["ID Categoria"]));
  const subcategoryIds = unique(group.rows.map((row) => row["ID Subcategoria"]));
  const orderNumbers = unique(group.rows.map((row) => row["Numero da ordem"]));
  const costValues = unique(group.rows.map((row) => parsePtNumber(row["Valor Custo"])).filter((value) => value > 0));
  const saleValues = unique(group.rows.map((row) => parsePtNumber(row["Valor Venda (Tabela Padrão)"])).filter((value) => value > 0));
  const positiveRows = group.rows.filter((row) => stockOf(row) > 0);
  const issues = [];

  if (codes.length > 1) issues.push("varios codigos legados consolidados em um produto");
  if (validBarcodes.length === 0) issues.push("GTIN ausente ou invalido");
  if (validBarcodes.length === 1 && (barcodeGroups.get(validBarcodes[0])?.size ?? 0) > 1) issues.push("GTIN repetido em produtos distintos");
  if (validBarcodes.length > 1) issues.push("mais de um GTIN no mesmo produto");
  if (brands.length > 1) issues.push("marca divergente entre registros consolidados");
  if (packages.length > 1) issues.push("unidade/embalagem divergente");
  if (validNcm.length !== 1) issues.push("NCM ausente, invalido ou divergente");
  if (costValues.length > 1) issues.push("custo divergente entre lotes");
  if (saleValues.length > 1) issues.push("preco de venda divergente entre lotes");

  const hasLot = group.rows.some((row) => Boolean(parseLot(row["Nome do Produto (120)"])));
  const hasValidity = group.rows.some((row) => Boolean(parseValidity(row["Nome do Produto (120)"])));
  const active = group.rows.some(isActive) || positiveRows.length > 0;
  const barcode = validBarcodes.length === 1 ? validBarcodes[0] : null;
  const marca = brands.length === 1 ? brands[0] : asText(preferred["Marca (25)"]) || null;
  const ncm = validNcm.length === 1 ? validNcm[0] : null;

  return {
    key: group.key,
    rows: group.rows,
    codes,
    issues,
    data: cleanObject({
      codigoInterno: asText(preferred["Código do Produto (60)"]) || null,
      codigoBarras: barcode,
      descricao: group.description,
      categoria: mappedCategory?.subcategoria || mappedCategory?.macroCategoria || null,
      fabricante: null,
      unidadeVenda: packageInfo.saleUnit || "UN",
      unidadeCompra: packageInfo.purchaseUnit || null,
      fatorConversao: packageInfo.factor || 1,
      registroAnvisa: null,
      temperaturaArmazenamento: null,
      controlaValidade: hasValidity,
      controlaLote: hasLot,
      precoCustoBase: parsePtNumber(preferred["Valor Custo"]),
      precoVendaBase: parsePtNumber(preferred["Valor Venda (Tabela Padrão)"]),
      ativo: active,
      estoqueMinimo: Math.max(...group.rows.map((row) => parsePtNumber(row["Estoque Mínimo"])), 0),
      estoqueMaximo: Math.max(...group.rows.map((row) => parsePtNumber(row["Estoque Máximo"])), 0) || null,
      tipoItem: types.length === 1 ? types[0] : asText(preferred["Tipo (Produto/Servico)"]) || null,
      produtoVariado: produtoVariadoValues.includes("SIM"),
      pesoBruto: parsePtNumber(preferred["Peso"]) || null,
      pesoLiquido: parsePtNumber(preferred["Peso Liq."]) || null,
      observacoes: observations.join(" | ") || null,
      numeroOrdem: orderNumbers.length === 1 ? orderNumbers[0] : null,
      tamanho: asText(preferred["Tamanho"]) || null,
      categoriaLegadoId: mappedCategory?.categoriaLegadoId || categoryIds.join(" | ") || null,
      subcategoriaLegadoId: mappedCategory?.subcategoriaLegadoId || subcategoryIds.join(" | ") || null,
      dadosOrigem: {
        fonte: "produtos_854968.csv",
        linhasFonte: group.rows.map((row) => row.__sourceRow),
        registros: group.rows.map(sourceSnapshot),
      },
      cnpjFabricante: null,
      classeRisco: null,
      codigoFabricante: null,
      apresentacao: inferPresentation(preferred["Unidade (06)"], group.description),
      concentracaoValor: concentration.value,
      concentracaoUnidade: concentration.unit || null,
      principioAtivo: null,
      marca,
      conteudoEmbalagem: packageInfo.content,
      localizacaoEstoque: locations.length === 1 ? locations[0] : null,
      pontoReposicao: null,
      categoriaId: mappedCategory?.categoriaId || null,
      ncm: ncm || mappedCategory?.ncm || null,
      cfop: null,
      cst: null,
      csosn: null,
      origemMercadoria: originValues.length === 1 ? originValues[0] : null,
      unidadeFiscal: taxUnitValues.length === 1 ? taxUnitValues[0] : (packageInfo.saleUnit || "UN"),
      aliquotaIcms: parsePtNumber(preferred["ICMS"]),
      aliquotaIpi: parsePtNumber(preferred["IPI"]),
      aliquotaPis: parsePtNumber(preferred["PIS"]),
      aliquotaCofins: parsePtNumber(preferred["COFINS"]),
      codigoBeneficioFiscal: benefitValues.length === 1 ? benefitValues[0] : null,
      cest: cestValues.length === 1 ? cestValues[0] : null,
      tipoClassificacaoFiscal: fiscalClassValues.length === 1 ? fiscalClassValues[0] : null,
    }),
  };
}

async function checkDatabase(prisma, candidates, stockEntries) {
  const existingProducts = [];
  for (const candidate of candidates) {
    const product = await findExistingProduct(prisma, candidate);
    if (product) existingProducts.push({ key: candidate.key, id: product.id, descricao: product.descricao });
  }

  const existingMovements = [];
  for (const entry of stockEntries.filter((item) => item.ready)) {
    const product = await findExistingProduct(prisma, candidates.find((candidate) => candidate.key === entry.productKey));
    if (!product) continue;
    const movement = await prisma.movimentacaoEstoque.findFirst({
      where: {
        produtoId: product.id,
        tipo: "ENTRADA",
        observacao: { contains: entry.marker },
      },
      select: { id: true, produtoId: true, quantidade: true, observacao: true },
    });
    if (movement) existingMovements.push({ sourceRow: entry.sourceRow, movementId: movement.id });
  }

  return {
    existingProducts: existingProducts.length,
    existingMovements: existingMovements.length,
    existingProductSamples: existingProducts.slice(0, 10),
    existingMovementSamples: existingMovements.slice(0, 10),
  };
}

async function executeImport(prisma, candidates, stockEntries) {
  const productByKey = new Map();
  const productStats = { created: 0, reused: 0, updated: 0 };

  for (const candidate of candidates) {
    const existing = await findExistingProduct(prisma, candidate);
    if (existing) {
      productByKey.set(candidate.key, existing);
      productStats.reused += 1;
      if (updateExisting) {
        const updated = await prisma.produto.update({
          where: { id: existing.id },
          data: candidate.data,
        });
        productByKey.set(candidate.key, updated);
        productStats.updated += 1;
      }
      continue;
    }

    const created = await prisma.produto.create({ data: candidate.data });
    productByKey.set(candidate.key, created);
    productStats.created += 1;
  }

  const stockStats = { created: 0, skippedPending: 0, skippedExisting: 0, errors: [] };
  for (const entry of stockEntries) {
    if (!entry.ready) {
      stockStats.skippedPending += 1;
      continue;
    }

    const product = productByKey.get(entry.productKey);
    if (!product) {
      stockStats.errors.push({ sourceRow: entry.sourceRow, error: "produto nao localizado apos cadastro" });
      continue;
    }

    const existingMovement = await prisma.movimentacaoEstoque.findFirst({
      where: {
        produtoId: product.id,
        tipo: "ENTRADA",
        observacao: { contains: entry.marker },
      },
      select: { id: true },
    });

    if (existingMovement) {
      stockStats.skippedExisting += 1;
      continue;
    }

    try {
      await registerStockEntry(prisma, {
        produtoId: product.id,
        quantidade: entry.quantidade,
        numeroLote: entry.numeroLote || undefined,
        validade: entry.validade || undefined,
        custoUnitario: entry.custoUnitario || undefined,
        enderecoEstoque: entry.enderecoEstoque || undefined,
        codigoProdutoLegado: entry.codigoProdutoLegado || undefined,
        nomeProdutoOrigem: entry.nomeProdutoOrigem || undefined,
        fornecedorOrigem: entry.fornecedorOrigem || undefined,
        fornecedorLegadoId: entry.fornecedorLegadoId || undefined,
        marcaOrigem: entry.marcaOrigem || undefined,
        gtinOrigem: entry.gtinOrigem || undefined,
        unidadeOrigem: entry.unidadeOrigem || undefined,
        situacaoOrigem: entry.situacaoOrigem || undefined,
        observacoesOrigem: entry.observacoesOrigem || undefined,
        estoqueMinimoOrigem: entry.estoqueMinimoOrigem,
        estoqueMaximoOrigem: entry.estoqueMaximoOrigem,
        valorVendaOrigem: entry.valorVendaOrigem,
        valorCustoOrigem: entry.valorCustoOrigem,
        linhaFonteOrigem: entry.sourceRow,
        fonteImportacao: IMPORT_TAG,
        dadosOrigem: entry.dadosOrigem,
        observacao: entry.observation,
      });
      stockStats.created += 1;
    } catch (error) {
      stockStats.errors.push({
        sourceRow: entry.sourceRow,
        productId: product.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { products: productStats, stock: stockStats };
}

async function findExistingProduct(prisma, candidate) {
  if (!candidate) return null;
  const codeFilters = candidate.codes.map((code) => ({ codigoInterno: code }));
  const filters = [
    ...codeFilters,
    { descricao: candidate.data.descricao },
  ];
  if (candidate.data.codigoBarras) {
    filters.push({ codigoBarras: candidate.data.codigoBarras, descricao: candidate.data.descricao });
  }
  return prisma.produto.findFirst({
    where: { OR: filters },
    orderBy: { id: "asc" },
  });
}

async function registerStockEntry(prisma, data) {
  if (data.validade) {
    const validity = new Date(data.validade);
    validity.setHours(0, 0, 0, 0);
    if (validity < today) {
      throw new Error(`Lote ${data.numeroLote || ""} com validade vencida.`);
    }
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.produto.findUnique({ where: { id: data.produtoId } });
    if (!product) throw new Error("Produto nao encontrado.");
    if (product.controlaLote && !data.numeroLote) throw new Error("Lote obrigatorio para este produto.");
    if (product.controlaValidade && !data.validade) throw new Error("Validade obrigatoria para este produto.");

    let loteId = null;
    if (data.numeroLote) {
      const lote = await tx.lote.upsert({
        where: {
          numeroLote_produtoId: {
            numeroLote: data.numeroLote,
            produtoId: data.produtoId,
          },
        },
        update: {
          validade: data.validade,
          enderecoEstoque: data.enderecoEstoque,
          status: "DISPONIVEL",
          precoCusto: data.custoUnitario,
          codigoProdutoLegado: data.codigoProdutoLegado,
          nomeProdutoOrigem: data.nomeProdutoOrigem,
          fornecedorOrigem: data.fornecedorOrigem,
          fornecedorLegadoId: data.fornecedorLegadoId,
          marcaOrigem: data.marcaOrigem,
          gtinOrigem: data.gtinOrigem,
          unidadeOrigem: data.unidadeOrigem,
          situacaoOrigem: data.situacaoOrigem,
          observacoesOrigem: data.observacoesOrigem,
          estoqueMinimoOrigem: data.estoqueMinimoOrigem,
          estoqueMaximoOrigem: data.estoqueMaximoOrigem,
          valorVendaOrigem: data.valorVendaOrigem,
          valorCustoOrigem: data.valorCustoOrigem,
          linhaFonteOrigem: data.linhaFonteOrigem,
          dadosOrigem: data.dadosOrigem,
        },
        create: {
          numeroLote: data.numeroLote,
          validade: data.validade,
          produtoId: data.produtoId,
          enderecoEstoque: data.enderecoEstoque,
          status: "DISPONIVEL",
          precoCusto: data.custoUnitario,
          codigoProdutoLegado: data.codigoProdutoLegado,
          nomeProdutoOrigem: data.nomeProdutoOrigem,
          fornecedorOrigem: data.fornecedorOrigem,
          fornecedorLegadoId: data.fornecedorLegadoId,
          marcaOrigem: data.marcaOrigem,
          gtinOrigem: data.gtinOrigem,
          unidadeOrigem: data.unidadeOrigem,
          situacaoOrigem: data.situacaoOrigem,
          observacoesOrigem: data.observacoesOrigem,
          estoqueMinimoOrigem: data.estoqueMinimoOrigem,
          estoqueMaximoOrigem: data.estoqueMaximoOrigem,
          valorVendaOrigem: data.valorVendaOrigem,
          valorCustoOrigem: data.valorCustoOrigem,
          linhaFonteOrigem: data.linhaFonteOrigem,
          dadosOrigem: data.dadosOrigem,
        },
      });
      loteId = lote.id;
    }

    const movement = await tx.movimentacaoEstoque.create({
      data: {
        produtoId: data.produtoId,
        loteId,
        tipo: "ENTRADA",
        quantidade: data.quantidade,
        observacao: data.observacao || "Entrada importada",
        origem: "Importacao CSV produtos_854968",
        fonteImportacao: data.fonteImportacao,
        linhaFonteOrigem: data.linhaFonteOrigem,
        codigoProdutoLegado: data.codigoProdutoLegado,
        dadosOrigem: data.dadosOrigem,
      },
    });

    const currentStock = await tx.estoqueAtual.findFirst({
      where: {
        produtoId: data.produtoId,
        loteId,
        localizacaoId: null,
      },
    });

    if (currentStock) {
      await tx.estoqueAtual.update({
        where: { id: currentStock.id },
        data: {
          quantidadeDisponivel: { increment: data.quantidade },
          custoUnitario: data.custoUnitario || currentStock.custoUnitario,
          status: "DISPONIVEL",
        },
      });
    } else {
      await tx.estoqueAtual.create({
        data: {
          produtoId: data.produtoId,
          loteId,
          quantidadeDisponivel: data.quantidade,
          custoUnitario: data.custoUnitario || 0,
          status: "DISPONIVEL",
        },
      });
    }

    return movement;
  });
}

function summarizePlan(candidates, stockEntries, issues) {
  const readyEntries = stockEntries.filter((entry) => entry.ready);
  const pendingEntries = stockEntries.filter((entry) => !entry.ready);
  const stockValues = records.map(stockOf);
  const negativeValues = stockValues.filter((value) => value < 0);
  return {
    sourceRows: records.length,
    productsToCreateOrReuse: candidates.length,
    productRowsWithIssues: candidates.filter((candidate) => candidate.issues.length).length,
    positiveStockRows: stockEntries.length,
    readyStockEntries: readyEntries.length,
    pendingStockEntries: pendingEntries.length,
    readyStockQuantity: sum(readyEntries.map((entry) => entry.quantidade)),
    pendingStockQuantity: sum(pendingEntries.map((entry) => entry.quantidade)),
    positiveStockQuantity: sum(stockEntries.map((entry) => entry.quantidade)),
    negativeStockRows: negativeValues.length,
    negativeStockQuantity: sum(negativeValues),
    netStockQuantity: sum(stockValues),
    issueCount: issues.length,
  };
}

function printSummary(summary, dbResult, dbError) {
  console.log("Importacao de produtos e estoque - produtos_854968.csv");
  console.log("------------------------------------------------------");
  console.log(`Linhas lidas: ${summary.sourceRows}`);
  console.log(`Produtos mestres: ${summary.productsToCreateOrReuse}`);
  console.log(`Linhas com estoque positivo: ${summary.positiveStockRows}`);
  console.log(`Entradas de estoque prontas: ${summary.readyStockEntries}`);
  console.log(`Entradas pendentes: ${summary.pendingStockEntries}`);
  console.log(`Quantidade positiva pronta: ${formatNumber(summary.readyStockQuantity)}`);
  console.log(`Quantidade positiva pendente: ${formatNumber(summary.pendingStockQuantity)}`);
  console.log(`Quantidade positiva total: ${formatNumber(summary.positiveStockQuantity)}`);
  console.log(`Linhas com saldo negativo: ${summary.negativeStockRows}`);
  console.log(`Saldo negativo total: ${formatNumber(summary.negativeStockQuantity)}`);
  console.log(`Saldo liquido do CSV: ${formatNumber(summary.netStockQuantity)}`);

  if (dbResult) {
    console.log("");
    console.log("Banco de dados:");
    console.log(JSON.stringify(dbResult, null, 2));
  }

  if (dbError) {
    console.log("");
    console.log("Banco de dados: nao foi possivel conectar.");
    console.log(dbError.split("\n").filter(Boolean).slice(-2).join("\n"));
  }
}

function readyStockRows(stockEntries) {
  return [
    ["linhaFonte", "codigoProdutoLegado", "descricaoCadastro", "numeroLote", "validade", "quantidade", "custoUnitario", "observacao"],
    ...stockEntries.filter((entry) => entry.ready).map((entry) => [
      entry.sourceRow,
      entry.legacyCode,
      entry.description,
      entry.numeroLote,
      entry.validade ? dateToIso(entry.validade) : "",
      entry.quantidade,
      entry.custoUnitario,
      entry.observation,
    ]),
  ];
}

function pendingStockRows(stockEntries) {
  return [
    ["linhaFonte", "codigoProdutoLegado", "descricaoCadastro", "numeroLote", "validade", "quantidade", "custoUnitario", "pendencias"],
    ...stockEntries.filter((entry) => !entry.ready).map((entry) => [
      entry.sourceRow,
      entry.legacyCode,
      entry.description,
      entry.numeroLote,
      entry.validade ? dateToIso(entry.validade) : "",
      entry.quantidade,
      entry.custoUnitario,
      entry.issues.join("; "),
    ]),
  ];
}

function negativeStockRows(sourceRecords) {
  return sourceRecords
    .filter((record) => stockOf(record) < 0)
    .map((record) => ({
      sourceRow: record.__sourceRow,
      codigoProdutoLegado: asText(record["Código do Produto (60)"]),
      nomeOriginal: asText(record["Nome do Produto (120)"]),
      quantidade: stockOf(record),
      motivo: "saldo negativo no sistema anterior; nao pode virar entrada de estoque",
    }));
}

function negativeStockRowsCsv(sourceRecords) {
  return [
    ["linhaFonte", "codigoProdutoLegado", "nomeOriginal", "quantidade", "motivo"],
    ...negativeStockRows(sourceRecords).map((row) => [
      row.sourceRow,
      row.codigoProdutoLegado,
      row.nomeOriginal,
      row.quantidade,
      row.motivo,
    ]),
  ];
}

function toCsv(rows) {
  return rows.map((row) => row.map((value) => {
    const text = asText(value);
    return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }).join(",")).join("\n") + "\n";
}

function cleanObject(object) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, value === "" ? null : value]));
}

function sourceSnapshot(record) {
  return Object.fromEntries(
    headers.map((header) => [header, asText(record[header])])
  );
}

function asText(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function normalizeText(value) {
  return asText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function onlyDigits(value) {
  return asText(value).replace(/\D/g, "");
}

function parsePtNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = asText(value).replace(/\s/g, "");
  if (!text) return 0;
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function unique(values) {
  return [...new Set(values.map(asText).filter(Boolean))];
}

function cleanDescription(value) {
  let text = asText(value).replace(/\s+/g, " ").trim();
  const marker = /\s+(?:-|–)?\s*\b(?:LT|LOTE|VL|VAL|VALIDADE|VENC|VTO)\.?\s*[:\-]?/i.exec(text);
  if (marker) text = text.slice(0, marker.index);
  return text.replace(/[\s\-–]+$/g, "").trim();
}

function parseLot(description) {
  const match = /\b(?:LT|LOTE)\.?\s*[:\-]?\s*([A-Z0-9][A-Z0-9./_-]*)/i.exec(asText(description));
  return match ? match[1].toUpperCase() : "";
}

function parseValidity(description) {
  const match = /\b(?:VL|VAL|VALIDADE|VENC|VTO)\.?\s*[:\-]?\s*(0?[1-9]|1[0-2])[\/.\-](\d{2}|\d{4})/i.exec(asText(description));
  if (!match) return null;
  const month = Number(match[1]);
  let year = Number(match[2]);
  if (year < 100) year += 2000;
  return new Date(year, month, 0);
}

function parsePackage(value) {
  const text = normalizeText(value).replace(/\s/g, "");
  if (!text) return { purchaseUnit: null, saleUnit: "UN", factor: 1, content: null };
  const match = /^([A-ZÇ]+)[\/-](\d+)$/.exec(text);
  if (!match) {
    return { purchaseUnit: text.slice(0, 6), saleUnit: text.slice(0, 6), factor: 1, content: null };
  }
  const purchaseUnit = match[1] === "AP" ? "AMP" : match[1];
  const content = Number(match[2]);
  return { purchaseUnit, saleUnit: "UN", factor: content || 1, content: content || null };
}

function packageCountInDescription(description) {
  const match = /\b(?:CX|CAIXA)[\/-](\d+)\b/i.exec(asText(description));
  return match ? Number(match[1]) : null;
}

function inferPresentation(unit, description) {
  const unitText = normalizeText(unit);
  const descriptionText = normalizeText(description);
  if (/^(AMP|AP)/.test(unitText) || /\bAMPOLA\b/.test(descriptionText)) return "AMPOLA";
  if (/^FR/.test(unitText) || /\bFRASCO\b/.test(descriptionText)) return "FRASCO";
  if (/^CX/.test(unitText) || /\bCAIXA\b/.test(descriptionText)) return "CAIXA";
  if (/^SCH|SACHE/.test(unitText) || /\bSACHE\b/.test(descriptionText)) return "SACHE";
  if (/^BOL/.test(unitText) || /\bBOLSA\b/.test(descriptionText)) return "BOLSA";
  if (/^SER/.test(unitText) || /\bSERINGA\b/.test(descriptionText)) return "SERINGA";
  if (/^TB|TUB/.test(unitText) || /\bTUBO\b/.test(descriptionText)) return "TUBO";
  if (/^BLIST/.test(unitText) || /\bBLISTER\b/.test(descriptionText)) return "BLISTER";
  if (/^UN/.test(unitText)) return "UNIDADE";
  return "OUTRA";
}

function parseConcentration(size) {
  const text = normalizeText(size).replace(/\s+/g, "");
  const match = /^(\d+(?:[.,]\d+)?)(.+)$/.exec(text);
  if (!match) return { value: null, unit: text || null };
  return { value: parsePtNumber(match[1]), unit: match[2].slice(0, 40) };
}

function isActive(record) {
  return normalizeText(record["Situação (Ativo/Inativo)"]) === "ATIVO";
}

function stockOf(record) {
  return parsePtNumber(record["Estoque Atual"]);
}

function scoreRecord(record) {
  const expected = packageCountInDescription(cleanDescription(record["Nome do Produto (120)"]));
  const actual = parsePackage(record["Unidade (06)"]).content;
  return (
    (isActive(record) ? 100 : 0)
    + (stockOf(record) > 0 ? 50 : 0)
    + (expected && actual === expected ? 20 : 0)
    + (parsePtNumber(record["Valor Custo"]) > 0 ? 10 : 0)
    + (parsePtNumber(record["Valor Venda (Tabela Padrão)"]) > 0 ? 5 : 0)
  );
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function dateToIso(date) {
  return date.toISOString().slice(0, 10);
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}
