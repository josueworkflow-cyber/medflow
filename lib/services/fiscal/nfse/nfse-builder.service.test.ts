import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "../../../prisma";
import { buildNFSePayload } from "./nfse-builder.service";

describe("NFS-e Payload Builder Service Unit Tests", () => {
  let empresaId: number;
  let clienteValidoId: number;
  let clienteSemIbgeId: number;
  let clienteSemEnderecoId: number;
  let produtoId: number;
  let pedidoValidoId: number;
  let pedidoZeroId: number;

  before(async () => {
    // 0. Limpar dados residuais para evitar conflitos de restrição única
    await prisma.itemPedidoVenda.deleteMany({
      where: {
        pedidoVenda: {
          numero: {
            in: ["TEST-NFSE-PED-VALIDO", "TEST-NFSE-PED-ZERO", "TEST-NFSE-PED-SEM-IBGE"]
          }
        }
      }
    });
    await prisma.pedidoVenda.deleteMany({
      where: {
        numero: {
          in: ["TEST-NFSE-PED-VALIDO", "TEST-NFSE-PED-ZERO", "TEST-NFSE-PED-SEM-IBGE"]
        }
      }
    });
    await prisma.empresaFiscal.deleteMany({ where: { cnpj: "22333444000177" } });
    await prisma.cliente.deleteMany({ where: { cnpjCpf: { in: ["66.777.888/0001-55", "77.888.999/0001-66", "88.999.000/0001-77"] } } });
    await prisma.produto.deleteMany({ where: { descricao: "Servico de Consultoria Hospitalar" } });

    // 1. Criar Empresa Emissora (DAC)
    const empresa = await prisma.empresaFiscal.create({
      data: {
        razaoSocial: "DAC Prestacao de Servicos Hospitalares Ltda",
        nomeFantasia: "DAC Servicos",
        cnpj: "22333444000177",
        inscricaoEstadual: "12345678",
        inscricaoMunicipal: "IM-987654",
        regimeTributario: "SIMPLES_NACIONAL",
        ativo: true,
        logradouro: "Rua do Emitter",
        numero: "100",
        bairro: "Centro",
        municipio: "Maricá",
        codigoMunicipio: "3302700", // IBGE Maricá (9-digit validation or 7-digit standard: 3302700)
        uf: "RJ",
        cep: "24900-000",
        codigoTributacaoIss: "1.05",
        codigoNbs: "1.0201.12.00", // NBS de 9 dígitos (formatado)
        aliquotaIss: 3.5, // 3.5%
        percentualTributosFederais: "10.38",
        percentualTributosEstaduais: "0.00"
      }
    });
    empresaId = empresa.id;

    // 1.5 Criar Produto para Teste
    const produto = await prisma.produto.create({
      data: {
        descricao: "Servico de Consultoria Hospitalar",
        precoVendaBase: 1500.50,
        ncm: "30049099"
      }
    });
    produtoId = produto.id;

    // 2. Criar Cliente Válido (CNPJ com máscara)
    const clienteValido = await prisma.cliente.create({
      data: {
        razaoSocial: "Hospital Clinico de Marica S/A",
        nomeFantasia: "Hosp Clinico",
        cnpjCpf: "66.777.888/0001-55", // Formatado com máscara
        email: "servicos@hospclinico.com",
        telefone: "(21) 9999-8888",
        logradouro: "Avenida Central",
        numero: "500",
        bairro: "Flamengo",
        codigoMunicipio: "3302700",
        estado: "RJ",
        cep: "24901-100",
        contribuinteICMS: false,
        consumidorFinal: true
      }
    });
    clienteValidoId = clienteValido.id;

    // 3. Criar Cliente sem IBGE do município
    const clienteSemIbge = await prisma.cliente.create({
      data: {
        razaoSocial: "Cliente Sem IBGE S/A",
        cnpjCpf: "77.888.999/0001-66",
        logradouro: "Rua sem IBGE",
        numero: "10",
        bairro: "Algum Bairro",
        estado: "RJ",
        cep: "24900-000"
        // Sem codigoMunicipio
      }
    });
    clienteSemIbgeId = clienteSemIbge.id;

    // 4. Criar Cliente sem endereço completo
    const clienteSemEndereco = await prisma.cliente.create({
      data: {
        razaoSocial: "Cliente Sem Endereco S/A",
        cnpjCpf: "88.999.000/0001-77",
        codigoMunicipio: "3302700"
        // Sem logradouro, numero, bairro, cep
      }
    });
    clienteSemEnderecoId = clienteSemEndereco.id;

    // 5. Criar Pedidos de Venda
    const pedidoValido = await prisma.pedidoVenda.create({
      data: {
        numero: "TEST-NFSE-PED-VALIDO",
        clienteId: clienteValidoId,
        empresaFiscalId: empresaId,
        formaPagamento: "PIX",
        valorTotal: 1500.50, // R$ 1500.50
        status: "AGUARDANDO_FATURAMENTO",
        itens: {
          create: [
            {
              produtoId: produtoId,
              quantidade: 1,
              precoUnitario: 1500.50,
              subtotal: 1500.50
            }
          ]
        }
      }
    });
    pedidoValidoId = pedidoValido.id;

    const pedidoZero = await prisma.pedidoVenda.create({
      data: {
        numero: "TEST-NFSE-PED-ZERO",
        clienteId: clienteValidoId,
        empresaFiscalId: empresaId,
        formaPagamento: "BOLETO",
        valorTotal: 0.0,
        status: "AGUARDANDO_FATURAMENTO"
      }
    });
    pedidoZeroId = pedidoZero.id;
  });

  after(async () => {
    // Limpar dados criados
    await prisma.itemPedidoVenda.deleteMany({
      where: {
        pedidoVendaId: {
          in: [pedidoValidoId, pedidoZeroId]
        }
      }
    });

    await prisma.pedidoVenda.deleteMany({
      where: {
        id: {
          in: [pedidoValidoId, pedidoZeroId]
        }
      }
    });

    await prisma.cliente.deleteMany({
      where: {
        id: {
          in: [clienteValidoId, clienteSemIbgeId, clienteSemEnderecoId]
        }
      }
    });

    await prisma.produto.deleteMany({
      where: {
        id: produtoId
      }
    });

    await prisma.empresaFiscal.deleteMany({
      where: {
        id: empresaId
      }
    });
  });

  test("Caso de Teste 1: Pedido válido com CNPJ, emitente e tomador", async () => {
    const payload = await buildNFSePayload(pedidoValidoId);

    // Valida dados do prestador
    assert.strictEqual(payload.cnpj_prestador, "22333444000177");
    assert.strictEqual(payload.codigo_municipio_emissora, 3302700);
    assert.strictEqual(payload.inscricao_municipal_prestador, "987654");

    // Valida tomador
    assert.strictEqual(payload.cnpj_tomador, "66777888000155");
    assert.strictEqual(payload.codigo_municipio_tomador, 3302700);

    // Valida tributação ISS
    assert.strictEqual(payload.tributacao_iss, 1);
    assert.strictEqual(payload.tipo_retencao_iss, 1);
  });

  test("Caso de Teste 2: Lançamento de erro para empresa sem inscrição municipal", async () => {
    // Atualizar empresa fiscal temporariamente para remover a IM
    await prisma.empresaFiscal.update({
      where: { id: empresaId },
      data: { inscricaoMunicipal: null }
    });

    try {
      await assert.rejects(
        buildNFSePayload(pedidoValidoId),
        new Error("Empresa emissora sem inscrição municipal (obrigatório para NFS-e)")
      );
    } finally {
      // Restaurar inscrição municipal
      await prisma.empresaFiscal.update({
        where: { id: empresaId },
        data: { inscricaoMunicipal: "IM-987654" }
      });
    }
  });

  test("Caso de Teste 3: Lançamento de erro para cliente sem código IBGE", async () => {
    const pedidoSemIbge = await prisma.pedidoVenda.create({
      data: {
        numero: "TEST-NFSE-PED-SEM-IBGE",
        clienteId: clienteSemIbgeId,
        empresaFiscalId: empresaId,
        valorTotal: 100.0
      }
    });

    try {
      await assert.rejects(
        buildNFSePayload(pedidoSemIbge.id),
        new Error(`Cliente ${clienteSemIbgeId} sem código IBGE do município`)
      );
    } finally {
      await prisma.pedidoVenda.delete({ where: { id: pedidoSemIbge.id } });
    }
  });

  test("Caso de Teste 4: Lançamento de erro para pedido com valorTotal = 0", async () => {
    await assert.rejects(
      buildNFSePayload(pedidoZeroId),
      new Error(`Pedido ${pedidoZeroId} com valor inválido para emissão de NFS-e`)
    );
  });

  test("Caso de Teste 5: Cálculo correto do valor_iss com Decimal e arredondamento", async () => {
    const payload = await buildNFSePayload(pedidoValidoId);

    // valor_servico = 1500.50
    // aliquotaIss = 3.5% (0.035)
    // valor_iss = 1500.50 * 0.035 = 52.5175 -> arredondado para 52.52
    assert.strictEqual(payload.valor_iss, 52.52);
    assert.strictEqual(payload.percentual_total_tributos_municipais, "3.50");
  });

  test("Caso de Teste 6: Sanitização de CNPJ/CPF do Tomador com máscara", async () => {
    const payload = await buildNFSePayload(pedidoValidoId);

    // CNPJ original: "66.777.888/0001-55" -> Sanitizado: "66777888000155"
    assert.strictEqual(payload.cnpj_tomador, "66777888000155");
    assert.ok(!payload.cnpj_tomador.includes("."));
    assert.ok(!payload.cnpj_tomador.includes("/"));
    assert.ok(!payload.cnpj_tomador.includes("-"));
  });

  test("Caso de Teste 7: Validação do formato de 9 dígitos do código NBS", async () => {
    // Atualizar codigoNbs para formato inválido
    await prisma.empresaFiscal.update({
      where: { id: empresaId },
      data: { codigoNbs: "12345" } // Apenas 5 dígitos
    });

    try {
      await assert.rejects(
        buildNFSePayload(pedidoValidoId),
        new Error("Empresa emissora com código NBS inválido (deve conter 9 dígitos)")
      );
    } finally {
      // Restaurar codigoNbs válido
      await prisma.empresaFiscal.update({
        where: { id: empresaId },
        data: { codigoNbs: "1.0201.12.00" }
      });
    }
  });
});
