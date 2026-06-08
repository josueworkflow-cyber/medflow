# MedFlow ERP — Plano de Implementação: Módulo Fiscal
**Versão:** 1.0  
**Data:** Junho/2026  
**Responsável:** CTO / Dev Lead  
**Status:** Aprovado para execução

---

## Contexto para a equipe

Vocês são devs experientes, mas provavelmente nunca trabalharam com ERP ou fiscal brasileiro. Este documento foi escrito para nivelar esse conhecimento antes de qualquer linha de código.

**Leia antes de codar. Sem exceção.**

---

## 1. Glossário Obrigatório

Antes de tocar em qualquer código, toda a equipe precisa entender esses termos. Eles vão aparecer em todo lugar — no banco, nas APIs, nas conversas com o cliente.

| Termo | O que é na prática |
|---|---|
| **NF-e** | Nota Fiscal Eletrônica de produto. Emitida quando o cliente compra um produto físico (medicamento, material hospitalar). Vai para o SEFAZ estadual (RJ neste caso). |
| **NFS-e** | Nota Fiscal de Serviço Eletrônica. Emitida quando a empresa cobra por um serviço prestado. Vai para a prefeitura municipal (Maricá-RJ neste caso). |
| **SEFAZ** | Secretaria da Fazenda. É o servidor do governo que recebe, valida e autoriza as NF-e. Cada estado tem o seu. |
| **DANFe** | Documento Auxiliar da NF-e. É o PDF imprimível que acompanha a mercadoria. Não é a NF em si — é só a representação visual dela. |
| **Chave de Acesso** | Código de 44 dígitos que identifica unicamente uma NF autorizada. É o "comprovante" da nota. |
| **XML** | O arquivo real da NF-e. É ele que tem validade jurídica, não o PDF. |
| **Certificado A1** | Arquivo `.pfx` com chave criptográfica da empresa. Usado para assinar digitalmente o XML antes de enviar ao SEFAZ. Sem isso, a nota não é válida. |
| **NCM** | Nomenclatura Comum do Mercosul. Código de 8 dígitos que classifica o produto fiscalmente. Obrigatório na NF-e. Exemplo: medicamentos têm NCMs específicos. |
| **CFOP** | Código Fiscal de Operações e Prestações. Diz qual é a natureza da operação (venda dentro do estado, fora do estado, devolução, etc.). Obrigatório na NF-e. |
| **CST / CSOSN** | Código de Situação Tributária. Define como o ICMS incide sobre aquele item. Empresas do Simples usam CSOSN; demais usam CST. |
| **ISS** | Imposto Sobre Serviços. Cobrado pelo município sobre serviços prestados. Aparece na NFS-e. |
| **RPS** | Recibo Provisório de Serviço. É um número sequencial que o sistema gera antes de enviar ao município. Quando a prefeitura autoriza, o RPS vira NFS-e com número oficial. |
| **DPS** | Declaração de Prestação de Serviço. Formato usado no modelo Nacional da NFS-e (o que Maricá adotou). Substitui o RPS legado em municípios aderentes. |
| **Homologação** | Ambiente de testes do SEFAZ/prefeitura. Notas emitidas em homologação não têm validade fiscal. É onde a gente testa tudo antes de ir para produção. |
| **Contingência** | Modo alternativo de emissão quando o SEFAZ está fora do ar. A nota é emitida localmente e regularizada depois. Não vamos implementar na fase 1, mas a arquitetura não pode ignorar isso. |
| **Empresa emissora** | No MedFlow, são as empresas DAC e Pulse. Cada uma tem seu próprio CNPJ, certificado e série de NF. O financeiro escolhe qual emite no momento do faturamento. |

---

## 2. Como funciona o fluxo fiscal na prática

### 2.1 NF-e (produto)

```
1. Financeiro clica "Faturar" no pedido
2. Sistema seleciona empresa emissora (DAC ou Pulse)
3. Sistema monta o XML no layout 4.00 da NF-e
4. Sistema assina o XML com o certificado .pfx da empresa emissora
5. Sistema envia o XML assinado para o SEFAZ-RJ via HTTPS
6. SEFAZ valida e retorna:
   → Autorizada: devolve XML com protocolo + chave de acesso
   → Rejeitada: devolve código de erro (precisa corrigir e reenviar)
7. Sistema salva o XML autorizado e a chave de acesso no banco
8. Sistema gera o DANFe em PDF a partir do XML autorizado
9. Sistema envia o XML + DANFe por e-mail para o cliente
10. Pedido avança para AUTORIZADO_PARA_SEPARACAO
```

