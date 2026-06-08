import { test, describe, before, after, mock } from "node:test";
import assert from "node:assert";
import https from "https";
import { EventEmitter } from "events";
import { prisma } from "@/lib/prisma";
import forge from "node-forge";
import { criptografarSenha } from "../certificado.service";
import { enviarNFSe } from "./nfse-sender.service";

/**
 * Auxiliar para gerar dinamicamente um arquivo PFX (.pfx) em formato base64.
 */
function generateMockPfx(password: string): string {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "554433";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs = [
    { name: "commonName", value: "Empresa Transmissora NFSe LTDA" },
    { name: "countryName", value: "BR" },
    { name: "organizationName", value: "MedFlow NFSe Unit Tests" },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey);

  const pfx = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password);
  const pfxDer = forge.asn1.toDer(pfx).getBytes();
  return forge.util.encode64(pfxDer);
}

describe("NFS-e Sender Service Unit Tests (Tarefa 2.2)", () => {
  let empresaIdValida: number;
  let clienteIdValido: number;
  let produtoIdValido: number;
  let pedidoIdValido: number;
  const passwordMock = "senha-nfse-sender-123";

  before(async () => {
    // Certifica-se que a chave de criptografia de teste está definida
    if (!process.env.CERT_ENCRYPTION_KEY) {
      process.env.CERT_ENCRYPTION_KEY = "chave-de-teste-de-criptografia-32-chars-max!";
    }

    // 0. Limpar qualquer dado de teste residual
    await prisma.itemPedidoVenda.deleteMany({
      where: {
        pedidoVenda: {
          numero: { in: ["TEST-NFSE-SENDER-VALIDO"] }
        }
      }
    });
    await prisma.pedidoVenda.deleteMany({
      where: {
        numero: { in: ["TEST-NFSE-SENDER-VALIDO"] }
      }
    });
    await prisma.empresaFiscal.deleteMany({
      where: { cnpj: "22333444000188" }
    });
    await prisma.cliente.deleteMany({
      where: { cnpjCpf: "55.666.777/0001-99" }
    });
    await prisma.produto.deleteMany({
      where: { descricao: "Servico de Consultoria NFSe" }
    });

    // 1. Criar Empresa Fiscal
    const pfxBase64 = generateMockPfx(passwordMock);
    const senhaCriptografada = criptografarSenha(passwordMock);
    const empresa = await prisma.empresaFiscal.create({
      data: {
        razaoSocial: "Prestador de Servicos NFSe LTDA",
        nomeFantasia: "Prestador NFSe",
        cnpj: "22333444000188",
        inscricaoEstadual: "12345678",
        inscricaoMunicipal: "IM-123456",
        regimeTributario: "SIMPLES_NACIONAL",
        ativo: true,
        logradouro: "Rua do Prestador",
        numero: "100",
        bairro: "Centro",
        municipio: "Maricá",
        codigoMunicipio: "3302700",
        uf: "RJ",
        cep: "24900-000",
        codigoTributacaoIss: "1.05",
        codigoNbs: "1.0201.12.00",
        aliquotaIss: 3.5,
        certificadoPfxBase64: pfxBase64,
        certificadoSenha: senhaCriptografada,
        ambienteSEFAZ: "homologacao"
      }
    });
    empresaIdValida = empresa.id;

    // 2. Criar Cliente
    const cliente = await prisma.cliente.create({
      data: {
        razaoSocial: "Tomador de Servico S/A",
        cnpjCpf: "55.666.777/0001-99",
        logradouro: "Avenida do Tomador",
        numero: "500",
        bairro: "Flamengo",
        codigoMunicipio: "3302700",
        estado: "RJ",
        cep: "24901-100"
      }
    });
    clienteIdValido = cliente.id;

    // 3. Criar Produto
    const produto = await prisma.produto.create({
      data: {
        descricao: "Servico de Consultoria NFSe",
        precoVendaBase: 2000.00
      }
    });
    produtoIdValido = produto.id;

    // 4. Criar Pedido de Venda
    const pedido = await prisma.pedidoVenda.create({
      data: {
        numero: "TEST-NFSE-SENDER-VALIDO",
        clienteId: clienteIdValido,
        empresaFiscalId: empresaIdValida,
        valorTotal: 2000.00,
        status: "AGUARDANDO_FATURAMENTO",
        itens: {
          create: [
            {
              produtoId: produtoIdValido,
              quantidade: 1,
              precoUnitario: 2000.00,
              subtotal: 2000.00
            }
          ]
        }
      }
    });
    pedidoIdValido = pedido.id;
  });

  after(async () => {
    // Limpeza de todos os dados do banco
    await prisma.itemPedidoVenda.deleteMany({
      where: { pedidoVendaId: pedidoIdValido }
    });
    await prisma.pedidoVenda.deleteMany({
      where: { id: pedidoIdValido }
    });
    await prisma.cliente.deleteMany({
      where: { id: clienteIdValido }
    });
    await prisma.produto.deleteMany({
      where: { id: produtoIdValido }
    });
    await prisma.empresaFiscal.deleteMany({
      where: { id: empresaIdValida }
    });

    mock.restoreAll();
  });

  test("Caso de Teste 1: HTTP 201 com chaveAcesso -> RetornoNFSe com autorizada: true", async () => {
    mock.restoreAll();
    mock.method(https, "request", (options: any, callback: any) => {
      const res = new EventEmitter() as any;
      res.statusCode = 201;
      
      const req = new EventEmitter() as any;
      req.write = () => {};
      req.end = () => {
        callback(res);
        res.emit("data", JSON.stringify({ chaveAcesso: "NFS33027002233344400018855000000000123" }));
        res.emit("end");
      };
      return req;
    });

    const retorno = await enviarNFSe(empresaIdValida, pedidoIdValido);
    assert.strictEqual(retorno.autorizada, true);
    assert.strictEqual(retorno.chaveAcesso, "NFS33027002233344400018855000000000123");
    assert.ok(retorno.xmlAutorizado?.includes("NFS33027002233344400018855000000000123"));
  });

  test("Caso de Teste 2: HTTP 422 com erros[] -> autorizada: false com codigo e mensagem do primeiro erro", async () => {
    mock.restoreAll();
    mock.method(https, "request", (options: any, callback: any) => {
      const res = new EventEmitter() as any;
      res.statusCode = 422;
      
      const req = new EventEmitter() as any;
      req.write = () => {};
      req.end = () => {
        callback(res);
        res.emit("data", JSON.stringify({
          erros: [
            { codigo: "E501", descricao: "Regime Especial de Tributacao Invalido" },
            { codigo: "E502", descricao: "Outro Erro Qualquer" }
          ]
        }));
        res.emit("end");
      };
      return req;
    });

    const retorno = await enviarNFSe(empresaIdValida, pedidoIdValido);
    assert.strictEqual(retorno.autorizada, false);
    assert.strictEqual(retorno.codigoRejeicao, "E501");
    assert.strictEqual(retorno.mensagemRejeicao, "Regime Especial de Tributacao Invalido");
  });

  test("Caso de Teste 3: HTTP 500 -> lanca excecao de rede", async () => {
    mock.restoreAll();
    mock.method(https, "request", (options: any, callback: any) => {
      const res = new EventEmitter() as any;
      res.statusCode = 500;
      
      const req = new EventEmitter() as any;
      req.write = () => {};
      req.end = () => {
        callback(res);
        res.emit("data", "Internal Server Error");
        res.emit("end");
      };
      return req;
    });

    await assert.rejects(
      enviarNFSe(empresaIdValida, pedidoIdValido),
      new Error("Falha de comunicacao com a API NFS-e Nacional (HTTP 500)")
    );
  });

  test("Caso de Teste 4: Builder lanca erro (campo faltando) -> excecao propagada corretamente", async () => {
    // Para forçar o builder a lançar um erro diretamente, vamos temporariamente
    // atualizar a empresa no banco de dados para remover a inscricaoMunicipal.
    // O builder deve falhar na validação de dados antes de qualquer chamada HTTPS.
    await prisma.empresaFiscal.update({
      where: { id: empresaIdValida },
      data: { inscricaoMunicipal: null }
    });

    try {
      // O teste deve validar que o erro original do builder ("Empresa emissora sem inscrição municipal (obrigatório para NFS-e)")
      // propaga sem ser engolido pelo try/catch de transmissão HTTP do sender.
      await assert.rejects(
        enviarNFSe(empresaIdValida, pedidoIdValido),
        new Error("Empresa emissora sem inscrição municipal (obrigatório para NFS-e)")
      );
    } finally {
      // Restaura a inscricaoMunicipal para limpeza correta
      await prisma.empresaFiscal.update({
        where: { id: empresaIdValida },
        data: { inscricaoMunicipal: "IM-123456" }
      });
    }
  });
});
