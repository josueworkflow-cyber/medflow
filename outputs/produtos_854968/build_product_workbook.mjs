import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const sourcePath = "/Users/josuetecla/Downloads/produtos_854968.csv";
const outputDir = "/Users/josuetecla/Documents/ERP MEDFLOW/outputs/produtos_854968";
const outputPath = path.join(outputDir, "produtos_organizados_para_cadastro.xlsx");
const parsedJsonPath = path.join(outputDir, "fonte_csv_preservada.json");
const pythonPath = "/Users/josuetecla/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";

const execFileAsync = promisify(execFile);
const parserCode = [
  "import csv, json, sys",
  "with open(sys.argv[1], 'r', encoding='utf-8-sig', newline='') as f:",
  "    rows = list(csv.reader(f))",
  "print(json.dumps(rows, ensure_ascii=False))"
].join("\n");
const parsedCsv = await execFileAsync(pythonPath, ["-c", parserCode, sourcePath], { maxBuffer: 20 * 1024 * 1024 });
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(parsedJsonPath, parsedCsv.stdout);
const rawValues = JSON.parse(parsedCsv.stdout);

if (!rawValues || rawValues.length < 2) {
  throw new Error("O CSV não contém registros para organizar.");
}

const sourceHeaders = rawValues[0].map((value) => String(value ?? "").trim());
const rawRows = rawValues.slice(1).filter((row) => row.some((value) => value !== null && value !== ""));

const asText = (value) => (value === null || value === undefined ? "" : String(value).trim());
const normalizeText = (value) => asText(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toUpperCase()
  .replace(/\s+/g, " ")
  .trim();
const onlyDigits = (value) => asText(value).replace(/\D/g, "");
const parsePtNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = asText(value).replace(/\s/g, "");
  if (!text) return 0;
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
};
const unique = (values) => [...new Set(values.map(asText).filter(Boolean))];
const lastDayOfMonth = (month, year) => new Date(year, month, 0);
const colLetter = (index) => {
  let n = index + 1;
  let result = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
};

const records = rawRows.map((row, index) => {
  const object = Object.fromEntries(sourceHeaders.map((header, column) => [header, row[column] ?? ""]));
  return { ...object, __sourceRow: index + 2 };
});

const cleanDescription = (value) => {
  let text = asText(value).replace(/\s+/g, " ").trim();
  const marker = /\s+(?:-|–)?\s*\b(?:LT|LOTE|VL|VAL|VALIDADE|VENC|VTO)\.?\s*[:\-]?/i.exec(text);
  if (marker) text = text.slice(0, marker.index);
  return text.replace(/[\s\-–]+$/g, "").trim();
};

const parseLot = (description) => {
  const match = /\b(?:LT|LOTE)\.?\s*[:\-]?\s*([A-Z0-9][A-Z0-9./_-]*)/i.exec(asText(description));
  return match ? match[1].toUpperCase() : "";
};

const parseValidity = (description) => {
  const match = /\b(?:VL|VAL|VALIDADE|VENC|VTO)\.?\s*[:\-]?\s*(0?[1-9]|1[0-2])[\/.\-](\d{2}|\d{4})/i.exec(asText(description));
  if (!match) return null;
  const month = Number(match[1]);
  let year = Number(match[2]);
  if (year < 100) year += 2000;
  return lastDayOfMonth(month, year);
};

const parsePackage = (value) => {
  const text = normalizeText(value).replace(/\s/g, "");
  if (!text) return { purchaseUnit: "", saleUnit: "UN", factor: 1, content: null, inferred: false };
  const match = /^([A-ZÇ]+)[\/-](\d+)$/.exec(text);
  if (!match) {
    return { purchaseUnit: text.slice(0, 6), saleUnit: text.slice(0, 6), factor: 1, content: null, inferred: false };
  }
  const purchaseUnit = match[1] === "AP" ? "AMP" : match[1];
  const content = Number(match[2]);
  return { purchaseUnit, saleUnit: "UN", factor: content || 1, content: content || null, inferred: true };
};

const packageCountInDescription = (description) => {
  const match = /\b(?:CX|CAIXA)[\/-](\d+)\b/i.exec(asText(description));
  return match ? Number(match[1]) : null;
};

const inferPresentation = (unit, description) => {
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
};

const parseConcentration = (size) => {
  const text = normalizeText(size).replace(/\s+/g, "");
  const match = /^(\d+(?:[.,]\d+)?)(.+)$/.exec(text);
  if (!match) return { value: null, unit: text };
  return { value: parsePtNumber(match[1]), unit: match[2].slice(0, 40) };
};

const isActive = (record) => normalizeText(record["Situação (Ativo/Inativo)"]) === "ATIVO";
const stockOf = (record) => parsePtNumber(record["Estoque Atual"]);
const scoreRecord = (record) => (
  (isActive(record) ? 100 : 0)
  + (stockOf(record) > 0 ? 50 : 0)
  + (() => {
    const expected = packageCountInDescription(cleanDescription(record["Nome do Produto (120)"]));
    const actual = parsePackage(record["Unidade (06)"]).content;
    return expected && actual === expected ? 20 : 0;
  })()
  + (parsePtNumber(record["Valor Custo"]) > 0 ? 10 : 0)
  + (parsePtNumber(record["Valor Venda (Tabela Padrão)"]) > 0 ? 5 : 0)
);