### 2.2 NFS-e Nacional (serviço — Maricá aderiu ao padrão federal)

```
1. Sistema monta o payload JSON no formato DPS Nacional
2. Sistema envia via REST para a API Nacional do governo
   → Homologação: https://hom.api.nfse.gov.br/v1/dps
   → Produção: https://api.nfse.gov.br/v1/dps
3. Autenticação: mTLS com o certificado A1 da empresa
4. API retorna:
   → Sucesso: chave de acesso + XML da NFS-e
   → Rejeição: código de erro
5. Sistema salva e disponibiliza o PDF (DANFSe)
```

**Diferença crítica:** NFS-e Nacional é REST + JSON. NF-e é SOAP + XML assinado. São integrações completamente diferentes.

---

## 3. O que NÃO existe no banco de dados atual

Esta é a lista de gaps que precisam ser resolvidos antes de qualquer emissão. São as migrations da Fase 1.

### 3.1 Tabela `Produto` — campos faltantes

```prisma
model Produto {
  // campos já existem no PRD...
  
  // ADICIONAR:
  ncm                String?   // 8 dígitos — obrigatório NF-e
  cfop               String?   // 4 dígitos — obrigatório NF-e
  cst                String?   // Situação tributária ICMS (regime Normal)
  csosn              String?   // Situação tributária ICMS (Simples Nacional)
  unidadeMedida      String?   // UN, CX, FR, KG, etc.
  aliquotaIcms       Decimal?  // % de ICMS
  aliquotaIpi        Decimal?  // % de IPI (medicamentos podem ter IPI)
  aliquotaPis        Decimal?  // % de PIS
  aliquotaCofins     Decimal?  // % de COFINS
  codigoBarras       String?   // EAN-13 se houver
  origemMercadoria   String?   // 0=nacional, 1=importado, etc.
}
```

> **Para a equipe:** NCM de medicamentos começa com 30 (capítulo 30 do NCM). O cliente vai precisar informar o NCM correto de cada produto — isso é responsabilidade dele, não nossa. Nossa responsabilidade é ter o campo e validar que tem 8 dígitos.

### 3.2 Tabela `Cliente` — campos faltantes

```prisma
model Cliente {
  // campos já existem no PRD...
  
  // ADICIONAR:
  // Endereço estruturado (hoje provavelmente é string livre)
  logradouro         String?
  numero             String?
  complemento        String?
  bairro             String?
  cep                String?
  municipio          String?
  codigoMunicipio    String?   // código IBGE do município — obrigatório NF-e
  uf                 String?
  
  // Dados fiscais
  inscricaoEstadual  String?
  inscricaoMunicipal String?
  email              String?   // para envio automático do XML/DANFe
  telefone           String?
  
  // Indicadores
  consumidorFinal    Boolean   @default(false)
  contribuinteICMS   Boolean   @default(false)
}
```

### 3.3 Nova tabela `EmpresaEmissora` (DAC e Pulse)

```prisma
model EmpresaEmissora {
  id                    Int      @id @default(autoincrement())
  nome                  String   // "DAC" ou "Pulse"
  cnpj                  String   @unique
  razaoSocial           String
  nomeFantasia          String?
  inscricaoEstadual     String?
  inscricaoMunicipal    String?
  regimeTributario      String   // 1=Simples, 2=Estimativa, 3=Normal
  
  // Endereço
  logradouro            String
  numero                String
  complemento           String?
  bairro                String
  cep                   String
  municipio             String
  codigoMunicipio       String   // IBGE
  uf                    String
  
  // Certificado digital (armazenado criptografado)
  certificadoPfxBase64  String?  // .pfx em base64 — NUNCA expor na API
  certificadoSenha      String?  // senha criptografada — NUNCA expor na API
  certificadoValidade   DateTime?
  
  // Sequência NF-e
  serieNFe              String   @default("1")
  numeroUltimaNFe       Int      @default(0)
  
  // Sequência NFS-e
  serieNFSe             String   @default("1")
  numeroUltimaNFSe      Int      @default(0)
  
  // Ambiente
  ambienteSEFAZ         String   @default("homologacao") // homologacao | producao
  
  ativo                 Boolean  @default(true)
  criadoEm              DateTime @default(now())
  
  DocumentoFiscal       DocumentoFiscal[]
}
```

