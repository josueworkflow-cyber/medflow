import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "../../../prisma";
import { buildNFeXml, calcularDV, calcularChaveAcesso } from "./nfe-builder.service";

describe("NF-e XML Builder Service Unit Tests", () => {
  let empresaId: number;
  let clienteValidoId: number;
  ;let clienteInvalidoId: number;
  let produtoValidoId: number;
  let produtoSemNcmId: number;
  let pedidoSimplesId: number;
  let pedidoMultiplesId: number;
  let pedidoComDescontoId: number;

  before(async () => {
    // 0. Limpar dados residuais para evitar conflitos de restrição única
    await prisma.itemPedidoVenda.deleteMany({
      where: {
        pedidoVenda: {
          numero: {
            in: ["TEST-PED-SIMPLES", "TEST-PED-MULTIPLO", "TEST-PED-DESCONTO", "TEST-PED-SEM-NCM", "TEST-PED-SEM-ENDERECO"]
          }
        }
      }
    });
    await prisma.pedidoVenda.deleteMany({
      where: {
        numero: {
          in: ["TEST-PED-SIMPLES", "TEST-PED-MULTIPLO", "TEST-PED-DESCONTO", "TEST-PED-SEM-NCM", "TEST-PED-SEM-ENDERECO"]
        }
      }
    });
    await prisma.empresaFiscal.deleteMany({ where: { cnpj: "11222333000199" } });
    await prisma.cliente.deleteMany({ where: { cnpjCpf: { in: ["44555666000188", "55666777000122"] } } });
    await prisma.produto.deleteMany({ where: { descricao: { in: ["Medicamento Teste 500mg", "Produto Sem Classificacao"] } } });

    // 1. Criar Empresa Emissora para Teste
    const empresa = await prisma.empresaFiscal.create({
      data: {
        razaoSocial: "DAC Distribuidora de Alimentos e Correlatos Ltda",
        nomeFantasia: "DAC Teste",
        cnpj: "11222333000199",
        inscricaoEstadual: "12345678",
        regimeTributario: "SIMPLES_NACIONAL",
        ativo: true,
        logradouro: "Rua do Emitter",
        numero: "100",
        bairro: "Centro",
        municipio: "Maricá",
        codigoMunicipio: "3302403", // IBGE Maricá
        uf: "RJ",
        cep: "24900000",
        ambienteSEFAZ: "homologacao",
        serieNFe: "1",
        numeroUltimaNFe: 10
      }
    });
    empresaId = empresa.id;

    // 2. Criar Cliente Válido (Endereço Completo)
    const clienteValido = await prisma.cliente.create({
      data: {
        razaoSocial: "Hospital de Teste S/A",
        nomeFantasia: "Hosp Teste",
        cnpjCpf: "44555666000188",
        email: "financeiro@hospteste.com",
        telefone: "2199999999",
        logradouro: "Avenida do Cliente",
        numero: "200",
        bairro: "Icaraí",
        codigoMunicipio: "3303302", // IBGE Niterói
        estado: "RJ",
        cep: "24220000",
        contribuinteICMS: false,
        consumidorFinal: true
      }
    });
    clienteValidoId = clienteValido.id;

    // 3. Criar Cliente Inválido (Sem endereço fiscal completo)
    const clienteInvalido = await prisma.cliente.create({
      data: {
        razaoSocial: "Cliente Incompleto Ltda",
        cnpjCpf: "55666777000122",
        // Faltam campos de endereço estruturado
        estado: "RJ"
      }
    });
    clienteInvalidoId = clienteInvalido.id;

    // 4. Criar Produtos
    const produtoValido = await prisma.produto.create({
      data: {
        descricao: "Medicamento Teste 500mg",
        unidadeVenda: "CX",
        unidadeFiscal: "CX",
        precoVendaBase: 50.0,
        ncm: "30049099",
        cfop: "5102",
        csosn: "102",
        origemMercadoria: "0"
      }
    });
    produtoValidoId = produtoValido.id;

    const produtoSemNcm = await prisma.produto.create({
      data: {
        descricao: "Produto Sem Classificacao",
        unidadeVenda: "UN",
        precoVendaBase: 10.0
        // Sem NCM
      }
    });
    produtoSemNcmId = produtoSemNcm.id;

    // 5. Criar Pedidos de Venda
    // Pedido Simples (1 item, cliente válido, DAC em homologação)
    const pedidoSimples = await prisma.pedidoVenda.create({
      data: {
        numero: "TEST-PED-SIMPLES",
        clienteId: clienteValidoId,
        empresaFiscalId: empresaId,
        formaPagamento: "PIX",
        valorTotal: 100.0,
        status: "AGUARDANDO_FATURAMENTO",
        itens: {
          create: [
            {
              produtoId: produtoValidoId,
              quantidade: 2,
              precoUnitario: 50.0,
              subtotal: 100.0
            }
          ]
        }
      }
    });
    pedidoSimplesId = pedidoSimples.id;

    // Pedido Múltiplo (3 itens)
    const pedidoMultiples = await prisma.pedidoVenda.create({
      data: {
        numero: "TEST-PED-MULTIPLO",
        clienteId: clienteValidoId,
        empresaFiscalId: empresaId,
        formaPagamento: "BOLETO",
        valorTotal: 150.0,
        status: "AGUARDANDO_FATURAMENTO",
        itens: {
          create: [
            {
              produtoId: produtoValidoId,
              quantidade: 1,
              precoUnitario: 50.0,
              subtotal: 50.0
            },
            {
              produtoId: produtoValidoId,
              quantidade: 1,
              precoUnitario: 50.0,
              subtotal: 50.0
            },
            {
              produtoId: produtoValidoId,
              quantidade: 1,
              precoUnitario: 50.0,
              subtotal: 50.0
            }
          ]
        }
      }
    });
    pedidoMultiplesId = pedidoMultiples.id;

    // Pedido com Desconto
    const pedidoComDesconto = await prisma.pedidoVenda.create({
      data: {
        numero: "TEST-PED-DESCONTO",
        clienteId: clienteValidoId,
        empresaFiscalId: empresaId,
        formaPagamento: "CARTAO_CREDITO",
        desconto: 10.0,
        valorTotal: 90.0,
        status: "AGUARDANDO_FATURAMENTO",
        itens: {
          create: [
            {
              produtoId: produtoValidoId,
              quantidade: 2,
              precoUnitario: 50.0,
              desconto: 10.0,
              subtotal: 100.0
            }
          ]
        }
      }
    });
    pedidoComDescontoId = pedidoComDesconto.id;
  });

  after(async () => {
    // Limpar dados criados na ordem reversa de dependência
    await prisma.itemPedidoVenda.deleteMany({
      where: {
        pedidoVendaId: {
          in: [pedidoSimplesId, pedidoMultiplesId, pedidoComDescontoId]
        }
      }
    });

    await prisma.pedidoVenda.deleteMany({
      where: {
        id: {
          in: [pedidoSimplesId, pedidoMultiplesId, pedidoComDescontoId]
        }
      }
    });

    await prisma.produto.deleteMany({
      where: {
        id: {
          in: [produtoValidoId, produtoSemNcmId]
        }
      }
    });

    await prisma.cliente.deleteMany({
      where: {
        id: {
          in: [clienteValidoId, clienteInvalidoId]
        }
      }
    });

    await prisma.empresaFiscal.deleteMany({
      where: {
        id: empresaId
      }
    });
  });

  test("Caso de Teste 1: Pedido simples com 1 item em homologação", async () => {
    const xml = await buildNFeXml(pedidoSimplesId);
    
    // cUF deve ser 33
    assert.match(xml, /<cUF>33<\/cUF>/);
    
    // CNPJ do emitente
    assert.match(xml, /<CNPJ>11222333000199<\/CNPJ>/);
    
    // NCM do produto
    assert.match(xml, /<NCM>30049099<\/NCM>/);
    
    // Ambiente homologação (tpAmb = 2)
    assert.match(xml, /<tpAmb>2<\/tpAmb>/);

    // Valida que a chave de acesso possui 44 dígitos no atributo Id do infNFe
    const idMatch = xml.match(/Id="NFe(\d{44})"/);
    assert.ok(idMatch, "XML deve conter Id da infNFe com a chave de acesso");
    const chave = idMatch[1];
    
    // Valida estrutura da chave de acesso
    assert.strictEqual(chave.slice(0, 2), "33"); // cUF
    assert.strictEqual(chave.slice(6, 20), "11222333000199"); // CNPJ Emit
    assert.strictEqual(chave.slice(20, 22), "55"); // mod
    assert.strictEqual(chave.slice(22, 25), "001"); // serie
    assert.strictEqual(chave.slice(25, 34), "000000011"); // nNF (numeroUltimaNFe + 1 = 11)
  });

  test("Caso de Teste 2: Pedido com 3 itens (3 grupos det)", async () => {
    const xml = await buildNFeXml(pedidoMultiplesId);

    // Deve conter nItem="1", nItem="2" e nItem="3"
    assert.match(xml, /nItem="1"/);
    assert.match(xml, /nItem="2"/);
    assert.match(xml, /nItem="3"/);

    // Ocorrências do fechamento de </det> devem ser exatamente 3
    const detOccurrences = (xml.match(/<\/det>/g) || []).length;
    assert.strictEqual(detOccurrences, 3);
  });

  test("Caso de Teste 3: Lançamento de erro descritivo para produto sem NCM", async () => {
    // Criar um pedido contendo produto sem NCM
    const pedidoInvalido = await prisma.pedidoVenda.create({
      data: {
        numero: "TEST-PED-SEM-NCM",
        clienteId: clienteValidoId,
        empresaFiscalId: empresaId,
        valorTotal: 10.0,
        itens: {
          create: [
            {
              produtoId: produtoSemNcmId,
              quantidade: 1,
              precoUnitario: 10.0,
              subtotal: 10.0
            }
          ]
        }
      }
    });

    try {
      await assert.rejects(
        buildNFeXml(pedidoInvalido.id),
        new Error(`Produto ${produtoSemNcmId} não possui NCM cadastrado`)
      );
    } finally {
      // Limpar pedido inválido
      await prisma.itemPedidoVenda.deleteMany({
        where: { pedidoVendaId: pedidoInvalido.id }
      });
      await prisma.pedidoVenda.delete({
        where: { id: pedidoInvalido.id }
      });
    }
  });

  test("Caso de Teste 4: Lançamento de erro para cliente sem endereço estruturado completo", async () => {
    // Criar um pedido para o cliente inválido
    const pedidoInvalido = await prisma.pedidoVenda.create({
      data: {
        numero: "TEST-PED-SEM-ENDERECO",
        clienteId: clienteInvalidoId,
        empresaFiscalId: empresaId,
        valorTotal: 50.0,
        itens: {
          create: [
            {
              produtoId: produtoValidoId,
              quantidade: 1,
              precoUnitario: 50.0,
              subtotal: 50.0
            }
          ]
        }
      }
    });

    try {
      await assert.rejects(
        buildNFeXml(pedidoInvalido.id),
        new Error(`Cliente ${clienteInvalidoId} sem endereço fiscal completo`)
      );
    } finally {
      // Limpar pedido inválido
      await prisma.itemPedidoVenda.deleteMany({
        where: { pedidoVendaId: pedidoInvalido.id }
      });
      await prisma.pedidoVenda.delete({
        where: { id: pedidoInvalido.id }
      });
    }
  });

  test("Caso de Teste 5: Pedido com desconto acumulado e cálculo correto de vNF", async () => {
    const xml = await buildNFeXml(pedidoComDescontoId);

    // Valida que vDesc é 10.00
    assert.match(xml, /<vDesc>10\.00<\/vDesc>/);

    // Valida que vProd é 100.00
    assert.match(xml, /<vProd>100\.00<\/vProd>/);

    // Valida que vNF é 90.00 (vProd - vDesc = 100 - 10)
    assert.match(xml, /<vNF>90\.00<\/vNF>/);
  });

  test("Cálculo do Dígito Verificador Módulo 11 (calcularDV)", () => {
    const chaveValida = "3326061122233300019955001000000011112345678";
    const dvValido = calcularDV(chaveValida);
    assert.ok(dvValido >= 0 && dvValido <= 9);

    // Encontra dinamicamente chaves que geram resto 0 e resto 1 para testar o DV = 0
    let chaveResto0 = "";
    let chaveResto1 = "";
    
    const baseChave = "33260611222333000199550010000000111123456";
    for (let i = 0; i <= 99; i++) {
      const sufixo = String(i).padStart(2, "0");
      const chaveTeste = `${baseChave}${sufixo}`;
      
      let soma = 0;
      let peso = 2;
      for (let j = chaveTeste.length - 1; j >= 0; j--) {
        soma += parseInt(chaveTeste.charAt(j), 10) * peso;
        peso = peso === 9 ? 2 : peso + 1;
      }
      
      const resto = soma % 11;
      if (resto === 0 && !chaveResto0) {
        chaveResto0 = chaveTeste;
      }
      if (resto === 1 && !chaveResto1) {
        chaveResto1 = chaveTeste;
      }
      if (chaveResto0 && chaveResto1) break;
    }

    assert.ok(chaveResto0, "Deve encontrar chave com resto 0");
    assert.ok(chaveResto1, "Deve encontrar chave com resto 1");

    assert.strictEqual(calcularDV(chaveResto0), 0, "DV para resto 0 deve ser 0");
    assert.strictEqual(calcularDV(chaveResto1), 0, "DV para resto 1 deve ser 0");
  });
});
