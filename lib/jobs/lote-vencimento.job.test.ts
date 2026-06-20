import { test, describe, mock, before, afterEach } from "node:test";
import assert from "node:assert";
import { prisma } from "@/lib/prisma";
import { atualizarLotesVencidos } from "./lote-vencimento.job";

describe("Job de Vencimento de Lotes", () => {
  let originalFindManyLote: any;
  let originalUpdateLote: any;
  let originalUpdateManyEstoque: any;
  let originalCreateMov: any;
  let originalTransaction: any;

  before(() => {
    originalFindManyLote = (prisma.lote as any).findMany;
    originalUpdateLote = (prisma.lote as any).update;
    originalUpdateManyEstoque = (prisma.estoqueAtual as any).updateMany;
    originalCreateMov = (prisma.movimentacaoEstoque as any).create;
    originalTransaction = (prisma as any).$transaction;
  });

  afterEach(() => {
    (prisma.lote as any).findMany = originalFindManyLote;
    (prisma.lote as any).update = originalUpdateLote;
    (prisma.estoqueAtual as any).updateMany = originalUpdateManyEstoque;
    (prisma.movimentacaoEstoque as any).create = originalCreateMov;
    (prisma as any).$transaction = originalTransaction;
    mock.reset();
  });

  test("Lote com validade ontem e status DISPONIVEL → deve ser atualizado para VENCIDO", async () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const mockLote = {
      id: 1,
      produtoId: 101,
      numeroLote: "LOTE-VENCIDO",
      validade: ontem,
      status: "DISPONIVEL",
      estoqueAtual: [{ id: 11, quantidadeDisponivel: 5.5 }]
    };

    let findManyCalled = false;
    (prisma.lote as any).findMany = async (args: any) => {
      findManyCalled = true;
      assert.ok(args.where.validade.lt);
      assert.deepStrictEqual(args.where.status.in, ["DISPONIVEL", "QUARENTENA"]);
      return [mockLote];
    };

    const mockTx: any = {
      lote: { update: mock.fn(async () => ({})) },
      estoqueAtual: { updateMany: mock.fn(async () => ({})) },
      movimentacaoEstoque: { create: mock.fn(async () => ({})) }
    };
    (prisma as any).$transaction = async (cb: any) => cb(mockTx);

    await atualizarLotesVencidos();

    assert.ok(findManyCalled);
    assert.strictEqual(mockTx.lote.update.mock.calls.length, 1);
    assert.strictEqual(mockTx.lote.update.mock.calls[0].arguments[0].data.status, "VENCIDO");
    assert.strictEqual(mockTx.estoqueAtual.updateMany.mock.calls.length, 1);
    assert.strictEqual(mockTx.estoqueAtual.updateMany.mock.calls[0].arguments[0].data.status, "VENCIDO");
    assert.strictEqual(mockTx.movimentacaoEstoque.create.mock.calls.length, 1);
    assert.strictEqual(mockTx.movimentacaoEstoque.create.mock.calls[0].arguments[0].data.tipo, "BLOQUEIO");
  });

  test("Lote com validade amanhã e status DISPONIVEL → não deve ser alterado", async () => {
    let findManyArgs: any = null;
    (prisma.lote as any).findMany = async (args: any) => {
      findManyArgs = args;
      return [];
    };
    (prisma as any).$transaction = mock.fn();

    await atualizarLotesVencidos();

    assert.ok(findManyArgs);
    assert.ok(findManyArgs.where.validade.lt);
    assert.strictEqual((prisma as any).$transaction.mock.calls.length, 0);
  });

  test("Lote já com status VENCIDO → não deve ser processado novamente", async () => {
    let findManyArgs: any = null;
    (prisma.lote as any).findMany = async (args: any) => {
      findManyArgs = args;
      return [];
    };
    (prisma as any).$transaction = mock.fn();

    await atualizarLotesVencidos();

    assert.ok(findManyArgs);
    assert.deepStrictEqual(findManyArgs.where.status.in, ["DISPONIVEL", "QUARENTENA"]);
    assert.strictEqual((prisma as any).$transaction.mock.calls.length, 0);
  });

  test("Lote com status BLOQUEADO → não deve ser alterado pelo job", async () => {
    let findManyArgs: any = null;
    (prisma.lote as any).findMany = async (args: any) => {
      findManyArgs = args;
      return [];
    };
    (prisma as any).$transaction = mock.fn();

    await atualizarLotesVencidos();

    assert.ok(findManyArgs);
    assert.deepStrictEqual(findManyArgs.where.status.in, ["DISPONIVEL", "QUARENTENA"]);
    assert.strictEqual((prisma as any).$transaction.mock.calls.length, 0);
  });
});