### 3.4 Expandir tabela `DocumentoFiscal`

```prisma
model DocumentoFiscal {
  id                  Int              @id @default(autoincrement())
  pedidoId            Int
  empresaEmissoraId   Int
  
  tipo                TipoDocumento    // NFE | NFSE
  status              StatusDocumento  // PENDENTE | AUTORIZADA | REJEITADA | CANCELADA
  
  // Identificação
  numero              String?          // número da NF autorizada
  serie               String?
  chaveAcesso         String?          // 44 dígitos
  protocolo           String?          // protocolo de autorização do SEFAZ
  
  // Arquivos
  xmlAutorizadoBase64 String?          // XML completo autorizado
  danfePdfBase64      String?          // PDF do DANFe
  
  // Datas
  dataEmissao         DateTime?
  dataAutorizacao     DateTime?
  
  // Erros
  codigoRejeicao      String?
  mensagemRejeicao    String?
  
  // Cancelamento
  dataCancelamento    DateTime?
  motivoCancelamento  String?
  xmlCancelamento     String?
  
  criadoEm            DateTime         @default(now())
  atualizadoEm        DateTime         @updatedAt
  
  Pedido              Pedido           @relation(fields: [pedidoId], references: [id])
  EmpresaEmissora     EmpresaEmissora  @relation(fields: [empresaEmissoraId], references: [id])
}

enum TipoDocumento {
  NFE
  NFSE
}

enum StatusDocumento {
  PENDENTE
  AUTORIZADA
  REJEITADA
  CANCELADA
}
```

---

## 4. Arquitetura de serviços

A equipe deve respeitar esta separação. Não misturar responsabilidades.

```
lib/
└── services/
    └── fiscal/
        ├── nfe/
        │   ├── nfe-builder.service.ts      → monta o XML da NF-e
        │   ├── nfe-signer.service.ts       → assina o XML com o .pfx
        │   ├── nfe-sender.service.ts       → envia para o SEFAZ e trata retorno
        │   ├── nfe-danfe.service.ts        → gera o PDF do DANFe
        │   └── nfe.service.ts             → orquestra os 4 acima
        │
        ├── nfse/
        │   ├── nfse-builder.service.ts    → monta o payload JSON da DPS
        │   ├── nfse-sender.service.ts     → envia para a API Nacional e trata retorno
        │   └── nfse.service.ts            → orquestra os 2 acima
        │
        ├── certificado.service.ts         → carrega e descriptografa o .pfx
        └── fiscal.service.ts              → entrada única — decide NF-e ou NFS-e
```

**Regra de ouro:** o `PedidoService` existente só chama o `fiscal.service.ts`. Ele não sabe nada sobre XML, SEFAZ ou certificado. Isolamento total.

---

## 5. Libs recomendadas

| Lib | Uso | Instalar |
|---|---|---|
| `nfe` | Montagem e envio de NF-e para SEFAZ | `npm install nfe` |
| `node-forge` | Leitura e uso do certificado `.pfx` | `npm install node-forge` |
| `xmldsigjs` | Assinatura digital do XML | `npm install xmldsigjs` |
| `pdfkit` ou `danfe` | Geração do DANFe em PDF | avaliar na fase 2 |
| `zod` | Validação dos payloads fiscais (já usado no projeto) | já instalado |
| `node-fetch` ou `axios` | Chamadas HTTP para API NFS-e Nacional | já disponível no Next.js |

> **Para a equipe:** antes de escolher a lib de NF-e definitiva, façam um spike de 1 dia: testem a `nfe` e a `dfe-node`. Tragam a recomendação com justificativa antes de commitar com uma delas.

---

## 6. Fases de implementação

### FASE 1 — Fundação (sem certificado, sem SEFAZ)
**Objetivo:** tudo que pode ser feito enquanto aguardamos o certificado do cliente.  
**Estimativa:** 2 semanas  
**Pode começar:** hoje

---

#### Tarefa 1.1 — Migrations de banco de dados
**Responsável:** 1 dev back-end sênior  
**Estimativa:** 3 dias  
**Entrega:** PRs de migration prontos para review