const groups = new Map();
for (const record of records) {
  const description = cleanDescription(record["Nome do Produto (120)"]);
  const key = normalizeText(description) || `SEM_DESCRICAO_${record.__sourceRow}`;
  if (!groups.has(key)) groups.set(key, { key, description, rows: [] });
  groups.get(key).rows.push(record);
}

const groupList = [...groups.values()].sort((a, b) => a.description.localeCompare(b.description, "pt-BR"));
const barcodeGroups = new Map();
for (const group of groupList) {
  for (const barcode of unique(group.rows.map((row) => onlyDigits(row["Código de Barras (GTIN-8,12,13,14)"])))) {
    if (!barcodeGroups.has(barcode)) barcodeGroups.set(barcode, new Set());
    barcodeGroups.get(barcode).add(group.key);
  }
}

const cadastroHeaders = [
  "codigoInterno", "codigoBarras", "descricao", "categoria", "fabricante", "unidadeVenda",
  "unidadeCompra", "fatorConversao", "registroAnvisa", "temperaturaArmazenamento",
  "controlaValidade", "controlaLote", "precoCustoBase", "precoVendaBase", "estoqueMinimo",
  "cnpjFabricante", "classeRisco", "codigoFabricante", "apresentacao", "concentracaoValor",
  "concentracaoUnidade", "principioAtivo", "marca", "conteudoEmbalagem", "localizacaoEstoque",
  "pontoReposicao", "categoriaId", "ncm", "cfop", "cst", "csosn", "origemMercadoria",
  "unidadeFiscal", "aliquotaIcms", "aliquotaIpi", "aliquotaPis", "aliquotaCofins", "ativo",
  "Status_Importacao", "Pendencias", "Codigos_Legado", "IDs_Categoria_Legado",
  "IDs_Subcategoria_Legado", "Quantidade_Registros_Fonte", "Estoque_Fonte_Consolidado",
  "Estoque_Maximo_Legado", "Fornecedores_Legado", "Observacoes_Fonte", "Tipo_Fonte", "GTINs_Fonte"
];

const candidates = groupList.map((group) => {
  const sorted = [...group.rows].sort((a, b) => scoreRecord(b) - scoreRecord(a));
  const preferred = sorted[0];
  const codes = unique(group.rows.map((row) => row["Código do Produto (60)"]));
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
  const categoryIds = unique(group.rows.map((row) => row["ID Categoria"]));
  const subcategoryIds = unique(group.rows.map((row) => row["ID Subcategoria"]));
  const suppliers = unique(group.rows.flatMap((row) => [row["Fornecedor"], row["ID Fornecedor"]]));
  const observations = unique(group.rows.map((row) => row["Observações"]));
  const types = unique(group.rows.map((row) => row["Tipo (Produto/Servico)"]));
  const costValues = unique(group.rows.map((row) => parsePtNumber(row["Valor Custo"])).filter((value) => value > 0));
  const saleValues = unique(group.rows.map((row) => parsePtNumber(row["Valor Venda (Tabela Padrão)"])).filter((value) => value > 0));
  const icmsValues = unique(group.rows.map((row) => parsePtNumber(row["ICMS"])));
  const ipiValues = unique(group.rows.map((row) => parsePtNumber(row["IPI"])));
  const pisValues = unique(group.rows.map((row) => parsePtNumber(row["PIS"])));
  const cofinsValues = unique(group.rows.map((row) => parsePtNumber(row["COFINS"])));
  const hasLot = group.rows.some((row) => Boolean(parseLot(row["Nome do Produto (120)"])));
  const hasValidity = group.rows.some((row) => Boolean(parseValidity(row["Nome do Produto (120)"])));
  const issues = [];

  if (codes.length > 1) issues.push("confirmar código interno após consolidar lotes");
  if (barcodes.length > 1) issues.push("há mais de um GTIN no mesmo produto");
  if (validBarcodes.length === 1 && (barcodeGroups.get(validBarcodes[0])?.size ?? 0) > 1) issues.push("GTIN repetido em produtos distintos");
  if (validBarcodes.length === 0) issues.push("GTIN ausente ou inválido; confirmar SEM GTIN");
  if (brands.length > 1) issues.push("marca divergente entre registros consolidados");
  if (packages.length > 1) issues.push("unidade/embalagem divergente");
  if (packageInfo.inferred) issues.push("confirmar unidade de venda e fator de conversão sugeridos");
  const packageInDescription = packageCountInDescription(group.description);
  if (packageInDescription && packageInfo.content && packageInDescription !== packageInfo.content) issues.push("quantidade da embalagem diverge entre descrição e unidade original");
  if (validNcm.length !== 1) issues.push("NCM ausente, inválido ou divergente");
  if (categoryIds.length > 0) issues.push("mapear categoria legada para categoriaId do ERP");
  else issues.push("definir categoria do ERP");
  if (costValues.length > 1) issues.push("custo divergente entre lotes");
  if (saleValues.length > 1) issues.push("preço de venda divergente entre lotes");
  if (types.some((type) => normalizeText(type) !== "PRODUTO")) issues.push("tipo serviço não é suportado pelo cadastro atual");

  const active = group.rows.some(isActive) || group.rows.some((row) => stockOf(row) > 0);
  const barcode = validBarcodes.length === 1 ? validBarcodes[0] : "";
  const marca = brands.length === 1 ? brands[0] : asText(preferred["Marca (25)"]);
  const ncm = validNcm.length === 1 ? validNcm[0] : "";
  const unitFiscal = taxUnitValues.length === 1 ? taxUnitValues[0] : packageInfo.saleUnit || "UN";
  const codigoInterno = asText(preferred["Código do Produto (60)"]);

  const values = [
    codigoInterno, barcode, group.description, "", "", packageInfo.saleUnit || "UN",
    packageInfo.purchaseUnit || "", packageInfo.factor, "", "", hasValidity, hasLot,
    parsePtNumber(preferred["Valor Custo"]), parsePtNumber(preferred["Valor Venda (Tabela Padrão)"]),
    Math.max(...group.rows.map((row) => parsePtNumber(row["Estoque Mínimo"])), 0), "", "", "",
    inferPresentation(preferred["Unidade (06)"], group.description), concentration.value,
    concentration.unit, "", marca, packageInfo.content, locations.length === 1 ? locations[0] : "",
    null, null, ncm, "", "", "", originValues.length === 1 ? originValues[0] : "",
    unitFiscal, parsePtNumber(preferred["ICMS"]), parsePtNumber(preferred["IPI"]),
    parsePtNumber(preferred["PIS"]), parsePtNumber(preferred["COFINS"]), active,
    issues.length ? "REVISAR" : "PRONTO", issues.join("; "), codes.join(" | "),
    categoryIds.join(" | "), subcategoryIds.join(" | "), group.rows.length,
    group.rows.reduce((sum, row) => sum + stockOf(row), 0),
    Math.max(...group.rows.map((row) => parsePtNumber(row["Estoque Máximo"])), 0),
    suppliers.join(" | "), observations.join(" | "), types.join(" | "), barcodes.join(" | ")
  ];

  return { key: group.key, group, codigoInterno, values };
});

