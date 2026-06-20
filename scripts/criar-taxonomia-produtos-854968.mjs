#!/usr/bin/env node
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const execute = process.argv.includes("--execute");
const outputDir = "/Users/josuetecla/Documents/ERP MEDFLOW/outputs/produtos_854968";
const planPath = path.join(outputDir, "importacao_estoque_plano.json");
const EMPRESA_ID = 1;

const taxonomy = [
  {
    nome: "Medicamentos",
    children: [
      "Antibióticos e Antimicrobianos",
      "Anestésicos, Analgésicos e Sedação",
      "Anticoagulantes e Hemostáticos",
      "Cardiovascular e Emergência",
      "Corticoides e Anti-inflamatórios",
      "Soluções, Eletrólitos e Diluentes",
      "Contrastes e Diagnóstico",
      "Hemoderivados e Biológicos",
      "Gastrointestinal e Antieméticos",
      "Outros Medicamentos",
    ],
  },
  {
    nome: "Materiais Médico-Hospitalares",
    children: [
      "Agulhas e Cateteres",
      "Seringas e Infusão",
      "Tubos, Sondas e Via Aérea",
      "Curativos, Gazes e Compressas",
      "Luvas",
      "Paramentação e Proteção",
      "Kits, Campos e Coberturas Cirúrgicas",
      "Conectores, Equipos e Extensores",
      "Drenos, Coletores e Bolsas",
      "Fios, Suturas e Hemostáticos",
      "Outros Materiais",
    ],
  },
  {
    nome: "Higiene, Antissepsia e Limpeza",
    children: [
      "Álcool e Antissépticos",
      "Desinfecção e Limpeza",
      "Saneantes e Utilidades",
    ],
  },
  {
    nome: "Equipamentos e Instrumentais",
    children: [
      "Equipamentos de Monitoramento",
      "Instrumentais e Acessórios",
      "Outros Equipamentos",
    ],
  },
  {
    nome: "Diversos e Revisão Cadastral",
    children: [
      "Revisar Classificação",
      "Outros Produtos",
    ],
  },
];

const plan = JSON.parse(await fs.readFile(planPath, "utf8"));
const products = plan.products.map((item) => ({
  codigo: item.data.codigoInterno || "",
  descricao: item.data.descricao || "",
  marca: item.data.marca || "",
  ncm: item.data.ncm || "",
  linhasFonte: item.sourceRows?.join(" | ") || "",
  categoriaLegadoId: item.data.categoriaLegadoId || "",
  subcategoriaLegadoId: item.data.subcategoriaLegadoId || "",
}));

try {
  let existing = [];
  let dbError = null;
  try {
    existing = await prisma.categoria.findMany({
      where: { empresaId: EMPRESA_ID, ativo: true },
      orderBy: [{ parentId: "asc" }, { nome: "asc" }],
    });
  } catch (error) {
    dbError = error instanceof Error ? error.message : String(error);
    if (execute) throw error;
  }

  const operations = [];

  for (const macro of taxonomy) {
    const parent = findExisting(existing, macro.nome, null);
    if (parent) {
      operations.push({ action: "reuse", nome: macro.nome, parent: null, id: parent.id });
    } else {
      operations.push({ action: "create", nome: macro.nome, parent: null });
    }

    for (const child of macro.children) {
      const parentId = parent?.id ?? null;
      const childExisting = parentId ? findExisting(existing, child, parentId) : null;
      operations.push({
        action: childExisting ? "reuse" : "create",
        nome: child,
        parent: macro.nome,
        id: childExisting?.id,
      });
    }
  }

  let created = [];
  let finalCategories = existing;

  if (execute) {
    created = await createMissingCategories(existing);
    finalCategories = await prisma.categoria.findMany({
      where: { empresaId: EMPRESA_ID, ativo: true },
      orderBy: [{ parentId: "asc" }, { nome: "asc" }],
    });
  }

  const categoryLookup = buildLookup(finalCategories);
  const mappings = products.map((product) => {
    const classified = classifyProduct(product.descricao);
    const category = categoryLookup.get(`${classified.macro} > ${classified.subcategoria}`);
    return {
      codigo: product.codigo,
      descricao: product.descricao,
      macroCategoria: classified.macro,
      subcategoria: classified.subcategoria,
      categoriaId: category?.id || null,
      confianca: classified.confianca,
      regra: classified.regra,
      marca: product.marca,
      ncm: product.ncm,
      categoriaLegadoId: product.categoriaLegadoId,
      subcategoriaLegadoId: product.subcategoriaLegadoId,
      linhasFonte: product.linhasFonte,
    };
  });

  const categoryCounts = summarizeMappings(mappings);
  const report = {
    mode: execute ? "execute" : "dry-run",
    empresaId: EMPRESA_ID,
    dbError,
    existingCategories: existing.length,
    taxonomyMacros: taxonomy.length,
    taxonomySubcategories: taxonomy.reduce((sum, item) => sum + item.children.length, 0),
    categoriesCreated: created.length,
    categoriesToCreate: execute ? 0 : await countMissing(existing),
    operations,
    categoryCounts,
  };

  await fs.writeFile(path.join(outputDir, "taxonomia_categorias_854968.json"), JSON.stringify({ report, taxonomy }, null, 2));
  await fs.writeFile(path.join(outputDir, "mapa_produtos_categorias_854968.csv"), toCsv([
    ["codigo", "descricao", "macroCategoria", "subcategoria", "categoriaId", "confianca", "regra", "marca", "ncm", "categoriaLegadoId", "subcategoriaLegadoId", "linhasFonte"],
    ...mappings.map((item) => [
      item.codigo,
      item.descricao,
      item.macroCategoria,
      item.subcategoria,
      item.categoriaId ?? "",
      item.confianca,
      item.regra,
      item.marca,
      item.ncm,
      item.categoriaLegadoId,
      item.subcategoriaLegadoId,
      item.linhasFonte,
    ]),
  ]));

  printReport(report);
} finally {
  await prisma.$disconnect();
}