Checklist:
- [ ] Adicionar campos fiscais em `Produto`
- [ ] Adicionar campos de endereço estruturado e dados fiscais em `Cliente`
- [ ] Criar tabela `EmpresaEmissora` com todos os campos descritos na seção 3.3
- [ ] Expandir `DocumentoFiscal` conforme seção 3.4
- [ ] Criar enums `TipoDocumento` e `StatusDocumento`
- [ ] Seed de dados: criar registros iniciais para DAC e Pulse (sem certificado ainda)
- [ ] Validar que migrations não quebram nenhuma query existente

**Atenção:** o campo `certificadoPfxBase64` e `certificadoSenha` nunca devem aparecer em nenhuma resposta de API. Isso precisa ser validado em code review.

---

#### Tarefa 1.2 — Atualização dos formulários de cadastro
**Responsável:** 1 dev front-end  
**Estimativa:** 3 dias  
**Depende de:** Tarefa 1.1 (migrations)

Checklist:
- [ ] Formulário de cadastro/edição de `Produto`: adicionar campos NCM, CFOP, CST/CSOSN, unidade de medida, alíquotas
- [ ] Validação de NCM: deve ter exatamente 8 dígitos numéricos
- [ ] Validação de CFOP: deve ter exatamente 4 dígitos
- [ ] Formulário de cadastro/edição de `Cliente`: substituir campo de endereço livre por campos estruturados + busca por CEP (ViaCEP API — gratuita)
- [ ] Busca por CEP deve preencher automaticamente: logradouro, bairro, município, código IBGE e UF
- [ ] Adicionar campos: inscrição estadual, inscrição municipal, e-mail fiscal, contribuinte de ICMS (checkbox)
- [ ] Página de configuração das empresas emissoras (`/sistema/configuracoes`): formulário para DAC e Pulse com upload do `.pfx` e senha

**Sobre o upload do certificado:** o arquivo `.pfx` deve ser enviado via `multipart/form-data`, convertido para base64 no backend e armazenado criptografado. O front nunca recebe o base64 de volta.

---

#### Tarefa 1.3 — Serviço de montagem do XML da NF-e
**Responsável:** 1 dev back-end sênior  
**Estimativa:** 4 dias  
**Depende de:** Tarefa 1.1

Checklist:
- [ ] Criar `nfe-builder.service.ts`
- [ ] Implementar montagem do XML no layout 4.00 da NF-e com os grupos obrigatórios: `ide`, `emit`, `dest`, `det`, `total`, `transp`, `cobr`, `pag`, `infAdic`
- [ ] Implementar cálculo automático de totais: `vBC`, `vICMS`, `vProd`, `vNF`
- [ ] Cobrir os CFOPs mais comuns para distribuição hospitalar: 5102 (venda dentro do estado), 6102 (venda fora do estado)
- [ ] Escrever testes unitários com dados mockados de pedidos reais
- [ ] O serviço não deve chamar SEFAZ — só monta e retorna o XML como string

---

#### Tarefa 1.4 — Serviço de montagem do payload NFS-e Nacional
**Responsável:** 1 dev back-end  
**Estimativa:** 2 dias  
**Depende de:** Tarefa 1.1

Checklist:
- [ ] Criar `nfse-builder.service.ts`
- [ ] Implementar montagem do JSON no formato DPS Nacional
- [ ] Mapear campos do pedido MedFlow → campos da DPS
- [ ] Validar o payload contra o schema oficial (disponível em gov.br/nfse)
- [ ] Escrever testes unitários

---

#### Tarefa 1.5 — Serviço de certificado
**Responsável:** 1 dev back-end sênior  
**Estimativa:** 2 dias  
**Pode ser feito em paralelo com 1.3 e 1.4**

Checklist:
- [ ] Criar `certificado.service.ts`
- [ ] Implementar carregamento do `.pfx` da empresa emissora (busca no banco, descriptografa)
- [ ] Implementar leitura do certificado com `node-forge`: extrair chave privada e certificado público
- [ ] Implementar verificação de validade: alertar se o certificado vence em menos de 30 dias
- [ ] Implementar criptografia/descriptografia da senha com variável de ambiente (`CERT_ENCRYPTION_KEY`)
- [ ] **NUNCA** logar a senha ou o base64 do certificado

---

