import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "/Users/josuetecla/Documents/ERP MEDFLOW/outputs/produtos_854968";
const planPath = path.join(outputDir, "importacao_estoque_plano.json");
const outputPath = path.join(outputDir, "revisao_produtos_semelhantes_dosagem_especificidade.xlsx");

const plan = JSON.parse(await fs.readFile(planPath, "utf8"));
const products = plan.products.map((item, index) => {
  const data = item.data;
  const parsed = parseProduct(data.descricao, data);
  return {
    index: index + 1,
    key: item.key,
    sourceRows: item.sourceRows.join(" | "),
    sourceCodes: item.sourceCodes.join(" | "),
    issues: item.issues.join("; "),
    data,
    ...parsed,
  };
});

let reviewGroupCounter = 1;
const groups = groupBy(products, (product) => product.baseKey);
const reviewGroups = [...groups.entries()]
  .map(([baseKey, items]) => summarizeGroup(baseKey, items))
  .filter((group) => group.products.length > 1)
  .sort((a, b) => severityOrder(a.risco) - severityOrder(b.risco) || b.products.length - a.products.length || a.nomeBase.localeCompare(b.nomeBase, "pt-BR"));

const duplicateGroups = [];
for (const group of reviewGroups) {
  const bySpec = groupBy(group.products, (product) => product.specKeyNoBrand || "SEM_ESPECIFICACAO");
  for (const [specKey, items] of bySpec.entries()) {
    if (items.length < 2) continue;
    duplicateGroups.push({
      group,
      specKey,
      items,
      brands: unique(items.map((item) => item.data.marca)),
      barcodes: unique(items.map((item) => item.data.codigoBarras)),
      packages: unique(items.map((item) => item.packageText)),
    });
  }
}
duplicateGroups.sort((a, b) => b.items.length - a.items.length || a.group.nomeBase.localeCompare(b.group.nomeBase, "pt-BR"));

const reviewProducts = reviewGroups.flatMap((group) => group.products.map((product) => {
  const groupAction = classifyProductAction(group, product);
  return {
    group,
    product,
    action: groupAction,
  };
}));

const workbook = Workbook.create();
const summary = workbook.worksheets.add("Resumo");
const groupsSheet = workbook.worksheets.add("Grupos_Semelhantes");
const productsSheet = workbook.worksheets.add("Produtos_Para_Revisar");
const duplicatesSheet = workbook.worksheets.add("Possiveis_Duplicidades");
const normalizedSheet = workbook.worksheets.add("Catalogo_Normalizado");
const rulesSheet = workbook.worksheets.add("Regras");

const palette = {
  navy: "#16324F",
  blue: "#1F6F8B",
  teal: "#2A9D8F",
  pale: "#EAF3F6",
  light: "#F7FAFC",
  border: "#D5DEE5",
  input: "#FFF4CC",
  warning: "#FCE8D5",
  danger: "#FADBD8",
  success: "#DFF3E8",
  text: "#1F2937",
  muted: "#5F6B76",
};

