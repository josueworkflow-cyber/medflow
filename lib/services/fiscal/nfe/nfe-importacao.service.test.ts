import { test, describe, mock, before, afterEach } from "node:test";
import assert from "node:assert";
import { prisma } from "@/lib/prisma";
import { NFeImportacaoService, deps } from "./nfe-importacao.service";
import { StatusDocumentoFiscal } from "@prisma/client";

describe("NFeImportacaoService - Testes Unitários (Sprint B, Tarefa 1)", () => {
  let originalFindUniqueDoc: any;
  let originalFindFirstDoc: any;
  let originalFindFirstFornecedor: any;
  let originalCreateFornecedor: any;
  let originalTransaction: any;
  let originalParseXML: any;

  before(() => {
    originalFindUniqueDoc = (prisma.documentoFiscal as any).findUnique;
    originalFindFirstDoc = (prisma.documentoFiscal as any).findFirst;
    originalFindFirstFornecedor = (prisma.fornecedor as any).findFirst;
    originalCreateFornecedor = (prisma.fornecedor as any).create;
    originalTransaction = (prisma as any).$transaction;
    originalParseXML = deps.parseNFeXML;
  });

  afterEach(() => {
    (prisma.documentoFiscal as any).findUnique = originalFindUniqueDoc;
    (prisma.documentoFiscal as any).findFirst = originalFindFirstDoc;
    (prisma.fornecedor as any).findFirst = originalFindFirstFornecedor;
    (prisma.fornecedor as any).create = originalCreateFornecedor;
    (prisma as any).$transaction = originalTransaction;
    (deps as any).parseNFeXML = originalParseXML;
    mock.reset();
  });

  test("Teste 1: XML válido com fornecedor existente e produto encontrado por EAN → importa com sucesso", async () => {
    const mockNFeData = {
      chave: "33260600000000000191550010000000011000000001",
      numero: "1",
      dataEmissao: "2026-06-10T12:00:00-03:00",
      emitente: {
        cnpj: "00000000000191",
        razaoSocial: "Emitente Teste Ltda",
        nomeFantasia: "Emitente Teste",
        logradouro: "Rua Teste",
        numero: "123",
        bairro: "Bairro Teste",
        cidade: "Rio de Janeiro",
        uf: "RJ",
        cep: "20000000",
      },
      produtos: [
        {
          codigo: "PROD1",
          ean: "7890000000001",
          descricao: "Medicamento Valido",
          ncm: "30049099",
          cfop: "5102",
          unidade: "UN",
          quantidade: 10,
          valorUnitario: 5.5,
          valorTotal: 55.0,
          lote: "LOTE1",
          validade: "2026-12-31",
        },
      ],
      valorTotal: 55.0,
    };

    // Mock do parser no deps
    mock.method(deps, "parseNFeXML", () => mockNFeData);

    // Mock do banco de dados fora de transação
    (prisma.documentoFiscal as any).findFirst = async () => null; // Chave não importada ainda
    (prisma.fornecedor as any).findFirst = async () => ({ id: 100, razaoSocial: "Emitente Teste Ltda" }); // Fornecedor já existe
    (prisma.fornecedor as any).create = mock.fn(async () => ({ id: 100 }));

    // Mock transação
    const updateEstoqueMock = mock.fn(async () => ({}));
    const createMovMock = mock.fn(async () => ({}));
    const upsertLoteMock = mock.fn(async () => ({ id: 200 }));
    const createDocMock = mock.fn(async () => ({ id: 300 }));

    (prisma as any).$transaction = async (cb: any) => {
      const mockTx: any = {
        produto: {
          findFirst: mock.fn(async () => ({ id: 15, descricao: "Medicamento Valido", controlaLote: true })),
        },
        lote: {
          upsert: upsertLoteMock,
        },
        movimentacaoEstoque: {
          create: createMovMock,
        },
        estoqueAtual: {
          findFirst: mock.fn(async () => ({ id: 400, quantidadeDisponivel: 5, custoUnitario: 5.0 })),
          update: updateEstoqueMock,
          create: mock.fn(async () => ({})),
        },
        documentoFiscal: {
          create: createDocMock,
        },
      };
      return cb(mockTx);
    };

    const res = await NFeImportacaoService.importarNFeEntrada("Base64String", 1);

    assert.strictEqual(res.sucesso, true);
    assert.strictEqual(res.documentoFiscalId, 300);
    assert.strictEqual(res.fornecedorCriado, false);
    assert.strictEqual(res.itensImportados, 1);
    assert.strictEqual(res.itensPendentes.length, 0);

    // Verifica que não tentou criar fornecedor
    assert.strictEqual((prisma.fornecedor as any).create.mock.calls.length, 0);

    // Verifica que criou DocumentoFiscal como NFE_ENTRADA e empresaFiscalId = null
    assert.strictEqual(createDocMock.mock.calls.length, 1);
    const docArgs = createDocMock.mock.calls[0].arguments[0];
    assert.strictEqual(docArgs.data.tipo, "NFE_ENTRADA");
    assert.strictEqual(docArgs.data.status, StatusDocumentoFiscal.AUTORIZADA);
    assert.strictEqual(docArgs.data.empresaFiscalId, null);

    // Verifica incremento no estoqueAtual
    assert.strictEqual(updateEstoqueMock.mock.calls.length, 1);
    const updateArgs = updateEstoqueMock.mock.calls[0].arguments[0];
    assert.strictEqual(updateArgs.data.quantidadeDisponivel.increment, 10);
  });

  test("Teste 2: XML válido com fornecedor não cadastrado → cria fornecedor automaticamente", async () => {
    const mockNFeData = {
      chave: "33260600000000000191550010000000011000000002",
      numero: "2",
      dataEmissao: "2026-06-10T12:00:00-03:00",
      emitente: {
        cnpj: "99999999000199",
        razaoSocial: "Novo Fornecedor S/A",
        nomeFantasia: "Novo Fornecedor",
        logradouro: "Av das Americas",
        numero: "400",
        bairro: "Barra",
        cidade: "Rio de Janeiro",
        uf: "RJ",
        cep: "22000000",
      },
      produtos: [],
      valorTotal: 0.0,
    };

    mock.method(deps, "parseNFeXML", () => mockNFeData);

    (prisma.documentoFiscal as any).findFirst = async () => null;
    (prisma.fornecedor as any).findFirst = async () => null; // Fornecedor NÃO existe
    
    const createFornecedorMock = mock.fn(async () => ({ id: 500, cnpj: "99999999000199" }));
    (prisma.fornecedor as any).create = createFornecedorMock;

    (prisma as any).$transaction = async (cb: any) => {
      const mockTx: any = {
        documentoFiscal: {
          create: mock.fn(async () => ({ id: 300 })),
        },
      };
      return cb(mockTx);
    };

    const res = await NFeImportacaoService.importarNFeEntrada("Base64", 1);

    assert.strictEqual(res.fornecedorCriado, true);
    assert.strictEqual(res.fornecedorId, 500);
    assert.strictEqual(createFornecedorMock.mock.calls.length, 1);

    // Valida que salvou o endereço de forma estruturada no novo fornecedor
    const fornArgs = createFornecedorMock.mock.calls[0].arguments[0];
    assert.strictEqual(fornArgs.data.cnpj, "99999999000199");
    assert.strictEqual(fornArgs.data.logradouro, "Av das Americas");
    assert.strictEqual(fornArgs.data.numero, "400");
    assert.strictEqual(fornArgs.data.bairro, "Barra");
    assert.strictEqual(fornArgs.data.estado, "RJ");
  });

  test("Teste 3: XML com produto não cadastrado por EAN nem por código → item vai para itensPendentes, não lança erro", async () => {
    const mockNFeData = {
      chave: "33260600000000000191550010000000011000000003",
      numero: "3",
      produtos: [
        {
          codigo: "FABRIC-999",
          ean: "7890000000999",
          descricao: "Produto Inexistente no Sistema",
          ncm: "30049099",
          quantidade: 2,
          valorUnitario: 100.0,
          valorTotal: 200.0,
          lote: "LOTE999",
        },
      ],
      emitente: { cnpj: "00000000000191" },
      valorTotal: 200.0,
    };

    mock.method(deps, "parseNFeXML", () => mockNFeData);

    (prisma.documentoFiscal as any).findFirst = async () => null;
    (prisma.fornecedor as any).findFirst = async () => ({ id: 100 });

    (prisma as any).$transaction = async (cb: any) => {
      const mockTx: any = {
        produto: {
          findFirst: mock.fn(async () => null), // Não encontrou nem por EAN nem por Código
        },
        documentoFiscal: {
          create: mock.fn(async () => ({ id: 300 })),
        },
      };
      return cb(mockTx);
    };

    const res = await NFeImportacaoService.importarNFeEntrada("Base64", 1);

    assert.strictEqual(res.sucesso, true);
    assert.strictEqual(res.itensImportados, 0); // Não foi importado
    assert.strictEqual(res.itensPendentes.length, 1);
    assert.strictEqual(res.itensPendentes[0].descricao, "Produto Inexistente no Sistema");
    assert.strictEqual(res.itensPendentes[0].codigoFornecedor, "FABRIC-999");
  });

  test("Teste 4: XML com produto que tem controlaLote = true mas sem <rastro> → importa e adiciona em alertasLote", async () => {
    const mockNFeData = {
      chave: "33260600000000000191550010000000011000000004",
      numero: "4",
      produtos: [
        {
          codigo: "PROD2",
          ean: "7890000000002",
          descricao: "Produto Com Lote Ausente",
          ncm: "30049099",
          quantidade: 50,
          valorUnitario: 10.0,
          valorTotal: 500.0,
          lote: undefined, // Ausente no XML
        },
      ],
      emitente: { cnpj: "00000000000191" },
      valorTotal: 500.0,
    };

    mock.method(deps, "parseNFeXML", () => mockNFeData);

    (prisma.documentoFiscal as any).findFirst = async () => null;
    (prisma.fornecedor as any).findFirst = async () => ({ id: 100 });

    const createMovMock = mock.fn(async () => ({}));
    (prisma as any).$transaction = async (cb: any) => {
      const mockTx: any = {
        produto: {
          findFirst: mock.fn(async () => ({ id: 25, descricao: "Produto Com Lote Ausente", controlaLote: true })),
        },
        movimentacaoEstoque: {
          create: createMovMock,
        },
        estoqueAtual: {
          findFirst: mock.fn(async () => null),
          create: mock.fn(async () => ({})),
        },
        documentoFiscal: {
          create: mock.fn(async () => ({ id: 300 })),
        },
      };
      return cb(mockTx);
    };

    const res = await NFeImportacaoService.importarNFeEntrada("Base64", 1);

    assert.strictEqual(res.sucesso, true);
    assert.strictEqual(res.itensImportados, 1);
    assert.strictEqual(res.alertasLote.length, 1);
    assert.match(res.alertasLote[0], /exige controle de lote mas o XML não contém informação/);

    // Valida que a movimentação foi criada com loteId = null
    const movArgs = createMovMock.mock.calls[0].arguments[0];
    assert.strictEqual(movArgs.data.loteId, null);
  });

  test("Teste 5: Nota já importada (mesma chave de acesso) → lança 'Nota fiscal já importada anteriormente'", async () => {
    const mockNFeData = {
      chave: "33260600000000000191550010000000011000000005",
      numero: "5",
      emitente: { cnpj: "00000000000191" },
    };

    mock.method(deps, "parseNFeXML", () => mockNFeData);

    // Nota já consta no banco
    (prisma.documentoFiscal as any).findFirst = async () => ({ id: 500, chaveAcesso: "33260600000000000191550010000000011000000005" });

    await assert.rejects(
      NFeImportacaoService.importarNFeEntrada("Base64", 1),
      /Nota fiscal já importada anteriormente/
    );
  });

  test("Teste 6: XML com lote cuja validade é anterior a hoje → cria lote com status VENCIDO", async () => {
    const dataOntem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // Ontem
    
    const mockNFeData = {
      chave: "33260600000000000191550010000000011000000006",
      numero: "6",
      produtos: [
        {
          codigo: "PROD3",
          ean: "7890000000003",
          descricao: "Medicamento Vencendo",
          ncm: "30049099",
          quantidade: 5,
          valorUnitario: 20.0,
          valorTotal: 100.0,
          lote: "LOTE-EXPIRADO",
          validade: dataOntem,
        },
      ],
      emitente: { cnpj: "00000000000191" },
      valorTotal: 100.0,
    };

    mock.method(deps, "parseNFeXML", () => mockNFeData);

    (prisma.documentoFiscal as any).findFirst = async () => null;
    (prisma.fornecedor as any).findFirst = async () => ({ id: 100 });

    const upsertLoteMock = mock.fn(async () => ({ id: 777 }));
    const createEstoqueMock = mock.fn(async () => ({}));

    (prisma as any).$transaction = async (cb: any) => {
      const mockTx: any = {
        produto: {
          findFirst: mock.fn(async () => ({ id: 35, descricao: "Medicamento Vencendo", controlaLote: true })),
        },
        lote: {
          upsert: upsertLoteMock,
        },
        movimentacaoEstoque: {
          create: mock.fn(async () => ({})),
        },
        estoqueAtual: {
          findFirst: mock.fn(async () => null),
          create: createEstoqueMock,
        },
        documentoFiscal: {
          create: mock.fn(async () => ({ id: 300 })),
        },
      };
      return cb(mockTx);
    };

    await NFeImportacaoService.importarNFeEntrada("Base64", 1);

    // Valida que o lote foi criado com status VENCIDO
    assert.strictEqual(upsertLoteMock.mock.calls.length, 1);
    const loteArgs = upsertLoteMock.mock.calls[0].arguments[0];
    assert.strictEqual(loteArgs.create.status, "VENCIDO");
    assert.strictEqual(loteArgs.update.status, "VENCIDO");

    // Valida que o estoqueAtual correspondente também foi criado com status VENCIDO (Tarefa 2)
    assert.strictEqual(createEstoqueMock.mock.calls.length, 1);
    const estArgs = createEstoqueMock.mock.calls[0].arguments[0];
    assert.strictEqual(estArgs.data.status, "VENCIDO");
  });

  test("Teste 7 (Rollback & Decisão de Design): Rollback ocorre apenas dentro da $transaction; fornecedor fora da transação é mantido", async () => {
    const mockNFeData = {
      chave: "33260600000000000191550010000000011000000007",
      numero: "7",
      produtos: [
        {
          codigo: "PROD4",
          ean: "7890000000004",
          descricao: "Medicamento Com Erro",
          ncm: "30049099",
          quantidade: 5,
          valorUnitario: 20.0,
          valorTotal: 100.0,
          lote: "LOTE-ERR",
        },
      ],
      emitente: { cnpj: "88888888000188" }, // Fornecedor novo
      valorTotal: 100.0,
    };

    mock.method(deps, "parseNFeXML", () => mockNFeData);

    (prisma.documentoFiscal as any).findFirst = async () => null;
    (prisma.fornecedor as any).findFirst = async () => null; // Fornecedor novo!
    
    const createFornecedorMock = mock.fn(async () => ({ id: 888, cnpj: "88888888000188" }));
    (prisma.fornecedor as any).create = createFornecedorMock;

    // Simula falha catastrófica no meio da transação
    (prisma as any).$transaction = async (cb: any) => {
      const mockTx: any = {
        produto: {
          findFirst: mock.fn(async () => {
            throw new Error("Erro catastrófico simulado dentro da transação");
          }),
        },
      };
      return cb(mockTx);
    };

    // O serviço deve propagar o erro e falhar
    await assert.rejects(
      NFeImportacaoService.importarNFeEntrada("Base64", 1),
      /Erro catastrófico simulado dentro da transação/
    );

    // Como decisão de design, o fornecedor criado FORA da transação permanece cadastrado
    assert.strictEqual(createFornecedorMock.mock.calls.length, 1);
  });
});