### FASE 2 — Integração com SEFAZ e API Nacional
**Objetivo:** conectar os serviços ao mundo real.  
**Pré-requisito:** certificado A1 recebido do cliente + Fase 1 concluída  
**Estimativa:** 2 semanas

---

#### Tarefa 2.1 — Assinatura e envio da NF-e
**Responsável:** 1 dev back-end sênior  
**Estimativa:** 5 dias

Checklist:
- [ ] Criar `nfe-signer.service.ts`: assina o XML gerado na Tarefa 1.3 usando a chave do certificado
- [ ] Criar `nfe-sender.service.ts`: envia o XML assinado para o webservice do SEFAZ-RJ
- [ ] Implementar parser do retorno: autorização, rejeição, tratamento de erros por código
- [ ] Salvar no banco: XML autorizado, chave de acesso, protocolo, data de autorização
- [ ] Implementar cancelamento de NF-e (prazo: até 24h após emissão em geral)
- [ ] Testar em homologação com o certificado do cliente
- [ ] Documentar os códigos de rejeição mais comuns e o que fazer em cada um

---

#### Tarefa 2.2 — Envio da NFS-e Nacional
**Responsável:** 1 dev back-end  
**Estimativa:** 3 dias

Checklist:
- [ ] Criar `nfse-sender.service.ts`: envia o payload DPS via REST com autenticação mTLS
- [ ] Configurar mTLS com o certificado A1 da empresa emissora
- [ ] Implementar parser do retorno
- [ ] Salvar chave de acesso e XML da NFS-e autorizada
- [ ] Implementar cancelamento
- [ ] Testar em homologação

---

#### Tarefa 2.3 — Geração do DANFe
**Responsável:** 1 dev back-end  
**Estimativa:** 3 dias

Checklist:
- [ ] Criar `nfe-danfe.service.ts`
- [ ] Gerar PDF do DANFe a partir do XML autorizado
- [ ] Salvar o PDF em base64 no banco (`DocumentoFiscal.danfePdfBase64`)
- [ ] Disponibilizar endpoint de download: `GET /api/fiscal/[id]/danfe`

---

#### Tarefa 2.4 — Envio automático por e-mail
**Responsável:** 1 dev back-end  
**Estimativa:** 2 dias

Checklist:
- [ ] Após autorização da NF-e ou NFS-e, enviar e-mail automático para o cliente com XML em anexo e link para o DANFe
- [ ] Template de e-mail com logo da empresa emissora (DAC ou Pulse)
- [ ] Registrar no histórico do pedido: "NF enviada por e-mail para [email] em [data]"

---

#### Tarefa 2.5 — Integração no fluxo do PedidoService
**Responsável:** 1 dev back-end sênior  
**Estimativa:** 2 dias  
**Depende de:** todas as anteriores

Checklist:
- [ ] Integrar `fiscal.service.ts` no `PedidoService.faturar()`
- [ ] Garantir atomicidade: se a NF for rejeitada, o pedido não avança para FATURADO
- [ ] Registrar no `HistoricoPedido`: tentativa de emissão, resultado, chave de acesso se autorizada
- [ ] Expor na tela de pedidos financeiros: status da NF (PENDENTE, AUTORIZADA, REJEITADA), chave de acesso, botão de download do DANFe

---

### FASE 3 — Polimento e produção
**Estimativa:** 1 semana

#### Tarefa 3.1 — Monitoramento e alertas
- [ ] Alerta no dashboard administrativo se o certificado vence em menos de 30 dias
- [ ] Alerta se alguma NF ficou com status PENDENTE por mais de 1 hora (possível falha silenciosa)
- [ ] Página de listagem de documentos fiscais emitidos com filtros por período, empresa emissora e status

#### Tarefa 3.2 — Ambiente de produção
- [ ] Trocar `ambienteSEFAZ` de `homologacao` para `producao` na empresa emissora
- [ ] Validar com o cliente as primeiras 3 NFs em produção antes de liberar para uso pleno
- [ ] Checklist de go-live com o cliente

---

## 7. Regras de segurança inegociáveis

Toda a equipe deve respeitar. Sem exceção. Sem discussão.

1. **O certificado `.pfx` e a senha nunca aparecem em nenhuma resposta de API.** Se aparecer em algum `console.log`, `res.json()` ou log de erro, é bug crítico.

2. **A senha do certificado é armazenada criptografada no banco.** A chave de criptografia fica em variável de ambiente (`CERT_ENCRYPTION_KEY`). Nunca em código.