titleSheet(summary, "Revisão de produtos semelhantes", "Agrupamento por nome base para separar dosagem, volume, embalagem, marca e outras especificidades antes da importação.", 9);
summary.getRange("A4:B4").values = [["Indicador", "Resultado"]];
summary.getRange("A5:A15").values = [
  ["Produtos mestres no plano"],
  ["Grupos com produtos semelhantes"],
  ["Produtos dentro desses grupos"],
  ["Grupos de risco alto"],
  ["Possíveis duplicidades reais"],
  ["Grupos com variação de dosagem/volume/dimensão"],
  ["GTIN repetido dentro de grupos"],
  ["Produtos sem especificação detectada"],
  ["Produtos com dosagem/volume detectado"],
  ["Produtos com dimensão/calibre detectado"],
  ["Produtos com embalagem detectada"],
];
summary.getRange("B5:B15").values = [
  [products.length],
  [reviewGroups.length],
  [reviewProducts.length],
  [reviewGroups.filter((group) => group.risco === "ALTO").length],
  [duplicateGroups.length],
  [reviewGroups.filter((group) => group.temVariacaoEspecificacao).length],
  [reviewGroups.filter((group) => group.gtinRepetido).length],
  [products.filter((product) => !product.specKeyNoBrand).length],
  [products.filter((product) => product.doseVolumeText).length],
  [products.filter((product) => product.dimensionText).length],
  [products.filter((product) => product.packageText).length],
];
styleSmallTable(summary, "A4:B15");
summary.getRange("D4:I4").merge();
summary.getRange("D4").values = [["Como interpretar"]];
summary.getRange("D4:I4").format = { fill: palette.teal, font: { bold: true, color: "#FFFFFF" } };
summary.getRange("D5:I12").merge(true);
summary.getRange("D5:D12").values = [
  ["1. Use Grupos_Semelhantes para ver famílias de produtos que parecem iguais no nome."],
  ["2. Use Produtos_Para_Revisar para decidir produto por produto: manter separado, consolidar ou ajustar nome."],
  ["3. Use Possiveis_Duplicidades para casos onde a especificação parece igual e pode haver cadastro duplicado."],
  ["4. Variação de dosagem, ml, %, calibre, dimensão ou embalagem normalmente deve virar SKU/produto separado."],
  ["5. GTIN repetido com especificação diferente é risco alto: revisar antes de importar."],
  ["6. Não alterei o CSV original nem gravei nada no banco."],
  ["7. As colunas amarelas são para sua decisão manual."],
  ["8. O agrupamento é uma sugestão conservadora; cadastro médico precisa de revisão humana."],
];
summary.getRange("D5:I12").format = { fill: "#FFFFFF", font: { size: 10, color: palette.text }, wrapText: true, borders: { preset: "all", style: "thin", color: palette.border } };
summary.getRange("A:A").format.columnWidth = 46;
summary.getRange("B:B").format.columnWidth = 16;
summary.getRange("C:C").format.columnWidth = 3;
summary.getRange("D:I").format.columnWidth = 18;
summary.showGridLines = false;

const groupRows = reviewGroups.map((group, idx) => [
  group.groupId,
  group.nomeBase,
  group.products.length,
  group.risco,
  group.acaoSugerida,
  group.temVariacaoEspecificacao ? "SIM" : "NÃO",
  group.gtinRepetido ? "SIM" : "NÃO",
  group.distinctDoseVolume.join(" | "),
  group.distinctDimensions.join(" | "),
  group.distinctPackages.join(" | "),
  group.distinctBrands.join(" | "),
  group.distinctBarcodes.map(formatGtin).join(" | "),
  group.examples.join(" || "),
  "",
  "",
]);
writeTableSheet(
  groupsSheet,
  "Grupos de produtos semelhantes",
  "Um grupo pode conter produtos realmente diferentes. A decisão recomendada prioriza segurança: separar quando dosagem, volume, dimensão ou apresentação muda.",
  ["Grupo", "Nome_Base", "Qtd_Produtos", "Risco", "Acao_Sugerida", "Varia_Especificacao", "GTIN_Repetido", "Dosagens_Volumes", "Dimensoes_Calibres", "Embalagens", "Marcas", "GTINs", "Exemplos", "Decisao_Manual", "Observacao"],
  groupRows,
  "GruposSemelhantesTable"
);
setWidths(groupsSheet, [12, 36, 12, 12, 34, 18, 14, 34, 32, 28, 30, 28, 64, 22, 42]);
paintEditable(groupsSheet, ["N", "O"], 5, 4 + groupRows.length);
paintRisk(groupsSheet, "D", 5, 4 + groupRows.length);
rewriteTextColumns(groupsSheet, groupRows, [0, 11]);