async function createMissingCategories(existingInitial) {
  const created = [];
  const cats = [...existingInitial];

  for (const macro of taxonomy) {
    let parent = findExisting(cats, macro.nome, null);
    if (!parent) {
      parent = await prisma.categoria.create({
        data: {
          nome: macro.nome,
          empresaId: EMPRESA_ID,
          ativo: true,
          parentId: null,
        },
      });
      cats.push(parent);
      created.push(parent);
    } else if (parent.nome !== macro.nome) {
      parent = await prisma.categoria.update({
        where: { id: parent.id },
        data: { nome: macro.nome },
      });
      const index = cats.findIndex((cat) => cat.id === parent.id);
      cats[index] = parent;
    }

    for (const child of macro.children) {
      let sub = findExisting(cats, child, parent.id);
      if (!sub) {
        sub = await prisma.categoria.create({
          data: {
            nome: child,
            empresaId: EMPRESA_ID,
            ativo: true,
            parentId: parent.id,
          },
        });
        cats.push(sub);
        created.push(sub);
      }
    }
  }

  return created;
}

async function countMissing(existing) {
  let count = 0;
  const temp = [...existing];
  for (const macro of taxonomy) {
    const parent = findExisting(temp, macro.nome, null);
    if (!parent) count += 1;
    for (const child of macro.children) {
      if (!parent || !findExisting(temp, child, parent.id)) count += 1;
    }
  }
  return count;
}

function findExisting(categories, nome, parentId) {
  const wanted = normalize(nome);
  return categories.find((cat) => normalize(cat.nome) === wanted && (cat.parentId ?? null) === (parentId ?? null));
}

function buildLookup(categories) {
  const byId = new Map(categories.map((cat) => [cat.id, cat]));
  const lookup = new Map();
  for (const cat of categories) {
    if (!cat.parentId) continue;
    const parent = byId.get(cat.parentId);
    if (!parent) continue;
    lookup.set(`${parent.nome} > ${cat.nome}`, cat);
  }
  return lookup;
}

