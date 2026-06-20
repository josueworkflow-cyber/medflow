import { test, describe } from "node:test";
import assert from "node:assert";
import {
  calcularDiasRestantes,
  formatarDiasCobertura,
  calcularMargemMedia,
  filtrarPorStatus,
  gerarCsvMargem,
  MargemProduto
} from "./relatorios.utils";

describe("Relatórios Utilities - Testes Unitários", () => {
  
  test("calcularDiasRestantes: datas futuras, passadas e hoje", () => {
    // 1. Data Futura (amanhã)
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
    assert.strictEqual(calcularDiasRestantes(amanha), 1);

    // 2. Data Futura (daqui a 5 dias)
    const daqui5dias = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    assert.strictEqual(calcularDiasRestantes(daqui5dias), 5);

    // 3. Data Passada (ontem)
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
    assert.strictEqual(calcularDiasRestantes(ontem), -1);

    // 4. Data Passada (há 10 dias)
    const ha10dias = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    assert.strictEqual(calcularDiasRestantes(ha10dias), -10);

    // 5. Caso de Teste 3: validade = hoje -> retorna 0
    const hoje = new Date();
    assert.strictEqual(calcularDiasRestantes(hoje), 0);
  });

  test("formatarDiasCobertura: 999 retorna '∞' e outros números retornam string", () => {
    assert.strictEqual(formatarDiasCobertura(999), "∞");
    assert.strictEqual(formatarDiasCobertura(0), "0");
    assert.strictEqual(formatarDiasCobertura(15), "15");
    assert.strictEqual(formatarDiasCobertura(120), "120");
  });

  test("calcularMargemMedia: calcula média aritmética das margens", () => {
    const produtos = [
      { margem: 10.0 },
      { margem: 20.0 },
      { margem: 30.0 }
    ];
    assert.strictEqual(calcularMargemMedia(produtos), 20.0);

    const produtosVazio: { margem: number }[] = [];
    assert.strictEqual(calcularMargemMedia(produtosVazio), 0);

    const produtosDecimais = [
      { margem: 15.55 },
      { margem: 22.33 }
    ]; // (15.55 + 22.33) / 2 = 18.94
    assert.strictEqual(calcularMargemMedia(produtosDecimais), 18.94);
  });

  test("filtrarPorStatus: status 'todos' ou correspondências específicas", () => {
    const items = [
      { id: 1, status: "NEGATIVA" },
      { id: 2, status: "BAIXA" },
      { id: 3, status: "NORMAL" },
      { id: 4, status: "ALTA" }
    ];

    // todos
    assert.deepStrictEqual(filtrarPorStatus(items, "todos"), items);
    assert.deepStrictEqual(filtrarPorStatus(items, "TODOS"), items);

    // Filtros específicos
    assert.deepStrictEqual(filtrarPorStatus(items, "NEGATIVA"), [{ id: 1, status: "NEGATIVA" }]);
    assert.deepStrictEqual(filtrarPorStatus(items, "ALTA"), [{ id: 4, status: "ALTA" }]);
  });

  test("gerarCsvMargem: gera conteúdo CSV com cabeçalho e produtos formatados", () => {
    const produtos: MargemProduto[] = [
      {
        codigoInterno: "PROD01",
        descricao: "Dipirona",
        categoria: "Gerais",
        precoCustoBase: 5.0,
        precoVendaBase: 10.0,
        lucroUnitario: 5.0,
        margem: 50.0,
        markup: 100.0,
        status: "ALTA"
      }
    ];

    const expectedHeader = "Codigo;Produto;Categoria;Custo;Preco Venda;Lucro Unitario;Margem (%);Markup (%);Status\n";
    const expectedLine = "PROD01;Dipirona;Gerais;5;10;5;50;100;ALTA\n";

    const csv = gerarCsvMargem(produtos);
    assert.strictEqual(csv, expectedHeader + expectedLine);
  });
});