const productRows = reviewProducts.map(({ group, product, action }) => [
  group.groupId,
  group.nomeBase,
  group.risco,
  action,
  product.data.codigoInterno || "",
  product.data.descricao,
  product.baseDisplay,
  product.doseVolumeText,
  product.dimensionText,
  product.packageText,
  product.presentationText,
  product.data.marca || "",
  formatGtin(product.data.codigoBarras),
  product.data.ncm || "",
  product.data.precoCustoBase ?? "",
  product.data.precoVendaBase ?? "",
  product.sourceRows,
  product.sourceCodes,
  product.issues,
  suggestName(product),
  "",
  "",
]);
writeTableSheet(
  productsSheet,
  "Produtos para revisar antes do cadastro",
  "Linhas amarelas ao final são para decidir ajuste/cadastro. Não consolide automaticamente produtos com diferença clínica, dimensional ou de apresentação.",
  ["Grupo", "Nome_Base", "Risco_Grupo", "Acao_Sugerida", "Codigo", "Descricao_Atual", "Base_Normalizada", "Dosagem_Volume_%", "Dimensao_Calibre", "Embalagem", "Apresentacao", "Marca", "GTIN", "NCM", "Custo", "Venda", "Linhas_Fonte", "Codigos_Fonte", "Pendencias_Originais", "Nome_Sugerido", "Decisao_Manual", "Nome_Final_Ajustado"],
  productRows,
  "ProdutosRevisaoTable"
);
setWidths(productsSheet, [12, 34, 12, 32, 14, 56, 34, 28, 24, 22, 16, 18, 18, 12, 12, 12, 14, 24, 38, 56, 22, 56]);
paintEditable(productsSheet, ["U", "V"], 5, 4 + productRows.length);
paintRisk(productsSheet, "C", 5, 4 + productRows.length);
productsSheet.getRange(`O5:P${4 + productRows.length}`).format.numberFormat = "R$ #,##0.00";
rewriteTextColumns(productsSheet, productRows, [0, 4, 12, 13, 16, 17]);

const duplicateRows = duplicateGroups.flatMap((dup, index) => dup.items.map((product) => [
  `DUP-${String(index + 1).padStart(3, "0")}`,
  dup.group.nomeBase,
  dup.specKey === "SEM_ESPECIFICACAO" ? "" : dup.specKey,
  dup.items.length,
  dup.group.risco,
  duplicateAction(dup),
  product.data.codigoInterno || "",
  product.data.descricao,
  product.doseVolumeText,
  product.dimensionText,
  product.packageText,
  product.data.marca || "",
  formatGtin(product.data.codigoBarras),
  product.sourceRows,
  "",
  "",
]));
writeTableSheet(
  duplicatesSheet,
  "Possíveis duplicidades reais",
  "Mesma base e mesma especificação detectada. Pode ser duplicidade, ou pode ser produto separado por marca/fabricante/GTIN conforme a política comercial.",
  ["Dup_ID", "Nome_Base", "Especificacao_Normalizada", "Qtd_No_Grupo", "Risco", "Acao_Sugerida", "Codigo", "Descricao_Atual", "Dosagem_Volume_%", "Dimensao_Calibre", "Embalagem", "Marca", "GTIN", "Linhas_Fonte", "Decisao_Manual", "Observacao"],
  duplicateRows,
  "PossiveisDuplicidadesTable"
);
setWidths(duplicatesSheet, [12, 34, 36, 12, 12, 38, 14, 56, 26, 24, 22, 18, 18, 14, 22, 44]);
paintEditable(duplicatesSheet, ["O", "P"], 5, 4 + duplicateRows.length);
paintRisk(duplicatesSheet, "E", 5, 4 + duplicateRows.length);
rewriteTextColumns(duplicatesSheet, duplicateRows, [0, 6, 12, 13]);

const normalizedRows = products.map((product) => [
  product.index,
  product.data.codigoInterno || "",
  product.data.descricao,
  product.baseDisplay,
  product.familyKey,
  product.doseVolumeText,
  product.dimensionText,
  product.packageText,
  product.presentationText,
  product.data.marca || "",
  formatGtin(product.data.codigoBarras),
  product.data.ncm || "",
  product.data.unidadeVenda || "",
  product.data.unidadeCompra || "",
  product.data.fatorConversao ?? "",
  product.sourceRows,
  product.sourceCodes,
]);
writeTableSheet(
  normalizedSheet,
  "Catálogo normalizado para análise",
  "Todos os 480 produtos do plano com campos extraídos do nome. Esta aba é a trilha de auditoria da análise.",
  ["Seq", "Codigo", "Descricao_Atual", "Base_Normalizada", "Familia", "Dosagem_Volume_%", "Dimensao_Calibre", "Embalagem", "Apresentacao", "Marca", "GTIN", "NCM", "Unidade_Venda", "Unidade_Compra", "Fator", "Linhas_Fonte", "Codigos_Fonte"],
  normalizedRows,
  "CatalogoNormalizadoTable"
);
setWidths(normalizedSheet, [8, 14, 58, 34, 28, 28, 24, 22, 16, 18, 18, 12, 14, 14, 10, 14, 24]);
rewriteTextColumns(normalizedSheet, normalizedRows, [1, 10, 11, 15, 16]);