function classifyProduct(description) {
  const text = normalize(description);
  const has = (...terms) => terms.some((term) => text.includes(normalize(term)));

  if (has("AGULHA", "CATETER JELCO", "PERICAN", "SCALP")) return cat("Materiais Médico-Hospitalares", "Agulhas e Cateteres", "alta", "agulha/cateter");
  if (has("SERINGA")) return cat("Materiais Médico-Hospitalares", "Seringas e Infusão", "alta", "seringa");
  if (has("EQUIPO", "EXTENSOR", "POLIFIX", "TORNEIRINHA", "CONECTOR", "ADAPTADOR", "INFUSAO")) return cat("Materiais Médico-Hospitalares", "Conectores, Equipos e Extensores", "alta", "infusão/conector");
  if (has("TUBO ENDOTRAQUEAL", "SONDA", "CANULA", "MASCARA", "CIRCUITO", "TRAQUEOSTOMIA", "VIA AEREA")) return cat("Materiais Médico-Hospitalares", "Tubos, Sondas e Via Aérea", "alta", "via aérea/sonda");
  if (has("COMPRESSA", "GAZE", "CURATIVO", "ATADURA", "ALGODAO", "BANDAGEM")) return cat("Materiais Médico-Hospitalares", "Curativos, Gazes e Compressas", "alta", "curativo/gaze");
  if (has("LUVA")) return cat("Materiais Médico-Hospitalares", "Luvas", "alta", "luva");
  if (has("AVENTAL", "MASCARA DESC", "TOUCA", "PROPÉ", "PROPE", "CAPOTE", "CAMPO", "WRAP")) return cat("Materiais Médico-Hospitalares", "Paramentação e Proteção", "alta", "paramentação");
  if (has("KIT CIRURGICO", "KIT CIRÚRGICO", "COBERTURA", "CAMPO CIRURGICO", "BORNAL")) return cat("Materiais Médico-Hospitalares", "Kits, Campos e Coberturas Cirúrgicas", "alta", "kit/campo cirúrgico");
  if (has("DRENO", "COLETOR", "BOLSA COLETORA", "URINA")) return cat("Materiais Médico-Hospitalares", "Drenos, Coletores e Bolsas", "alta", "dreno/coletor");
  if (has("FIO", "SUTURA", "HEMOSTATICO", "SURGICEL")) return cat("Materiais Médico-Hospitalares", "Fios, Suturas e Hemostáticos", "média", "fio/sutura/hemostático");

  if (has("ALCOOL", "ÁLCOOL", "CLOREXIDINA", "PVPI", "DEGERMANTE", "ANTISSEPTICO", "ANTISSÉPTICO")) return cat("Higiene, Antissepsia e Limpeza", "Álcool e Antissépticos", "alta", "antisséptico");
  if (has("DESINFETANTE", "RIOQUIMICA", "SABONETE", "DETERGENTE", "LIMPEZA")) return cat("Higiene, Antissepsia e Limpeza", "Desinfecção e Limpeza", "média", "limpeza/desinfecção");

  if (has("APARELHO DE PRESSAO", "APARELHO DE PRESSÃO", "ESTETO", "OXIMETRO", "TERMOMETRO")) return cat("Equipamentos e Instrumentais", "Equipamentos de Monitoramento", "alta", "equipamento monitoramento");
  if (has("PINCA", "TESOURA", "CUBA", "BANDEJA", "INSTRUMENTAL")) return cat("Equipamentos e Instrumentais", "Instrumentais e Acessórios", "alta", "instrumental");

  if (has("AMOXICILINA", "CLAVULANATO", "CIPROFLOXACINO", "MEROPENEM", "VANCOMICINA", "CEFTAZIDIMA", "CEFTRIAXONA", "CEFEPIME", "PIPERACILINA", "TAZOBACTAM", "CLINDAMICINA", "METRONIDAZOL", "FLUCONAZOL", "ACICLOVIR", "POLIMIXINA")) return cat("Medicamentos", "Antibióticos e Antimicrobianos", "alta", "antimicrobiano");
  if (has("PROPOFOL", "MIDAZOLAM", "FENTANILA", "DEXMEDETOMIDINA", "LIDOCAINA", "ROPIVACAINA", "BUPIVACAINA", "ESCETAMINA", "KETAMIN", "MORFINA", "TRAMADOL", "SUXAMETONIO", "SUGAMADEX", "ATRACURIO", "ROCURONIO")) return cat("Medicamentos", "Anestésicos, Analgésicos e Sedação", "alta", "anestesia/sedação");
  if (has("ENOXAPARINA", "HEPARINA", "TRANEXAMICO", "FITOMENADIONA", "VITAMINA K", "ALTEPLASE")) return cat("Medicamentos", "Anticoagulantes e Hemostáticos", "alta", "coagulação/hemostasia");
  if (has("ADRENALINA", "AMIODARONA", "DOBUTAMINA", "NORADRENALINA", "DOPAMINA", "ATROPINA", "NITROGLICERINA", "NITROPRUSSIATO", "VASOPRESSINA", "EFEDRINA")) return cat("Medicamentos", "Cardiovascular e Emergência", "alta", "cardiovascular/emergência");
  if (has("HIDROCORTISONA", "DEXAMETASONA", "METILPREDNISOLONA", "CETOPROFENO", "DIPIRONA", "PARACETAMOL", "TENÓXICAM", "TENOXICAM")) return cat("Medicamentos", "Corticoides e Anti-inflamatórios", "alta", "corticoide/anti-inflamatório");
  if (has("CLORETO DE SODIO", "CLORETO SODIO", "GLICOSE", "AGUA PARA INJECAO", "ÁGUA PARA INJEÇÃO", "AGUA DESTILADA", "ÁGUA DESTILADA", "RINGER", "MANITOL", "BICARBONATO", "POTASSIO", "SODIO", "SORO", "ELETROLIT")) return cat("Medicamentos", "Soluções, Eletrólitos e Diluentes", "alta", "solução/eletrólito");
  if (has("CONTRASTE", "OMNIPAQUE", "HENETIX", "IOHEXOL")) return cat("Medicamentos", "Contrastes e Diagnóstico", "alta", "contraste/diagnóstico");
  if (has("ALBUMINA", "ALFAPOETINA", "IMUNOGLOBULINA", "HEMODERIVADO")) return cat("Medicamentos", "Hemoderivados e Biológicos", "alta", "biológico/hemoderivado");
  if (has("OMEPRAZOL", "ONDANSETRONA", "METOCLOPRAMIDA", "RANITIDINA", "BROMOPRIDA", "DIMENIDRINATO")) return cat("Medicamentos", "Gastrointestinal e Antieméticos", "alta", "gastrointestinal/antiemético");

  if (looksLikeMedication(text)) return cat("Medicamentos", "Outros Medicamentos", "baixa", "padrão medicamentoso");
  if (looksLikeMaterial(text)) return cat("Materiais Médico-Hospitalares", "Outros Materiais", "baixa", "padrão material");
  return cat("Diversos e Revisão Cadastral", "Revisar Classificação", "baixa", "sem regra forte");
}