const candidateByKey = new Map(candidates.map((candidate) => [candidate.key, candidate]));
const lotHeaders = [
  "produtoId", "codigoInterno", "codigoLote", "validade", "Lote_Identificado", "Validade_Identificada", "quantidade", "custoUnitario",
  "observacao", "Importar_Estoque", "Pendencias", "descricaoCadastro", "codigoProdutoLegado",
  "nomeOriginal", "unidadeOriginal", "situacaoOrigem", "fornecedorOrigem", "idFornecedorOrigem",
  "marcaOrigem", "gtinOrigem", "estoqueMinimoOrigem", "estoqueMaximoOrigem", "linhaFonte"
];

const lotRows = records.map((record) => {
  const description = cleanDescription(record["Nome do Produto (120)"]);
  const key = normalizeText(description) || `SEM_DESCRICAO_${record.__sourceRow}`;
  const candidate = candidateByKey.get(key);
  const lot = parseLot(record["Nome do Produto (120)"]);
  const validity = parseValidity(record["Nome do Produto (120)"]);
  const quantity = stockOf(record);
  const issues = [];
  if (quantity > 0 && !lot) issues.push("saldo positivo sem lote identificado");
  if (quantity > 0 && !validity) issues.push("saldo positivo sem validade identificada");
  if (quantity > 0) issues.push("preencher produtoId após cadastrar os produtos");
  const importStatus = quantity <= 0 ? "NÃO - SEM SALDO" : issues.length > 1 ? "REVISAR" : "APÓS CADASTRO";
  return [
    null, candidate?.codigoInterno ?? "", lot, validity, lot ? "SIM" : "NÃO", validity ? "SIM" : "NÃO", quantity,
    parsePtNumber(record["Valor Custo"]), asText(record["Observações"]), importStatus,
    issues.join("; "), description, asText(record["Código do Produto (60)"]),
    asText(record["Nome do Produto (120)"]), asText(record["Unidade (06)"]),
    asText(record["Situação (Ativo/Inativo)"]), asText(record["Fornecedor"]),
    asText(record["ID Fornecedor"]), asText(record["Marca (25)"]),
    onlyDigits(record["Código de Barras (GTIN-8,12,13,14)"]),
    parsePtNumber(record["Estoque Mínimo"]), parsePtNumber(record["Estoque Máximo"]), record.__sourceRow
  ];
});