const rulesRows = [
  ["Nome base", "Descrição sem lote, validade, marca, embalagem e especificações numéricas. Serve para encontrar famílias de produtos semelhantes."],
  ["Dosagem/volume/%", "Captura padrões como 50MG/5ML, 1000MG + 200MG, 20%, 500ML, 4000 UI."],
  ["Dimensão/calibre", "Captura padrões como 13X0,45MM, 20G/80MM, 24GX3/4, 7,5 X 7,5."],
  ["Embalagem", "Captura CX/50, PCT/10, FR, AP, BOLSA, unidade de compra e fator de conversão."],
  ["Risco ALTO", "Há GTIN repetido em produtos diferentes, ou mesma família com diferenças relevantes de especificação."],
  ["Risco MÉDIO", "Há produtos parecidos com especificações diferentes, mas sem GTIN repetido detectado."],
  ["Possível duplicidade", "Mesma base e mesma especificação detectada. Revisar marca, GTIN, fornecedor e embalagem antes de consolidar."],
  ["Regra segura", "Quando dosagem, volume, dimensão, calibre, concentração, apresentação ou marca controlada mudar, manter como produto separado até validação humana."],
];
writeTableSheet(
  rulesSheet,
  "Regras usadas na leitura dos nomes",
  "As regras são auxiliares para revisão cadastral. Elas não substituem validação técnica/comercial de produtos médicos.",
  ["Item", "Regra / interpretação"],
  rulesRows,
  "RegrasTable"
);
setWidths(rulesSheet, [26, 96]);

const inspect = await workbook.inspect({
  kind: "table",
  range: "Resumo!A1:I15",
  include: "values,formulas",
  tableMaxRows: 16,
  tableMaxCols: 9,
  maxChars: 5000,
});
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "varredura final de erros de formula",
  maxChars: 4000,
});