3. **O XML autorizado da NF-e tem validade jurídica.** Deve ser armazenado integralmente. Nunca apagar.

4. **Logs de erro fiscal nunca devem conter dados sensíveis do cliente** (CPF, CNPJ completo, valores, etc.). Usar IDs internos nos logs.

5. **Ambiente de homologação e produção são completamente separados.** Nenhuma nota de teste vai para produção. Nenhuma nota real vai para homologação. Isso deve ser controlado por variável de ambiente, não por código condicional manual.

---

## 8. Campos obrigatórios por tipo de NF (referência rápida)

### NF-e — campos obrigatórios mínimos

| Campo | Origem no MedFlow |
|---|---|
| CNPJ emitente | `EmpresaEmissora.cnpj` |
| CNPJ/CPF destinatário | `Cliente.cnpj` ou `Cliente.cpf` |
| Endereço destinatário | `Cliente.logradouro`, `.numero`, `.bairro`, `.cep`, `.municipio`, `.uf` |
| Código IBGE do município | `Cliente.codigoMunicipio` |
| NCM do produto | `Produto.ncm` |
| CFOP | `Produto.cfop` |
| Unidade de medida | `Produto.unidadeMedida` |
| Quantidade | `ItemPedido.quantidade` |
| Valor unitário | `ItemPedido.precoUnitario` |
| CST ou CSOSN | `Produto.cst` ou `Produto.csosn` |
| Alíquota ICMS | `Produto.aliquotaIcms` |
| Forma de pagamento | `Pedido.formaPagamento` |
| Certificado assinado | `EmpresaEmissora.certificadoPfxBase64` |

### NFS-e Nacional — campos obrigatórios mínimos

| Campo | Origem no MedFlow |
|---|---|
| CNPJ prestador | `EmpresaEmissora.cnpj` |
| Inscrição municipal prestador | `EmpresaEmissora.inscricaoMunicipal` |
| Código município emissora | `EmpresaEmissora.codigoMunicipio` |
| CNPJ/CPF tomador | `Cliente.cnpj` |
| Endereço tomador | campos de endereço do `Cliente` |
| Código NBS | a ser definido com o cliente por tipo de serviço |
| Código tributação ISS | a ser definido com o cliente |
| Descrição do serviço | `Pedido.observacao` ou campo dedicado |
| Valor do serviço | `Pedido.valorTotal` |
| Alíquota ISS | configuração da empresa emissora |

---

## 9. O que o cliente precisa fazer (responsabilidade dele, não nossa)

Deixar claro para o cliente que alguns dados são de responsabilidade dele fornecer:

- [ ] **NCM de cada produto** — ele deve consultar a tabela NCM ou o contador
- [ ] **Código NBS para NFS-e** — o contador dele sabe qual é
- [ ] **Código de serviço ISS** — definido pelo município de Maricá
- [ ] **Certificado A1** — `.pfx` + senha (já comunicado por e-mail)
- [ ] **Solicitar liberação para emissão via webservice** na prefeitura de Maricá (necessário para NFS-e)
- [ ] **Credenciais de homologação** no portal da prefeitura

---

## 10. Critérios de aceite — o que valida que está pronto

### Fase 1 concluída quando:
- Migrations aplicadas em staging sem erros
- Formulários de produto e cliente salvando todos os campos fiscais
- `nfe-builder` gerando XML válido (validado contra o schema XSD da SEFAZ) com dados mockados
- `nfse-builder` gerando payload DPS válido com dados mockados
- `certificado.service` lendo e descriptografando o `.pfx` corretamente

### Fase 2 concluída quando:
- NF-e emitida e autorizada pelo SEFAZ-RJ em **homologação**
- NFS-e emitida e autorizada pela API Nacional em **homologação**
- DANFe gerado em PDF e disponível para download
- E-mail enviado automaticamente com XML e DANFe após autorização
- Pedido avança para `AUTORIZADO_PARA_SEPARACAO` somente após NF autorizada

### Fase 3 concluída quando:
- Primeiras 3 NFs emitidas em **produção** validadas pelo cliente
- Alerta de certificado próximo ao vencimento funcionando
- Cliente treinado no fluxo

---

*Documento mantido pelo CTO. Qualquer alteração de escopo deve ser aprovada antes de implementar.*