const fieldDictionary = [
  ["Código do Produto (60)", "Identificador do produto no sistema anterior.", "codigoInterno", "Mapear", "Se houver vários códigos por produto consolidado, escolher um definitivo."],
  ["Tipo (Produto/Servico)", "Define se a linha é produto ou serviço.", "Sem campo", "Revisar", "O cadastro atual do ERP aceita produtos; serviços exigem outro fluxo."],
  ["Nome do Produto (120)", "Descrição comercial; hoje também contém lote e validade.", "descricao", "Limpar", "Remover LT/LOTE e VAL/VL da descrição mestre."],
  ["Fornecedor", "Nome do fornecedor no sistema anterior.", "Cadastro de fornecedor/compra", "Preservar", "Não pertence diretamente ao modelo Produto."],
  ["ID Fornecedor", "Identificador legado do fornecedor.", "Cadastro de fornecedor/compra", "Preservar", "Exige tabela de correspondência com fornecedores do ERP."],
  ["Marca (25)", "Marca comercial informada.", "marca", "Mapear", "Não assumir fabricante quando não houver confirmação."],
  ["Estoque Mínimo", "Saldo mínimo desejado para reposição.", "estoqueMinimo", "Mapear", "Usar o maior valor entre registros consolidados."],
  ["Estoque Máximo", "Limite máximo desejado no sistema anterior.", "Sem campo", "Preservar", "O modelo Produto atual não possui estoque máximo."],
  ["Estoque Atual", "Quantidade existente na linha/lote.", "Entrada de estoque", "Separar", "Registrar após o produto, usando o fluxo de entrada por lote."],
  ["Unidade (06)", "Embalagem/unidade, por exemplo CX/50.", "unidadeCompra, unidadeVenda, fatorConversao, conteudoEmbalagem", "Sugerir", "CX/50 foi interpretado como compra CX, venda UN e fator 50; confirmar."],
  ["Produto Variado (Sim/Não)", "Indicador específico do sistema anterior.", "Sem campo", "Preservar", "Sem equivalente no modelo atual."],
  ["Valor Venda (Tabela Padrão)", "Preço de venda padrão.", "precoVendaBase", "Mapear", "Divergências entre lotes ficam sinalizadas."],
  ["Valor Custo", "Custo unitário/base.", "precoCustoBase e custoUnitario do lote", "Mapear", "Confirmar se o custo está por caixa ou por unidade de venda."],
  ["Peso", "Peso bruto no sistema anterior.", "Sem campo", "Preservar", "Não há campo correspondente no modelo Produto atual."],
  ["Peso Liq.", "Peso líquido no sistema anterior.", "Sem campo", "Preservar", "Não há campo correspondente no modelo Produto atual."],
  ["ICMS", "Alíquota percentual de ICMS.", "aliquotaIcms", "Mapear", "Validar conforme regime e regra tributária aplicável."],
  ["IPI", "Alíquota percentual de IPI.", "aliquotaIpi", "Mapear", "Validar conforme enquadramento fiscal."],
  ["PIS", "Alíquota percentual de PIS.", "aliquotaPis", "Mapear", "Validar conforme regime tributário."],
  ["COFINS", "Alíquota percentual de COFINS.", "aliquotaCofins", "Mapear", "Validar conforme regime tributário."],
  ["Unidade tributável", "Unidade usada no documento fiscal.", "unidadeFiscal", "Mapear", "Quando vazia, foi sugerida a unidade de venda."],
  ["Código Benefício Fiscal", "Código de benefício fiscal da UF.", "Sem campo", "Preservar", "Pode exigir ampliação do modelo/regra tributária."],
  ["Código CEST", "Código Especificador da Substituição Tributária.", "Sem campo", "Preservar", "Pode exigir ampliação do modelo/regra tributária."],
  ["NCM (8)", "Nomenclatura Comum do Mercosul com 8 dígitos.", "ncm", "Mapear", "Somente códigos com exatamente 8 dígitos foram aceitos."],
  ["Origem (0 a 8)", "Origem fiscal da mercadoria.", "origemMercadoria", "Mapear", "Validar o código conforme a tabela fiscal vigente."],
  ["Numero da ordem", "Ordenação interna do sistema anterior.", "Sem campo", "Ignorar", "Não altera o cadastro do produto."],
  ["Código de Barras (GTIN-8,12,13,14)", "GTIN/EAN da apresentação comercial.", "codigoBarras", "Mapear/Revisar", "Duplicidades entre produtos distintos foram sinalizadas."],
  ["Tipo Class. (Fiscal)", "Classificação fiscal legada, aparentemente código de tributação.", "cst ou csosn", "Não mapear automaticamente", "Confirmar se o valor representa CST, CSOSN ou outra classificação."],
  ["Observações", "Notas livres do cadastro anterior.", "Sem campo em Produto", "Preservar", "Pode ser usada como observação na entrada de estoque."],
  ["ID Categoria", "Identificador da categoria no sistema anterior.", "categoriaId", "Revisar", "Criar tabela de correspondência com as categorias do ERP."],
  ["ID Subcategoria", "Identificador da subcategoria no sistema anterior.", "categoriaId hierárquico", "Revisar", "Mapear para a categoria filha do ERP, se aplicável."],
  ["Situação (Ativo/Inativo)", "Status do registro no sistema anterior.", "ativo", "Consolidar", "Produto fica ativo se algum lote estiver ativo ou tiver saldo."],
  ["Tamanho", "Concentração ou tamanho, por exemplo 50MG/5ML.", "concentracaoValor, concentracaoUnidade", "Sugerir", "O primeiro número foi separado da unidade restante; confirmar casos complexos."],
  ["Localização no Estoque", "Endereço físico do item no depósito.", "localizacaoEstoque", "Mapear", "Divergências entre lotes precisam de revisão."]
];