for (const [sheetName, range] of [
  ["Resumo", "A1:I15"],
  ["Grupos_Semelhantes", "A1:O18"],
  ["Produtos_Para_Revisar", "A1:V18"],
  ["Possiveis_Duplicidades", "A1:P18"],
  ["Catalogo_Normalizado", "A1:Q18"],
  ["Regras", "A1:B14"],
]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(path.join(outputDir, `preview_${sheetName}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save(outputPath);

const stats = {
  products: products.length,
  reviewGroups: reviewGroups.length,
  reviewProducts: reviewProducts.length,
  highRiskGroups: reviewGroups.filter((group) => group.risco === "ALTO").length,
  duplicateGroups: duplicateGroups.length,
  groupsWithSpecVariation: reviewGroups.filter((group) => group.temVariacaoEspecificacao).length,
  outputPath,
  summaryInspect: inspect.ndjson,
  formulaErrors: errors.ndjson,
};
await fs.writeFile(path.join(outputDir, "revisao_produtos_semelhantes_stats.json"), JSON.stringify(stats, null, 2));
console.log(JSON.stringify(stats, null, 2));

function parseProduct(description, data) {
  const normalized = normalize(description);
  const brand = normalize(data.marca || "");
  const doseVolume = extractDoseVolume(normalized);
  const dimensions = extractDimensions(normalized);
  const packages = extractPackages(normalized, data);
  const presentation = data.apresentacao || "";
  const baseDisplay = buildBase(normalized, brand);
  const baseKey = normalizeKey(baseDisplay);
  const familyKey = buildFamilyKey(baseKey);
  const doseVolumeText = unique(doseVolume).join(" | ");
  const dimensionText = unique(dimensions).join(" | ");
  const packageText = unique(packages).join(" | ");
  const presentationText = presentation || data.unidadeCompra || data.unidadeVenda || "";
  const specParts = [...unique(doseVolume), ...unique(dimensions), presentationText, packageText].filter(Boolean);
  const specKeyNoBrand = normalizeKey(specParts.join(" "));
  const specKeyWithBrand = normalizeKey([...specParts, data.marca || ""].join(" "));
  return {
    normalized,
    baseDisplay,
    baseKey,
    familyKey,
    doseVolumeText,
    dimensionText,
    packageText,
    presentationText,
    specKeyNoBrand,
    specKeyWithBrand,
  };
}

function summarizeGroup(baseKey, items) {
  const groupId = `G-${String(reviewGroupCounter++).padStart(3, "0")}`;
  const distinctDoseVolume = unique(items.map((item) => item.doseVolumeText).filter(Boolean));
  const distinctDimensions = unique(items.map((item) => item.dimensionText).filter(Boolean));
  const distinctPackages = unique(items.map((item) => item.packageText).filter(Boolean));
  const distinctBrands = unique(items.map((item) => item.data.marca).filter(Boolean));
  const distinctBarcodes = unique(items.map((item) => item.data.codigoBarras).filter(Boolean));
  const specKeys = unique(items.map((item) => item.specKeyNoBrand).filter(Boolean));
  const gtinsRepeated = distinctBarcodes.some((barcode) => items.filter((item) => item.data.codigoBarras === barcode).length > 1);
  const temVariacaoEspecificacao = specKeys.length > 1 || distinctDoseVolume.length > 1 || distinctDimensions.length > 1 || distinctPackages.length > 1;
  const risco = gtinsRepeated && temVariacaoEspecificacao ? "ALTO" : temVariacaoEspecificacao ? "MÉDIO" : "BAIXO";
  const acaoSugerida = risco === "ALTO"
    ? "REVISAR GTIN e manter separado quando especificação mudar"
    : temVariacaoEspecificacao
      ? "MANTER VARIANTES separadas por dosagem/volume/dimensão/apresentação"
      : "REVISAR possível duplicidade";
  return {
    groupId,
    nomeBase: toReadableBase(baseKey),
    products: items.sort((a, b) => a.data.descricao.localeCompare(b.data.descricao, "pt-BR")),
    distinctDoseVolume,
    distinctDimensions,
    distinctPackages,
    distinctBrands,
    distinctBarcodes,
    gtinRepetido: gtinsRepeated,
    temVariacaoEspecificacao,
    risco,
    acaoSugerida,
    examples: items.slice(0, 4).map((item) => item.data.descricao),
  };
}

function classifyProductAction(group, product) {
  if (group.risco === "ALTO" && group.gtinRepetido) return "REVISAR GTIN repetido; não consolidar automaticamente";
  if (group.temVariacaoEspecificacao) return "MANTER separado como variante/SKU";
  return "REVISAR possível duplicidade";
}

function duplicateAction(dup) {
  if (dup.brands.length > 1) return "Mesma especificação; decidir se marca/fabricante separa o SKU";
  if (dup.barcodes.length > 1) return "Mesma especificação com GTIN diferente; revisar cadastro";
  return "Candidato forte a consolidação, validar antes";
}

function suggestName(product) {
  const parts = [
    product.baseDisplay,
    product.doseVolumeText,
    product.dimensionText,
    product.presentationText,
    product.packageText,
    product.data.marca,
  ].filter(Boolean);
  return unique(parts).join(" - ").replace(/\s+/g, " ").trim();
}

function extractDoseVolume(text) {
  const patterns = [
    /\b\d+(?:[,.]\d+)?\s*(?:MG|MCG|G|UI|U|MEQ)\s*\/\s*\d+(?:[,.]\d+)?\s*(?:ML|L)\b/g,
    /\b\d+(?:[,.]\d+)?\s*(?:G\/L|MG\/ML|MG\/G|MG\/5ML)\b/g,
    /\b\d+(?:[,.]\d+)?\s*%\b/g,
    /\b\d+(?:[,.]\d+)?\s*(?:MG|MCG|G|UI|U|MEQ)\b/g,
    /\b\d+(?:[,.]\d+)?\s*(?:ML|L)\b/g,
  ];
  return patterns.flatMap((pattern) => text.match(pattern) || []).map(cleanSpec);
}

function extractDimensions(text) {
  const patterns = [
    /\b\d+(?:[,.]\d+)?\s*[X]\s*\d+(?:[,.]\d+)?(?:\s*[X]\s*\d+(?:[,.]\d+)?)?\s*(?:MM|CM)?\b/g,
    /\b\d+\s*G\s*(?:X\s*[\d,./-]+(?:MM)?)?\b/g,
    /\b\d+(?:[,.]\d+)?\s*FIOS\b/g,
    /\bTAM\s*[A-Z0-9]+\b/g,
  ];
  return patterns.flatMap((pattern) => text.match(pattern) || []).map(cleanSpec);
}

function extractPackages(text, data) {
  const found = text.match(/\b(?:CX|CAIXA|PCT|PACOTE|FR|FRASCO|AP|AMP|AMPOLA|BOLSA|GL|GALAO|UN|UND|SACHE|ROLO|PAR|KIT)\s*\/?\s*\d*\b/g) || [];
  const fromData = [];
  if (data.unidadeCompra) fromData.push(data.unidadeCompra);
  if (data.conteudoEmbalagem) fromData.push(`CONTEUDO ${data.conteudoEmbalagem}`);
  if (data.fatorConversao && data.fatorConversao !== 1) fromData.push(`FATOR ${data.fatorConversao}`);
  return [...found, ...fromData].map(cleanSpec);
}

function buildBase(text, brand) {
  let result = ` ${text} `;
  result = result.replace(/\([^)]*\)/g, " ");
  if (brand) result = result.replace(new RegExp(`\\b${escapeRegExp(brand)}\\b`, "g"), " ");
  result = result.replace(/\b(?:LT|LOTE|VAL|VL|VALIDADE|VENC|VTO)\b.*$/g, " ");
  result = result.replace(/\b\d+(?:[,.]\d+)?\s*(?:MG|MCG|G|KG|UI|U|MEQ)\s*\/\s*\d+(?:[,.]\d+)?\s*(?:ML|L)\b/g, " ");
  result = result.replace(/\b\d+(?:[,.]\d+)?\s*(?:G\/L|MG\/ML|MG\/G|MG\/5ML)\b/g, " ");
  result = result.replace(/\b\d+(?:[,.]\d+)?\s*%\b/g, " ");
  result = result.replace(/\b\d+(?:[,.]\d+)?\s*(?:MG|MCG|G|KG|UI|U|MEQ|ML|L|MM|CM|GR)\b/g, " ");
  result = result.replace(/\b\d+(?:[,.]\d+)?\s*X\s*\d+(?:[,.]\d+)?(?:\s*X\s*\d+(?:[,.]\d+)?)?\s*(?:MM|CM)?\b/g, " ");
  result = result.replace(/\b\d+\s*G\s*(?:X\s*[\d,./-]+(?:MM)?)?\b/g, " ");
  result = result.replace(/\b\d+(?:[,.]\d+)?\s*FIOS\b/g, " ");
  result = result.replace(/\b(?:CX|CAIXA|PCT|PACOTE|FR|FRASCO|AP|AMP|AMPOLA|BOLSA|GL|GALAO|UN|UND|SACHE|ROLO|PAR|KIT)\s*\/?\s*\d*\b/g, " ");
  result = result.replace(/\b(?:C|COM|S|SEM|P|PARA)\s*\/\s*/g, " ");
  result = result.replace(/[-–—_/.,;:]+/g, " ");
  result = result.replace(/\b\d+\b/g, " ");
  result = result.replace(/\b(?:DE|DA|DO|DAS|DOS|E|A|O|AS|OS)\b/g, " ");
  result = result.replace(/\s+/g, " ").trim();
  return result || text;
}

function buildFamilyKey(baseKey) {
  const tokens = baseKey.split(" ").filter(Boolean);
  return tokens.slice(0, Math.min(tokens.length, 3)).join(" ");
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/Ç/g, "C")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value) {
  return normalize(value).replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function toReadableBase(value) {
  return value || "SEM BASE";
}

function cleanSpec(value) {
  return normalize(value).replace(/\s+/g, "");
}

function formatGtin(value) {
  const text = String(value || "").trim();
  return text ? `GTIN: ${text}` : "";
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item) || "SEM_BASE";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function unique(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function severityOrder(value) {
  if (value === "ALTO") return 0;
  if (value === "MÉDIO") return 1;
  return 2;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleSheet(sheet, title, subtitle, lastColumn) {
  const end = colLetter(Math.min(lastColumn, 10) - 1);
  sheet.getRange(`A1:${end}1`).merge();
  sheet.getRange("A1").values = [[title]];
  sheet.getRange(`A2:${end}2`).merge();
  sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange(`A1:${end}1`).format = {
    fill: palette.navy,
    font: { bold: true, color: "#FFFFFF", size: 16 },
    verticalAlignment: "center",
  };
  sheet.getRange(`A2:${end}2`).format = {
    fill: palette.pale,
    font: { italic: true, color: palette.muted, size: 10 },
    wrapText: true,
    verticalAlignment: "center",
  };
  sheet.getRange("1:1").format.rowHeight = 28;
  sheet.getRange("2:2").format.rowHeight = 34;
  sheet.showGridLines = false;
}

function writeTableSheet(sheet, title, subtitle, headers, rows, tableName) {
  titleSheet(sheet, title, subtitle, headers.length);
  sheet.getRangeByIndexes(3, 0, 1, headers.length).values = [headers];
  if (rows.length) sheet.getRangeByIndexes(4, 0, rows.length, headers.length).values = rows;
  const endCol = colLetter(headers.length - 1);
  const endRow = 4 + Math.max(rows.length, 1);
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
    verticalAlignment: "center",
  };
  sheet.getRange("4:4").format.rowHeight = 38;
}

function styleSmallTable(sheet, range) {
  sheet.getRange(range).format.borders = { preset: "all", style: "thin", color: palette.border };
  sheet.getRange("A4:B4").format = { fill: palette.blue, font: { bold: true, color: "#FFFFFF" } };
  sheet.getRange("A5:A15").format = { fill: palette.light, font: { bold: true, color: palette.text } };
  sheet.getRange("B5:B15").format = { fill: "#FFFFFF", font: { bold: true, color: palette.navy }, horizontalAlignment: "right" };
}

function setWidths(sheet, widths) {
  widths.forEach((width, index) => {
    const col = colLetter(index);
    sheet.getRange(`${col}:${col}`).format.columnWidth = width;
  });
}

function paintEditable(sheet, columns, startRow, endRow) {
  for (const column of columns) {
    sheet.getRange(`${column}${startRow}:${column}${endRow}`).format.fill = palette.input;
  }
}

function paintRisk(sheet, column, startRow, endRow) {
  sheet.getRange(`${column}${startRow}:${column}${endRow}`).conditionalFormats.add("containsText", { text: "ALTO", format: { fill: palette.danger, font: { bold: true, color: "#991B1B" } } });
  sheet.getRange(`${column}${startRow}:${column}${endRow}`).conditionalFormats.add("containsText", { text: "MÉDIO", format: { fill: palette.warning, font: { bold: true, color: "#9A4D00" } } });
  sheet.getRange(`${column}${startRow}:${column}${endRow}`).conditionalFormats.add("containsText", { text: "BAIXO", format: { fill: palette.success, font: { bold: true, color: "#166534" } } });
}

function rewriteTextColumns(sheet, rows, columnIndexes) {
  if (!rows.length) return;
  const endRow = 4 + rows.length;
  for (const index of columnIndexes) {
    const column = colLetter(index);
    const range = sheet.getRange(`${column}5:${column}${endRow}`);
    range.format.numberFormat = "@";
    range.formulas = rows.map((row) => {
      const value = String(row[index] ?? "").trim();
      return [value ? `="${value.replace(/"/g, '""')}"` : ""];
    });
  }
}

function colLetter(index) {
  let n = index + 1;
  let result = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}