function cat(macro, subcategoria, confianca, regra) {
  return { macro, subcategoria, confianca, regra };
}

function looksLikeMedication(text) {
  return /\b(MG|MCG|UI|ML|G\/L|MG\/ML|%)\b/.test(text);
}

function looksLikeMaterial(text) {
  return /\b(CX|PCT|ESTERIL|DESCARTAVEL|TAM|MM|GAUGE|G)\b/.test(text);
}

function summarizeMappings(mappings) {
  const map = new Map();
  for (const item of mappings) {
    const key = `${item.macroCategoria} > ${item.subcategoria}`;
    if (!map.has(key)) map.set(key, { categoria: key, quantidade: 0, baixaConfianca: 0 });
    const current = map.get(key);
    current.quantidade += 1;
    if (item.confianca === "baixa") current.baixaConfianca += 1;
  }
  return [...map.values()].sort((a, b) => b.quantidade - a.quantidade || a.categoria.localeCompare(b.categoria, "pt-BR"));
}

function categoryKey(nome, parentId) {
  return `${normalize(nome)}::${parentId ?? "root"}`;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function toCsv(rows) {
  return rows.map((row) => row.map((value) => {
    const text = String(value ?? "");
    return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }).join(",")).join("\n") + "\n";
}

function printReport(report) {
  console.log("Taxonomia de produtos 854968");
  console.log("----------------------------");
  console.log(`Modo: ${report.mode}`);
  console.log(`EmpresaId: ${report.empresaId}`);
  console.log(`Categorias existentes: ${report.existingCategories}`);
  console.log(`Macros planejadas: ${report.taxonomyMacros}`);
  console.log(`Subcategorias planejadas: ${report.taxonomySubcategories}`);
  console.log(`Categorias criadas: ${report.categoriesCreated}`);
  console.log(`Categorias a criar: ${report.categoriesToCreate}`);
  if (report.dbError) {
    console.log(`Banco: indisponivel para simulacao com IDs (${report.dbError.split("\n").filter(Boolean).slice(-1)[0]})`);
  }
  console.log("");
  console.log("Distribuicao inicial dos produtos:");
  for (const item of report.categoryCounts.slice(0, 20)) {
    console.log(`- ${item.categoria}: ${item.quantidade}${item.baixaConfianca ? ` (${item.baixaConfianca} baixa confianca)` : ""}`);
  }
}