const workbook = Workbook.create();
const summary = workbook.worksheets.add("Resumo");
const cadastro = workbook.worksheets.add("Cadastro_ERP");
const lotes = workbook.worksheets.add("Lotes_Estoque");
const dictionary = workbook.worksheets.add("Dicionario_Campos");
const original = workbook.worksheets.add("Fonte_Original");

const palette = {
  navy: "#16324F", blue: "#1F6F8B", teal: "#2A9D8F", pale: "#EAF3F6",
  light: "#F7FAFC", border: "#D5DEE5", text: "#1F2937", muted: "#5F6B76",
  input: "#FFF4CC", warning: "#FCE8D5", danger: "#FADBD8", success: "#DFF3E8"
};

const titleSheet = (sheet, title, subtitle, lastColumn) => {
  const end = colLetter(Math.min(lastColumn, 12) - 1);
  sheet.getRange(`A1:${end}1`).merge();
  sheet.getRange("A1").values = [[title]];
  sheet.getRange(`A2:${end}2`).merge();
  sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange(`A1:${end}1`).format = {
    fill: palette.navy,
    font: { bold: true, color: "#FFFFFF", size: 16 },
    verticalAlignment: "center"
  };
  sheet.getRange(`A2:${end}2`).format = {
    fill: palette.pale,
    font: { color: palette.muted, italic: true, size: 10 },
    wrapText: true,
    verticalAlignment: "center"
  };
  sheet.getRange("1:1").format.rowHeight = 28;
  sheet.getRange("2:2").format.rowHeight = 34;
  sheet.showGridLines = false;
};

const writeTableSheet = (sheet, title, subtitle, headers, rows, tableName) => {
  titleSheet(sheet, title, subtitle, headers.length);
  sheet.getRangeByIndexes(3, 0, 1, headers.length).values = [headers];
  if (rows.length) sheet.getRangeByIndexes(4, 0, rows.length, headers.length).values = rows;
  const endCol = colLetter(headers.length - 1);
  const endRow = 4 + rows.length;
  const table = sheet.tables.add(`A4:${endCol}${endRow}`, true, tableName);
  table.style = "TableStyleMedium2";
  table.showBandedRows = true;
  table.showFilterButton = true;
  sheet.freezePanes.freezeRows(4);
  sheet.getRange(`A4:${endCol}${endRow}`).format.font = { size: 9, color: palette.text };
  sheet.getRange(`A4:${endCol}4`).format = {
    fill: palette.blue,
    font: { bold: true, color: "#FFFFFF", size: 9 },
    wrapText: true,
    verticalAlignment: "center"
  };
  sheet.getRange("4:4").format.rowHeight = 38;
  return { endCol, endRow };
};

const rewriteColumnsAsText = (sheet, headers, rows, fields) => {
  const endRow = 4 + rows.length;
  for (const field of fields) {
    const index = headers.indexOf(field);
    if (index < 0) continue;
    const column = colLetter(index);
    const range = sheet.getRange(`${column}5:${column}${endRow}`);
    range.format.numberFormat = "@";
    range.formulas = rows.map((row) => {
      const value = asText(row[index]);
      return [value ? `="${value.replace(/"/g, '""')}"` : ""];
    });
  }
};

titleSheet(summary, "Organização do cadastro de produtos", "Diagnóstico do arquivo produtos_854968.csv e preparação conservadora para o modelo atual do ERP MedFlow.", 8);
summary.getRange("A4:B4").values = [["Indicador", "Resultado"]];
summary.getRange("A5:A13").values = [
  ["Linhas na fonte"], ["Produtos mestres sugeridos"], ["Registros consolidados"], ["Produtos para revisar"],
  ["Produtos prontos"], ["Linhas com saldo positivo"], ["Saldo total informado"],
  ["Lotes identificados em linhas com saldo"], ["Validades identificadas em linhas com saldo"]
];
const cadastroStatusCol = colLetter(cadastroHeaders.indexOf("Status_Importacao"));
const lotQuantityCol = colLetter(lotHeaders.indexOf("quantidade"));
const lotCodeCol = colLetter(lotHeaders.indexOf("codigoLote"));
const lotFlagCol = colLetter(lotHeaders.indexOf("Lote_Identificado"));
const validityFlagCol = colLetter(lotHeaders.indexOf("Validade_Identificada"));
summary.getRange("B5:B13").formulas = [
  [`=COUNTA('Fonte_Original'!A5:A${4 + rawRows.length})`],
  [`=COUNTA('Cadastro_ERP'!A5:A${4 + candidates.length})`],
  ["=B5-B6"],
  [`=COUNTIF('Cadastro_ERP'!${cadastroStatusCol}5:${cadastroStatusCol}${4 + candidates.length},\"REVISAR\")`],
  [`=COUNTIF('Cadastro_ERP'!${cadastroStatusCol}5:${cadastroStatusCol}${4 + candidates.length},\"PRONTO\")`],
  [`=COUNTIF('Lotes_Estoque'!${lotQuantityCol}5:${lotQuantityCol}${4 + lotRows.length},\">0\")`],
  [`=SUM('Lotes_Estoque'!${lotQuantityCol}5:${lotQuantityCol}${4 + lotRows.length})`],
  [`=COUNTIFS('Lotes_Estoque'!${lotQuantityCol}5:${lotQuantityCol}${4 + lotRows.length},\">0\",'Lotes_Estoque'!${lotFlagCol}5:${lotFlagCol}${4 + lotRows.length},\"SIM\")`],
  [`=COUNTIFS('Lotes_Estoque'!${lotQuantityCol}5:${lotQuantityCol}${4 + lotRows.length},\">0\",'Lotes_Estoque'!${validityFlagCol}5:${validityFlagCol}${4 + lotRows.length},\"SIM\")`]
];
summary.getRange("A4:B13").format.borders = { preset: "all", style: "thin", color: palette.border };
summary.getRange("A4:B4").format = { fill: palette.blue, font: { bold: true, color: "#FFFFFF" } };
summary.getRange("A5:A13").format = { fill: palette.light, font: { bold: true, color: palette.text } };
summary.getRange("B5:B13").format = { fill: "#FFFFFF", font: { bold: true, color: palette.navy }, horizontalAlignment: "right" };
summary.getRange("B11").format.numberFormat = "0.00";
summary.getRange("D4:H4").merge();
summary.getRange("D4").values = [["Como usar esta planilha"]];
summary.getRange("D4:H4").format = { fill: palette.teal, font: { bold: true, color: "#FFFFFF" } };
summary.getRange("D5:H11").merge(true);
summary.getRange("D5:D11").values = [
  ["1. Revise as células amarelas e a coluna Pendencias em Cadastro_ERP."],
  ["2. Faça a correspondência dos IDs de categoria legados com as categorias do ERP."],
  ["3. Confirme GTIN, NCM, unidade de venda e fator de conversão."],
  ["4. Cadastre primeiro os produtos mestres."],
  ["5. Depois preencha produtoId em Lotes_Estoque e registre apenas saldos positivos."],
  ["6. Não leve lote ou validade para a descrição do produto."],
  ["7. Preserve Fonte_Original como trilha de auditoria."]
];
summary.getRange("D5:H11").format = { fill: "#FFFFFF", font: { color: palette.text, size: 10 }, wrapText: true, verticalAlignment: "center", borders: { preset: "all", style: "thin", color: palette.border } };
summary.getRange("A15:H15").merge();
summary.getRange("A15").values = [["Decisões importantes"]];
summary.getRange("A15:H15").format = { fill: palette.navy, font: { bold: true, color: "#FFFFFF" } };
summary.getRange("A16:H20").merge(true);
summary.getRange("A16:A20").values = [
  ["• A descrição foi limpa somente quando havia marcadores explícitos de lote/validade."],
  ["• Linhas com a mesma descrição limpa foram consolidadas como um produto mestre sugerido."],
  ["• Estoque atual foi separado porque o ERP registra saldo por entrada/lote, não no POST de produto."],
  ["• CST/CSOSN não foram inferidos a partir de Tipo Class. (Fiscal), pois o significado precisa ser confirmado."],
  ["• Categoria, fabricante, registro ANVISA, temperatura e princípio ativo continuam pendentes quando não existem na fonte."]
];
summary.getRange("A16:H20").format = { fill: palette.pale, font: { color: palette.text, size: 10 }, wrapText: true, verticalAlignment: "center", borders: { preset: "all", style: "thin", color: palette.border } };
summary.getRange("A:A").format.columnWidth = 43;
summary.getRange("B:B").format.columnWidth = 16;
summary.getRange("C:C").format.columnWidth = 3;
summary.getRange("D:H").format.columnWidth = 18;
summary.freezePanes.freezeRows(2);

const cadastroMeta = writeTableSheet(
  cadastro,
  "Cadastro mestre sugerido para o ERP",
  "As 38 primeiras colunas seguem o payload atual de POST /api/produto. Amarelo = preencher/confirmar antes da importação.",
  cadastroHeaders,
  candidates.map((candidate) => candidate.values),
  "CadastroERPTable"
);
const cadastroWidths = [15, 17, 42, 20, 20, 12, 13, 12, 16, 22, 14, 12, 14, 14, 13, 16, 12, 16, 15, 15, 20, 22, 18, 16, 20, 15, 12, 12, 10, 9, 9, 16, 14, 12, 12, 12, 12, 9, 16, 55, 30, 22, 24, 12, 16, 16, 28, 35, 14, 28];
cadastroWidths.forEach((width, index) => cadastro.getRange(`${colLetter(index)}:${colLetter(index)}`).format.columnWidth = width);
const cadastroDataEnd = 4 + candidates.length;
for (const field of ["categoria", "fabricante", "registroAnvisa", "temperaturaArmazenamento", "cnpjFabricante", "classeRisco", "codigoFabricante", "principioAtivo", "pontoReposicao", "categoriaId", "cfop", "cst", "csosn"]) {
  const column = colLetter(cadastroHeaders.indexOf(field));
  cadastro.getRange(`${column}5:${column}${cadastroDataEnd}`).format.fill = palette.input;
}
cadastro.getRange(`${cadastroStatusCol}5:${cadastroStatusCol}${cadastroDataEnd}`).conditionalFormats.add("containsText", { text: "REVISAR", format: { fill: palette.warning, font: { bold: true, color: "#9A4D00" } } });
cadastro.getRange(`${cadastroStatusCol}5:${cadastroStatusCol}${cadastroDataEnd}`).conditionalFormats.add("containsText", { text: "PRONTO", format: { fill: palette.success, font: { bold: true, color: "#166534" } } });
for (const field of ["precoCustoBase", "precoVendaBase"]) {
  const column = colLetter(cadastroHeaders.indexOf(field));
  cadastro.getRange(`${column}5:${column}${cadastroDataEnd}`).format.numberFormat = "R$ #,##0.00";
}
rewriteColumnsAsText(
  cadastro,
  cadastroHeaders,
  candidates.map((candidate) => candidate.values),
  ["codigoInterno", "codigoBarras", "registroAnvisa", "cnpjFabricante", "codigoFabricante", "ncm", "cfop", "cst", "csosn", "origemMercadoria", "Codigos_Legado", "IDs_Categoria_Legado", "IDs_Subcategoria_Legado", "GTINs_Fonte"]
);
for (const field of ["estoqueMinimo", "pontoReposicao", "aliquotaIcms", "aliquotaIpi", "aliquotaPis", "aliquotaCofins", "Estoque_Fonte_Consolidado", "Estoque_Maximo_Legado"]) {
  const column = colLetter(cadastroHeaders.indexOf(field));
  cadastro.getRange(`${column}5:${column}${cadastroDataEnd}`).format.numberFormat = "0.00";
}
cadastro.getRange(`A5:${cadastroMeta.endCol}${cadastroDataEnd}`).format.verticalAlignment = "top";

const lotMeta = writeTableSheet(
  lotes,
  "Separação de lotes e saldo de estoque",
  "Compatível conceitualmente com POST /api/estoque/lote/entrada: preencha produtoId após criar os produtos e importe somente quantidades positivas revisadas.",
  lotHeaders,
  lotRows,
  "LotesEstoqueTable"
);
const lotWidths = [12, 16, 17, 13, 16, 18, 12, 14, 35, 18, 45, 40, 18, 55, 14, 16, 20, 16, 18, 18, 15, 15, 12];
lotWidths.forEach((width, index) => lotes.getRange(`${colLetter(index)}:${colLetter(index)}`).format.columnWidth = width);
const lotEnd = 4 + lotRows.length;
lotes.getRange(`A5:A${lotEnd}`).format.fill = palette.input;
const lotValidityColumn = colLetter(lotHeaders.indexOf("validade"));
const lotQuantityColumn = colLetter(lotHeaders.indexOf("quantidade"));
const lotCostColumn = colLetter(lotHeaders.indexOf("custoUnitario"));
const lotImportColumn = colLetter(lotHeaders.indexOf("Importar_Estoque"));
lotes.getRange(`${lotValidityColumn}5:${lotValidityColumn}${lotEnd}`).format.numberFormat = "yyyy-mm-dd";
lotes.getRange(`${lotQuantityColumn}5:${lotQuantityColumn}${lotEnd}`).format.numberFormat = "0.00";
lotes.getRange(`${lotCostColumn}5:${lotCostColumn}${lotEnd}`).format.numberFormat = "R$ #,##0.00";
rewriteColumnsAsText(lotes, lotHeaders, lotRows, ["codigoInterno", "codigoLote", "codigoProdutoLegado", "idFornecedorOrigem", "gtinOrigem"]);
lotes.getRange(`${lotImportColumn}5:${lotImportColumn}${lotEnd}`).conditionalFormats.add("containsText", { text: "REVISAR", format: { fill: palette.warning, font: { bold: true, color: "#9A4D00" } } });
lotes.getRange(`${lotImportColumn}5:${lotImportColumn}${lotEnd}`).conditionalFormats.add("containsText", { text: "APÓS CADASTRO", format: { fill: palette.success, font: { bold: true, color: "#166534" } } });

const dictionaryRows = fieldDictionary.map((row) => {
  const sampleIndex = sourceHeaders.indexOf(row[0]);
  const examples = unique(rawRows.slice(0, 100).map((sourceRow) => sourceRow[sampleIndex])).slice(0, 3).join(" | ");
  return [row[0], row[1], examples, row[2], row[3], row[4]];
});
writeTableSheet(
  dictionary,
  "Dicionário dos campos do arquivo recebido",
  "Significado provável, destino no ERP e decisão recomendada. Campos fiscais devem ser validados pela equipe responsável.",
  ["Campo na fonte", "O que significa", "Exemplos encontrados", "Destino no ERP", "Decisão", "Regra / cuidado"],
  dictionaryRows,
  "DicionarioCamposTable"
);
[28, 42, 38, 34, 20, 58].forEach((width, index) => dictionary.getRange(`${colLetter(index)}:${colLetter(index)}`).format.columnWidth = width);
dictionary.getRange(`A5:F${4 + dictionaryRows.length}`).format.wrapText = true;
dictionary.getRange(`A5:F${4 + dictionaryRows.length}`).format.verticalAlignment = "top";

const originalRowsAsText = rawRows.map((row) => sourceHeaders.map((_, index) => row[index] ?? ""));
const originalMeta = writeTableSheet(
  original,
  "Fonte original preservada",
  "Cópia do CSV recebido, sem limpeza de conteúdo. Use esta aba para auditoria e conferência com o sistema anterior.",
  sourceHeaders,
  originalRowsAsText,
  "FonteOriginalTable"
);
const originalWidths = sourceHeaders.map((header) => {
  if (header.includes("Nome do Produto")) return 62;
  if (header.includes("Observações")) return 36;
  if (header.includes("Código de Barras")) return 23;
  if (header.includes("Fornecedor") || header.includes("Categoria")) return 18;
  return Math.min(24, Math.max(12, Math.ceil(header.length * 0.85)));
});
originalWidths.forEach((width, index) => original.getRange(`${colLetter(index)}:${colLetter(index)}`).format.columnWidth = width);
const originalDataRange = original.getRange(`A5:${originalMeta.endCol}${originalMeta.endRow}`);
originalDataRange.format.numberFormat = "@";
originalDataRange.values = originalRowsAsText.map((row) => row.map(asText));
rewriteColumnsAsText(original, sourceHeaders, originalRowsAsText, [
  "Código do Produto (60)", "ID Fornecedor", "Código Benefício Fiscal", "Código CEST",
  "NCM (8)", "Origem (0 a 8)", "Numero da ordem", "Código de Barras (GTIN-8,12,13,14)",
  "Tipo Class. (Fiscal)", "ID Categoria", "ID Subcategoria"
]);

const summaryCheck = await workbook.inspect({
  kind: "table",
  range: "Resumo!A1:H20",
  include: "values,formulas",
  tableMaxRows: 22,
  tableMaxCols: 8,
  maxChars: 7000
});
const cadastroCheck = await workbook.inspect({
  kind: "table",
  range: `Cadastro_ERP!A1:P${Math.min(cadastroDataEnd, 15)}`,
  include: "values,formulas",
  tableMaxRows: 15,
  tableMaxCols: 16,
  maxChars: 7000
});
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "varredura final de erros de fórmula",
  maxChars: 4000
});

await fs.mkdir(outputDir, { recursive: true });
const previewRanges = [
  ["Resumo", "A1:H20"],
  ["Cadastro_ERP", `A1:P${Math.min(cadastroDataEnd, 18)}`],
  ["Lotes_Estoque", `A1:Q${Math.min(lotEnd, 18)}`],
  ["Dicionario_Campos", "A1:F38"],
  ["Fonte_Original", "A1:Q16"]
];
for (const [sheetName, range] of previewRanges) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(path.join(outputDir, `preview_${sheetName}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

const stats = {
  sourceRows: rawRows.length,
  sourceColumns: sourceHeaders.length,
  candidates: candidates.length,
  consolidatedRows: rawRows.length - candidates.length,
  candidatesToReview: candidates.filter((candidate) => candidate.values[cadastroHeaders.indexOf("Status_Importacao")] === "REVISAR").length,
  positiveStockRows: records.filter((record) => stockOf(record) > 0).length,
  totalStock: records.reduce((sum, record) => sum + stockOf(record), 0),
  positiveRowsWithLot: records.filter((record) => stockOf(record) > 0 && parseLot(record["Nome do Produto (120)"])).length,
  positiveRowsWithValidity: records.filter((record) => stockOf(record) > 0 && parseValidity(record["Nome do Produto (120)"])).length,
  distinctBarcodesRepeatedAcrossCandidates: [...barcodeGroups.values()].filter((set) => set.size > 1).length,
  outputPath,
  summaryInspect: summaryCheck.ndjson,
  cadastroInspect: cadastroCheck.ndjson,
  formulaErrors: errors.ndjson
};

await fs.writeFile(path.join(outputDir, "analysis.json"), JSON.stringify(stats, null, 2));
console.log(JSON.stringify(stats, null, 2));
