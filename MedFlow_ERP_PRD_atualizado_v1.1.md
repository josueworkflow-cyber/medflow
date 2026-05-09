# Documento de Requisitos de Produto (PRD) - MedFlow ERP

**Versão:** 1.3  
**Status:** Base oficial de contexto para IA e desenvolvimento  
**Última atualização:** Sincronização completa com o código atual. Adicionados: Contabilidade (5ª página do Financeiro), módulos Compras, Vendedores, Categorias, Relatórios e Configurações. Novas entidades (TabelaPreco, Localizacao, PedidoCompra). Alinhamento de nomenclatura de perfis e status com o código. Documentação do futuro App Mobile Android para VENDAS e ESTOQUE.

---

## 0. Contexto Obrigatório para a IA

Este documento deve ser usado como **base permanente de contexto** para qualquer solicitação futura sobre o **MedFlow ERP**.

Sempre que uma nova tela, funcionalidade, fluxo, componente, API, regra de negócio, banco de dados ou melhoria visual for solicitada, a IA deve respeitar as regras, módulos, entidades, status e fluxos descritos neste PRD.

A IA não deve reinventar o funcionamento do ERP, criar fluxos paralelos ou adicionar módulos desnecessários sem solicitação explícita.

O MedFlow ERP é um ERP vertical para uma empresa de distribuição de produtos hospitalares. O sistema precisa controlar:

- Vendas
- Pedidos
- Estoque
- Lote e validade
- Reserva de produtos
- Separação
- Despacho
- Pedido normal com NF
- Pedido interno sem NF
- Financeiro
- Faturamento
- Clientes
- Fornecedores
- Relatórios gerenciais
- Histórico e auditoria

Regra crítica:

> O ERP não controla entrega, logística, transportadora, rota, rastreio ou confirmação de entrega. Depois que o pedido for marcado como **Entregue**, ele deve ser **Finalizado**.

---

## 1. Introdução e Objetivo

O **MedFlow ERP** é uma solução vertical para o setor de distribuição hospitalar.

Seu objetivo principal é organizar a operação da empresa de ponta a ponta, garantindo controle sobre pedidos, estoque, lote, validade, faturamento, financeiro e histórico de movimentações.

O sistema deve permitir que cada setor saiba exatamente:

- O que precisa fazer
- Qual pedido está sob sua responsabilidade
- Qual status o pedido possui
- Quem alterou cada etapa
- Quando a alteração foi feita
- Qual produto foi reservado, separado ou baixado do estoque
- Se a saída foi por pedido normal com NF ou por pedido interno
- Por qual empresa fiscal a saída ocorreu, quando houver NF

### Diferenciais Técnicos e Operacionais

- **Interface com percepção de alta velocidade:** uso de `Framer Motion`, `Skeleton Loaders` e atualização otimizada de dados para entregar uma experiência fluida e moderna.
- **Transações Atômicas:** uso de Prisma Transactions para garantir que operações críticas, como reserva de estoque, baixa de produto, faturamento e movimentações, aconteçam com integridade e sem inconsistência.
- **Rastreabilidade de Produtos Hospitalares:** estrutura de banco de dados preparada para controlar lote, validade, movimentações, reservas e histórico de saída dos produtos.
- **Histórico Completo de Status:** toda mudança relevante no pedido deve gerar registro com usuário, setor, data e hora, status anterior, novo status e observação.
- **Controle por Responsabilidade Setorial:** o pedido pode ser visualizado por todos os setores, mas só pode ser alterado pelo setor responsável pela etapa atual.

---

## 2. Arquitetura de Segurança e Acesso

## 2. Arquitetura de Segurança, Acesso e Permissões

O MedFlow ERP deve possuir controle de acesso por perfil de usuário, garantindo que cada setor visualize as informações necessárias, mas só consiga alterar pedidos, dados e status quando estiver dentro da sua responsabilidade operacional.

O pedido pode ser visualizado por todos os setores autorizados, porém somente o setor responsável pela etapa atual poderá realizar alterações.

---

### 2.1 Perfis de Usuário

O sistema deve possuir os seguintes perfis principais:

#### ADMINISTRADOR

Perfil com acesso total ao sistema.

Permissões:

- Gerenciar usuários
- Gerenciar permissões
- Visualizar todos os módulos
- Editar cadastros principais
- Acessar dashboard executivo
- Consultar histórico completo dos pedidos
- Ajustar configurações do sistema
- Visualizar financeiro, estoque, vendas e fiscal
- Acessar relatórios gerenciais
- Acessar página de configurações

---

#### VENDAS

Perfil responsável pela criação e acompanhamento comercial do pedido.

Permissões:

- Criar pedidos
- Selecionar cliente
- Adicionar produtos
- Definir quantidade
- Informar valor
- Informar forma de pagamento, se disponível
- Adicionar observações
- Definir tipo de pedido: com NF ou pedido interno
- Acompanhar status do pedido
- Confirmar venda com o cliente após pré-aprovação financeira
- Marcar cliente confirmou
- Marcar cliente recusou
- Enviar pedido para revisão
- Gerenciar clientes (CRUD)
- Gerenciar vendedores (CRUD)
- Visualizar catálogo de produtos e categorias
- Visualizar dashboard e funil de vendas

Restrições:

- Não pode aprovar financeiro
- Não pode faturar
- Não pode emitir NF
- Não pode separar produto
- Não pode dar baixa no estoque
- Não pode alterar pedido fora da etapa comercial
- Não pode acessar módulo financeiro, estoque, compras ou fornecedores
- Não pode acessar usuários, relatórios ou configurações

---

#### ESTOQUE

Perfil responsável por disponibilidade, reserva, separação, despacho, compras e entrada de estoque.

Permissões:

- Visualizar pedidos que estão na etapa de estoque
- Confirmar disponibilidade de produtos
- Verificar produtos parcialmente disponíveis
- Marcar produto como indisponível
- Reservar produto para pedido
- Separar produto
- Conferir produto
- Marcar pedido como separado
- Marcar pedido como despachado
- Registrar movimentações de estoque
- Visualizar lote, validade e saldo disponível
- Gerenciar fornecedores (CRUD)
- Criar pedidos de compra
- Importar NF-e de entrada (XML)
- Registrar entrada de estoque com lote e validade
- Visualizar giro de estoque e alertas
- Visualizar catálogo de produtos e categorias

Restrições:

- Não pode criar pedido comercial
- Não pode aprovar financeiro
- Não pode faturar
- Não pode emitir NF
- Não pode alterar forma de pagamento
- Não pode alterar pedido quando ele não estiver na etapa do estoque
- Não pode acessar módulo financeiro, vendas ou clientes
- Não pode acessar usuários, relatórios ou configurações

Regra importante:

Quando o pedido for marcado como despachado, o sistema deve finalizar automaticamente o pedido.

---

#### FINANCEIRO

Perfil responsável por pré-aprovação, faturamento, autorização de pedido interno e geração de contas a receber.

Permissões:

- Visualizar pedidos aguardando pré-aprovação financeira
- Analisar valor do pedido
- Analisar forma de pagamento
- Verificar pendências do cliente
- Aprovar ou reprovar condição comercial
- Enviar pedido para revisão
- Faturar pedido com NF
- Autorizar pedido interno
- Escolher empresa emissora: DAC ou Pulse
- Gerar conta a receber
- Liberar pedido para separação
- Gerenciar fornecedores (consulta compartilhada com ESTOQUE)
- Visualizar dashboard e funil de vendas
- Acessar painéis financeiros (dashboard, pedidos, contas, fluxo de caixa, contabilidade)

Restrições:

- Não pode separar produto
- Não pode despachar pedido
- Não pode alterar disponibilidade de estoque
- Não pode confirmar venda no lugar do vendedor
- Não pode alterar pedido quando ele não estiver na etapa financeira
- Não pode acessar módulo de estoque, compras, vendas ou clientes
- Não pode acessar usuários, relatórios ou configurações

---

### 2.2 Regra de Acesso por Etapa do Pedido

O sistema deve controlar permissões com base no perfil do usuário e no status atual do pedido.

Exemplo:

- Se o pedido estiver em "Aguardando verificação do estoque", apenas o estoque pode alterar.
- Se o pedido estiver em "Aguardando pré-aprovação financeira", apenas o financeiro pode aprovar ou reprovar.
- Se o pedido estiver em "Aguardando confirmação do cliente", apenas o vendedor pode confirmar, cancelar ou enviar para revisão.
- Se o pedido estiver em "Autorizado para separação", apenas o estoque pode iniciar a separação.
- Se o pedido estiver em "Separado", apenas o estoque pode marcar como despachado.
- Depois de "Despachado", o pedido deve ser finalizado automaticamente.

---

### 2.3 Histórico e Auditoria

Toda alteração relevante no pedido deve gerar um registro de histórico.

O histórico deve conter:

- Usuário responsável
- Perfil/setor do usuário
- Data e hora da alteração
- Status anterior
- Novo status
- Observação, se houver
- Tipo de ação realizada

Exemplos de ações que devem gerar histórico:

- Criação do pedido
- Confirmação de estoque
- Reserva de produto
- Pré-aprovação financeira
- Reprovação financeira
- Confirmação do cliente
- Cancelamento do pedido
- Faturamento
- Autorização de pedido interno
- Liberação para separação
- Início da separação
- Pedido separado
- Pedido despachado
- Pedido finalizado

---

### 2.4 Autenticação

O sistema deve possuir tela de login para acesso dos usuários internos.

Cada usuário deve acessar o sistema com:

- E-mail ou login
- Senha
- Perfil vinculado

Após o login, o sistema deve identificar o perfil do usuário e liberar apenas as telas e ações compatíveis com sua função.

Perfis esperados (enum `PerfilUsuario` no código):

- ADMINISTRADOR
- VENDAS
- ESTOQUE
- FINANCEIRO

---

### 2.5 Proteção de Rotas

As páginas internas do sistema devem ser protegidas.

Usuários não autenticados não podem acessar o ERP.

Usuários autenticados só podem acessar módulos permitidos ao seu perfil.

Exemplos:

- VENDAS acessa Vendas, Clientes, Vendedores e acompanhamento de pedidos.
- ESTOQUE acessa Estoque, Compras, Fornecedores, separação e movimentações.
- FINANCEIRO acessa pré-aprovação, faturamento, contas a receber, fluxo de caixa e contabilidade.
- ADMINISTRADOR acessa todos os módulos.

---

### 2.6 Regra Principal de Segurança Operacional

O pedido pode ser visível para todos os setores autorizados, mas só pode ser alterado pelo setor responsável pela etapa atual.

Essa regra evita alterações indevidas, melhora a organização da operação e garante rastreabilidade completa do processo.

## 3. Fluxo Oficial do Pedido

Este é o fluxo principal e obrigatório do pedido dentro do MedFlow ERP.

A IA deve sempre respeitar este fluxo ao criar telas, APIs, componentes, status, cards, dashboards ou regras de negócio.

---

### 3.1 Criação do Pedido pelo Vendedor

O vendedor cria o pedido na página de vendas.

O vendedor informa:

- Cliente
- Produtos
- Quantidade
- Valor
- Forma de pagamento, opcional neste momento
- Observações
- Tipo de pedido:
  - Pedido normal com NF
  - Pedido interno sem NF

Status inicial:

- **Pedido criado**

Regra sobre forma de pagamento:

- A forma de pagamento pode ser informada na criação do pedido.
- A forma de pagamento não deve ser obrigatória nesse primeiro momento.
- Antes do faturamento ou autorização final, a forma de pagamento precisa estar definida.

---

### 3.2 Verificação de Disponibilidade pelo Estoque

Após a criação do pedido, o sistema deve verificar automaticamente a disponibilidade dos produtos no estoque, inclusive sinalizar que foi o proprio sistema que confirmou se o produto estava disponivel no estoque

Possíveis resultados:

- **Disponível** --- sinalizar
- **Parcialmente disponível** ---- Sinalizar e encaminhar para o Estoque resolver (caso não tenha um kpi sobre isso verificar p incluir)
- **Indisponível** ------ Sinalizar em Emerg o estoque.

#### Quando estiver disponível

Se todos os produtos estiverem disponíveis, o próprio sistema pode confirmar a disponibilidade e reservar os produtos para o pedido.

Status:

- **Estoque confirmado**

Regra:

> Quando o estoque for confirmado, os produtos devem ficar reservados para aquele pedido.

#### Quando estiver parcialmente disponível ou indisponível

Se o produto estiver parcialmente disponível ou indisponível, o estoquista deve entrar em ação para verificar a veracidade da informação.

O estoquista poderá:

- Confirmar disponibilidade manualmente
- Informar disponibilidade parcial
- Marcar como indisponível
- Solicitar compra/fornecedor
- Devolver o pedido para revisão

Status possíveis:

- **Aguardando verificação do estoque**
- **Estoque confirmado**
- **Parcialmente disponível**
- **Produto indisponível**
- **Aguardando fornecedor**
- **Pedido em revisão**

---

### 3.3 Pré-Aprovação Financeira

Após a confirmação do estoque, o pedido vai para o financeiro.

Neste momento, o financeiro ainda não fatura o pedido. Ele apenas analisa se o pedido pode seguir para confirmação com o cliente.

Esta etapa deve ter uma nova página ou área específica para pedidos da parte financeira.

O financeiro verifica:

- Valor do pedido
- Forma de pagamento
- Se o cliente possui dívida
- Prazo de pagamento
- Desconto aplicado
- Se o pedido precisa de NF
- Se está tudo certo para a venda seguir

Status quando chega ao financeiro:

- **Aguardando pré-aprovação financeira**

Status quando aprovado:

- **Pré-aprovado pelo financeiro**

Se houver problema:

- **Reprovado pelo financeiro**
- **Pedido em revisão**
- **Pagamento pendente**
- **Condição comercial pendente**

Regra:

> Pré-aprovação financeira não é faturamento. É apenas uma validação para o vendedor poder confirmar a condição com o cliente.

---

### 3.4 Confirmação com o Cliente

Depois que o financeiro faz a pré-aprovação, o pedido volta para o vendedor.

O vendedor entra em contato com o cliente e confirma a venda.

Mensagem base:

> Está tudo certo, temos o produto e conseguimos fazer nessa condição.

O cliente pode:

- Confirmar
- Recusar
- Pedir alteração

Status enquanto aguarda retorno:

- **Aguardando confirmação do cliente**

Se o cliente confirmar:

- **Cliente confirmou**

Se o cliente desistir:

- **Pedido cancelado pelo cliente**

Se o cliente pedir mudança:

- **Pedido em revisão**

Regra importante:

> O vendedor só deve confirmar a venda com o cliente depois que o estoque confirmou a disponibilidade e o financeiro pré-aprovou o pedido.

---

### 3.5 Retorno ao Financeiro para Faturamento ou Autorização

Após o cliente confirmar, o pedido volta para o financeiro.

Agora o financeiro executa a etapa final antes da separação.

O financeiro faz:

- Faturamento
- Emissão de NF, se for pedido normal com nota
- Autorização de pedido interno, se não houver NF
- Geração de conta a receber
- Registro ou confirmação da forma de pagamento
- Escolha da empresa emissora, quando houver NF
- Liberação para separação

Status ao chegar nessa etapa:

- **Aguardando faturamento**

Se for pedido normal com NF:

- **Faturado**

Se for pedido interno sem NF:

- **Pedido interno autorizado**

Regra importante:

> Pedido interno não emite NF dentro do sistema, mas ainda precisa passar por autorização financeira e gerar movimentação de estoque.

---

### 3.6 Empresa Emissora: DAC ou Pulse

Quando o pedido for faturado com NF, o financeiro poderá escolher por qual empresa o produto será emitido:

- **DAC**
- **Pulse**

A entrada de estoque não precisa estar vinculada a uma empresa emissora específica.

Porém, na saída do produto, o sistema deve registrar no histórico de movimentação qual empresa realizou a saída/faturamento.

Exemplo:

- Produto entrou no estoque de forma operacional.
- Na saída, o financeiro faturou pela empresa DAC.
- No histórico de movimentação deve aparecer que aquele produto saiu pela DAC.

Regra:

> A empresa emissora deve estar vinculada à saída/faturamento, não obrigatoriamente à entrada do estoque.

---

### 3.7 Separação pelo Estoque

Depois que o financeiro fatura o pedido normal ou autoriza o pedido interno, o pedido volta para o estoque.

O estoque faz:

- Separação
- Conferência
- Embalagem
- Despacho

Status inicial nessa etapa:

- **Autorizado para separação**

Depois:

- **Separado**

Depois:

- **Despachado**

Regra importante:

> O estoque só pode separar produtos depois que o financeiro faturar o pedido normal ou autorizar o pedido interno.

---

### 3.8 Despacho e Finalização

Após o pedido ser separado, o estoque realiza o despacho.

A empresa não controla entrega dentro do ERP.

O sistema não deve possuir módulo, tela, status, card, campo ou regra para:

- Entrega
- Logística
- Transportadora
- Motoboy
- Rota
- Rastreio
- Código de rastreio
- Confirmação de entrega
- Comprovante de entrega
- Status de entregue
- Acompanhamento de transporte

Depois que o pedido for marcado como **Despachado**, ele deve ser **Finalizado**.

Status finais:

- **Separado**
- **Despachado**
- **Finalizado**

Regra crítica:

> O ERP controla até o despacho. Após o despacho, o pedido deve ser finalizado automaticamente ou por ação simples de finalização, sem controle de entrega.

---

## 4. Status Oficiais do Pedido

Os principais status do pedido (enum `StatusPedido` no código) são:

1. **PEDIDO_CRIADO** — Pedido criado
2. **AGUARDANDO_ESTOQUE** — Aguardando verificação do estoque
3. **ESTOQUE_CONFIRMADO** — Estoque confirmado
4. **ESTOQUE_PARCIAL** — Parcialmente disponível
5. **ESTOQUE_INDISPONIVEL** — Produto indisponível
6. **AGUARDANDO_FORNECEDOR** — Aguardando fornecedor
7. **AGUARDANDO_APROVACAO_FINANCEIRA** — Aguardando pré-aprovação financeira
8. **APROVADO_FINANCEIRO** — Pré-aprovado pelo financeiro
9. **REPROVADO_FINANCEIRO** — Reprovado pelo financeiro
10. **PAGAMENTO_PENDENTE** — Pagamento pendente
11. **CONDICAO_COMERCIAL_PENDENTE** — Condição comercial pendente
12. **AGUARDANDO_CONFIRMACAO_CLIENTE** — Aguardando confirmação do cliente
13. **CLIENTE_CONFIRMOU** — Cliente confirmou
14. **PEDIDO_EM_REVISAO** — Pedido em revisão
15. **CANCELADO_PELO_CLIENTE** — Pedido cancelado pelo cliente
16. **AGUARDANDO_FATURAMENTO** — Aguardando faturamento
17. **FATURADO** — Faturado
18. **PEDIDO_INTERNO_AUTORIZADO** — Pedido interno autorizado
19. **AUTORIZADO_PARA_SEPARACAO** — Autorizado para separação
20. **EM_SEPARACAO** — Em separação
21. **SEPARADO** — Separado
22. **DESPACHADO** — Despachado
23. **FINALIZADO** — Finalizado
24. **CANCELADO** — Cancelado

Status que não devem existir no sistema:

- Saiu para entrega
- Entregue
- Em trânsito
- Trânsito
- Aguardando confirmação de entrega
- Despachado para entrega terceirizada
- Entrega com problema
- Rota de entrega
- Aguardando transportadora

---

## 5. Regras Gerais do Fluxo

1. Toda mudança de status deve registrar a assinatura de quem fez a atualização.

2. O histórico do pedido deve registrar:
   - Usuário responsável
   - Setor
   - Data e hora
   - Status anterior
   - Novo status
   - Observação, se houver

3. O pedido pode aparecer para todos os setores, mas só o setor responsável pela etapa atual pode alterar o pedido.

4. Se o pedido não estiver na etapa do estoque, o usuário logado como estoque não pode alterar nada nesse pedido.

5. Se o pedido não estiver na etapa do financeiro, o usuário logado como financeiro não pode faturar, aprovar ou alterar dados financeiros.

6. O vendedor é responsável por criar o pedido e confirmar com o cliente.

7. O estoque é responsável por verificar disponibilidade, reservar, separar e registrar a movimentação física.

8. O financeiro é responsável por pré-aprovar, faturar, autorizar pedido interno, definir empresa emissora e gerar contas a receber.

9. Nenhum produto deve ser separado antes da autorização final do financeiro.

10. Todo produto reservado deve ser liberado automaticamente caso o pedido seja cancelado, recusado pelo cliente ou enviado para revisão.

11. Toda saída de produto deve gerar movimentação de estoque.

12. Quando houver faturamento por NF, a saída deve registrar a empresa emissora: DAC ou Pulse.

13. Pedido interno não deve aparecer como faturamento fiscal, mas deve aparecer como saída operacional de estoque.

14. O ERP não deve controlar entrega ou logística.

15. Depois de despachado, o pedido deve ser finalizado.

---

## 6. Análise Detalhada dos Módulos

### 6.1 Dashboard Executivo (`/sistema/page.tsx`)

Indicadores principais:

- Faturamento mensal, considerando pedidos faturados com NF
- Pedidos em aberto
- Pedidos aguardando estoque
- Pedidos aguardando financeiro
- Pedidos aguardando confirmação do cliente
- Pedidos autorizados para separação
- SKUs ativos
- Produtos vencendo em 30 dias
- Valor de estoque

Regras:

- Pedido interno não deve compor faturamento fiscal.
- Pedido interno pode aparecer como saída operacional.
- O dashboard pode mostrar pedidos por status e gargalos por setor.

### 6.2 Catálogo de Produtos (`/sistema/produtos`)

Lógica de funcionamento:

- **Server-Side Fetching:** a página principal busca os dados no servidor (`getProdutos`) para velocidade inicial.
- **Client Management (`ProdutosClient.tsx`):**
  - Markup automático: `((Venda - Custo) / Custo) * 100`.
  - Controle sanitário: flags para `controlaValidade` e `controlaLote` determinam se o sistema exigirá esses dados em futuras entradas.
  - SWR para atualização instantânea após cadastro ou exclusão sem recarregar a página.

### 6.3 Pipeline de Pedidos e Funil Kanban (`/sistema/vendas` e `/sistema/pedidos/funil`)

O pipeline deve refletir o fluxo oficial do pedido.

Colunas oficiais do funil (implementado em `funil/page.tsx`):

| Coluna | Status incluídos |
| :--- | :--- |
| CRIADO | PEDIDO_CRIADO |
| ESTOQUE | AGUARDANDO_ESTOQUE, ESTOQUE_PARCIAL, ESTOQUE_INDISPONIVEL, AGUARDANDO_FORNECEDOR, ESTOQUE_CONFIRMADO |
| FINANCEIRO | AGUARDANDO_APROVACAO_FINANCEIRA, PAGAMENTO_PENDENTE, CONDICAO_COMERCIAL_PENDENTE, REPROVADO_FINANCEIRO |
| CLIENTE | APROVADO_FINANCEIRO, AGUARDANDO_CONFIRMACAO_CLIENTE, PEDIDO_EM_REVISAO |
| FATURAMENTO | CLIENTE_CONFIRMOU, AGUARDANDO_FATURAMENTO, FATURADO, PEDIDO_INTERNO_AUTORIZADO |
| SEPARACAO | AUTORIZADO_PARA_SEPARACAO, EM_SEPARACAO |
| DESPACHO | SEPARADO, DESPACHADO |
| FINALIZADO | FINALIZADO, CANCELADO, CANCELADO_PELO_CLIENTE |

Não usar colunas de entrega, trânsito ou entregue.

Dois modos de operação:

- **PEDIDO_NORMAL:** pedido com faturamento e NF. Exige empresa emissora no momento do faturamento/saída.
- **PEDIDO_INTERNO:** pedido sem NF dentro do sistema. Não passa por emissão de NF, mas passa por autorização financeira e baixa de estoque.

Regra:

> Pedido interno não pula o financeiro; ele pula apenas a emissão de NF.

### 6.4 Gestão de Clientes e Fornecedores

- **Clientes (`/sistema/clientes`):** gerencia dados comerciais, dados de faturamento, limite de crédito e histórico de pedidos.
- **Fornecedores (`/sistema/fornecedores`):** usado para compras, entrada de estoque e consulta operacional.

### 6.5 Estoque Central (`/sistema/estoque`)

O estoque deve controlar:

- Posição atual
- Produto disponível
- Produto reservado
- Lote
- Validade
- Movimentações
- Entradas
- Saídas
- Perdas
- Ajustes
- Quarentena, se necessário
- Separação
- Despacho

### 6.6 Estoque Operacional e Camada Fiscal

O sistema trabalha com duas camadas:

#### Estoque Operacional

Controle físico dos produtos.

Permite:

- Entradas rápidas
- Ajustes
- Perdas
- Movimentações internas
- Reserva de produtos
- Separação
- Baixa de estoque

#### Camada Fiscal

Controle de faturamento quando houver NF.

Uma saída/faturamento exige vínculo com:

- Cliente
- Pedido de venda
- Empresa emissora, DAC ou Pulse
- Documento fiscal, quando aplicável

Regra:

> A entrada de estoque não precisa definir DAC ou Pulse. A empresa emissora deve ser definida na saída/faturamento.

### 6.7 Módulo Financeiro (Reorganizado v1.2)

O módulo financeiro é organizado em **5 páginas principais**, com abas internas e modais para ações complexas. Não concentrar tudo em uma tela única e não criar páginas desnecessárias.

Os perfis com acesso ao módulo financeiro são: **FINANCEIRO** e **ADMINISTRADOR**.

---

#### 6.7.1 Financeiro / Dashboard (`/sistema/financeiro`)

Página principal com visão geral, alertas e atalhos. Funciona como resumo estratégico do financeiro.

**Cards KPI (12 indicadores, todos clicáveis como atalhos/filtros):**

| Card | Descrição | Rota de destino |
| :--- | :--- | :--- |
| Recebido no mês | Soma de contas RECEBER com status PAGA no mês corrente | `/contas?tab=RECEBER` |
| A receber em aberto | Soma de contas RECEBER com status ABERTA ou VENCIDA | `/contas?tab=RECEBER` |
| Pago no mês | Soma de contas PAGAR com status PAGA no mês corrente | `/contas?tab=PAGAR` |
| A pagar em aberto | Soma de contas PAGAR com status ABERTA ou VENCIDA | `/contas?tab=PAGAR` |
| Saldo realizado | Recebido no mês - Pago no mês | `/fluxo-caixa` |
| Saldo previsto | (A receber em aberto) - (A pagar em aberto) | `/fluxo-caixa` |
| Contas vencidas | Total de contas com status ABERTA e vencimento < hoje | `/contas?tab=RECEBER` |
| Vencendo hoje | Contas com vencimento exatamente hoje | `/contas?tab=RECEBER` |
| Aguardando pré-aprovação | Pedidos em AGUARDANDO_APROVACAO_FINANCEIRA, PAGAMENTO_PENDENTE ou CONDICAO_COMERCIAL_PENDENTE | `/pedidos?filtro=pre_aprovacao` |
| Aguardando faturamento | Pedidos em AGUARDANDO_FATURAMENTO ou CLIENTE_CONFIRMOU | `/pedidos?filtro=faturamento` |
| Internos p/ autorizar | Pedidos internos pendentes de autorização | `/pedidos?filtro=pendente_interno` |
| Clientes c/ pendência | Contagem de clientes com contas pendentes | `/contas?tab=DEVEDORES` |

**Cards de atalho inferiores:** cards resumidos para "Pedidos Financeiros" e "Fluxo de Caixa".

**API:** `GET /api/financeiro/resumo` — retorna todos os 12 KPIs em uma única chamada com agregações `_sum` e `_count`.

---

#### 6.7.2 Financeiro / Pedidos Financeiros (`/sistema/financeiro/pedidos`)

Página focada nos pedidos que exigem ação do financeiro. É o local onde o financeiro trabalha o fluxo dos pedidos.

**Filtros/abas internas (botões horizontais):**

| Filtro | Status incluídos |
| :--- | :--- |
| Aguardando pré-aprovação | AGUARDANDO_APROVACAO_FINANCEIRA, PAGAMENTO_PENDENTE, CONDICAO_COMERCIAL_PENDENTE |
| Pré-aprovados | APROVADO_FINANCEIRO, AGUARDANDO_CONFIRMACAO_CLIENTE |
| Cliente confirmou | CLIENTE_CONFIRMOU, AGUARDANDO_FATURAMENTO |
| Aguardando faturamento | AGUARDANDO_FATURAMENTO |
| Internos ag. autorização | Pedidos internos em AGUARDANDO_FATURAMENTO |
| Faturados | FATURADO, AUTORIZADO_PARA_SEPARACAO, EM_SEPARACAO, SEPARADO, DESPACHADO, FINALIZADO |
| Liberados para separação | AUTORIZADO_PARA_SEPARACAO, EM_SEPARACAO, SEPARADO |
| Em revisão | REPROVADO_FINANCEIRO, PEDIDO_EM_REVISAO |
| Todos | Todos acima combinados |

**Cada pedido exibe um card com:**

- Número do pedido
- Tipo (Normal/NF ou Interno) como badge
- Forma de pagamento como badge
- Status atual como badge colorido
- Cliente (razão social)
- Vendedor e data
- Valor total e desconto
- Histórico financeiro do cliente (total de compras, contas abertas, inadimplências)
- Lista de itens com quantidade x preço unitário = subtotal
- Histórico do pedido (últimas 5 transições com usuário, data, status e observação)

**Ações possíveis por card:**

| Ação | Comportamento | Disponível quando |
| :--- | :--- | :--- |
| Pré-aprovar | Chama `transicionar(id, "aprovar")` — move para APROVADO_FINANCEIRO → AGUARDANDO_CONFIRMACAO_CLIENTE | Status de pré-aprovação |
| Reprovar | Chama `transicionar(id, "reprovar", { observacao })` — move para REPROVADO_FINANCEIRO, cancela reservas | Status de pré-aprovação |
| Marcar pagamento pendente | Chama `transicionar(id, "pagamento_pendente")` | Status de pré-aprovação |
| Marcar condição pendente | Chama `transicionar(id, "condicao_pendente")` | Status de pré-aprovação |
| Enviar para revisão | Chama `transicionar(id, "pedido_em_revisao")` — cancela reservas | Qualquer status |
| Revisar valores | Abre painel inline para editar forma de pagamento, prazo e desconto | Status de pré-aprovação |
| Faturar & emitir NF | Abre modal `FaturarConfirmModal` com seleção de empresa (DAC/Pulse), depois chama `transicionar(id, "faturar")` | Pedido normal em faturamento |
| Autorizar pedido interno | Chama `transicionar(id, "autorizar_interno")` | Pedido interno em faturamento |

**Seções visuais:**

- **Pré-Aprovação Financeira** — cards com header âmbar, ações de aprovar/reprovar/pagamento/condição/revisão
- **Faturamento** — cards com header verde, ações de faturar com NF ou autorizar interno, mostra histórico do pedido
- **Faturados / Liberados** — tabela resumida com pedido, cliente, tipo, valor, status, data

**API:** `GET /api/financeiro/pedidos?filtro=` — retorna `{ pedidos, historicoClientes, empresas }`. O `historicoClientes` contém para cada cliente: total de compras, contas abertas, valor aberto, inadimplências e valor inadimplente.

**Regras:**

- O financeiro NÃO pode confirmar venda no lugar do vendedor
- O financeiro NÃO pode separar produto ou despachar
- O financeiro só pode alterar pedidos na etapa financeira
- Toda transição gera registro em `HistoricoPedido`
- Reprovação e envio para revisão cancelam reservas de estoque automaticamente
- Pedido interno não emite NF mas gera conta a receber e movimentação de estoque

---

#### 6.7.3 Financeiro / Contas (`/sistema/financeiro/contas`)

Página única para controlar Contas a Receber, Contas a Pagar e Clientes Devedores. Organizada com **3 abas internas**.

**Aba 1 — Contas a Receber:**

Tabela com colunas:

- Cliente
- Descrição (com categoria opcional)
- Pedido vinculado (se houver, exibe `#numero`)
- Parcela (ex: 1/3)
- Valor original
- Valor pago
- Saldo em aberto (valor - valorPago)
- Vencimento
- Dias para vencer ou dias em atraso (ex: "5d" ou "3d atraso")
- Forma de pagamento
- Status (ABERTA, PAGA, VENCIDA, CANCELADA) como badge colorido
- Ações

**Ações disponíveis na tabela:**

| Ação | Descrição |
| :--- | :--- |
| Baixar | Abre modal de baixa financeira para registrar recebimento total ou parcial |
| Editar vencimento | Abre modal para alterar data de vencimento e observação |
| Histórico | Abre modal com lista de `HistoricoPagamento` (valor, data, forma, observação) |
| Cancelar conta | Soft-delete: muda status para CANCELADA |

**Aba 2 — Contas a Pagar:**

Mesma estrutura da aba Contas a Receber, porém com fornecedor/categoria no lugar de cliente.

**Ações disponíveis:**

- Registrar pagamento (total ou parcial)
- Editar vencimento
- Histórico de pagamentos
- Cancelar conta

**Aba 3 — Clientes / Devedores:**

Visão por cliente com pendências. Tabela com colunas:

- Cliente (razão social + CNPJ/CPF)
- Total em aberto (R$)
- Total vencido (R$, vermelho se > 0)
- Total a vencer (R$)
- Vence em 7 dias (R$)
- Último pagamento (data)
- Parcelas abertas (quantidade)
- Parcelas vencidas (quantidade, vermelho se > 0)
- Pedidos vinculados (badges com `#numero`)

Ordenado por total em aberto decrescente.

**API:** `GET /api/financeiro/clientes-devedores` — retorna array de clientes com todos os campos acima. Filtra apenas clientes com contas ABERTA ou VENCIDA.

---

##### Cadastro de Conta (Modal `+ Nova conta`)

Abre modal ao clicar no botão "Nova conta". Campos:

| Campo | Tipo | Obrigatório |
| :--- | :--- | :--- |
| Tipo | Select: A receber / A pagar | Sim |
| Descrição | Texto | Sim |
| Categoria | Texto (ex: Fornecedor, Operacional, Tributário) | Não |
| Valor total | Número (R$) | Sim |
| Forma de pagamento | Select (PIX, Boleto, Cartão, etc.) | Não |
| Vencimento | Data | Sim |
| Parcelas | Número (padrão 1) | Não |
| Intervalo entre parcelas | Número em dias (padrão 30) | Não |
| Observações | Textarea | Não |

**Regra de parcelamento:**

Se `parcelas > 1`, o sistema gera automaticamente N contas com:

- Valor da parcela = valorTotal / parcelas (última parcela ajusta arredondamento)
- Vencimento escalonado: dataBase + (intervalo * i) para cada parcela i
- `parcelaNumero` e `parcelaTotal` preenchidos em cada conta
- Exemplo: R$ 3.000 em 3x de 30 dias → 3 contas de R$ 1.000 com vencimentos espaçados em 30 dias

**API:** `POST /api/financeiro` — aceita os campos acima. Se `parcelas > 1`, usa `createMany`.

---

##### Baixa Financeira (Modal)

Modal para registrar pagamento ou recebimento. Abre ao clicar em "Baixar" na tabela.

**Campos:**

| Campo | Descrição |
| :--- | :--- |
| Valor pago/recebido | Pré-preenchido com o saldo em aberto total |
| Data do pagamento/recebimento | Padrão hoje |
| Forma de pagamento | Select |
| Observação | Texto livre |

**Comportamento da baixa:**

- Se `valorBaixa === saldoEmAberto` → status = `PAGA`, `dataPagamento` = data da baixa
- Se `valorBaixa < saldoEmAberto` → status permanece `ABERTA` (ou `VENCIDA` se vencido), `valorPago` incrementa
- Se a conta já estiver vencida e ainda tiver saldo → status = `VENCIDA`
- Toda baixa gera um registro em `HistoricoPagamento` (valor, data, forma de pagamento, observação)
- A baixa é atômica: a atualização da `Conta` e a criação do `HistoricoPagamento` ocorrem na mesma transação

**API:** `PUT /api/financeiro/[id]` com body `{ acao: "baixa", valor, data, formaPagamento, observacao }`.

**Regras gerais de Contas:**

- Contas a receber são geradas automaticamente pelo `PedidoService.gerarContasReceber()` durante faturamento/autorização
- Métodos de pagamento imediatos (PIX, DINHEIRO, CARTAO_DEBITO) geram conta com status `PAGA` e `dataPagamento = hoje`
- Demais métodos geram conta com status `ABERTA` e vencimento baseado em `prazoPagamento`
- O vencimento da conta é comparado com a data atual: se `dataVencimento < hoje` e status `ABERTA`, a conta é considerada vencida (badge visual, não altera status automaticamente no banco — o status é atualizado na baixa)
- Contas canceladas (soft-delete) mantêm o registro mas mudam status para `CANCELADA`

---

#### 6.7.4 Financeiro / Fluxo de Caixa (`/sistema/financeiro/fluxo-caixa`)

Página analítica para visão realizada e prevista do caixa.

**Filtros de período (botões horizontais):**

| Filtro | Comportamento |
| :--- | :--- |
| Hoje | dataInicio = hoje 00:00, dataFim = hoje 23:59 |
| 7 dias | dataInicio = hoje, dataFim = hoje + 7 dias |
| 15 dias | dataInicio = hoje, dataFim = hoje + 15 dias |
| 30 dias | dataInicio = hoje, dataFim = hoje + 30 dias |
| Mês atual | dataInicio = 1º do mês, dataFim = último dia do mês |
| Personalizado | Exibe inputs de data início e data fim + botão Aplicar |

**Seção Realizado (3 cards):**

| Card | Cálculo |
| :--- | :--- |
| Entradas recebidas | Soma de `RECEBER PAGA` com `dataPagamento` entre dataInicio e dataFim |
| Saídas pagas | Soma de `PAGAR PAGA` com `dataPagamento` entre dataInicio e dataFim |
| Resultado realizado | Entradas - Saídas |

**Seção Previsto (3 cards, borda tracejada):**

| Card | Cálculo |
| :--- | :--- |
| Contas a receber em aberto | Soma de `RECEBER ABERTA/VENCIDA` com vencimento até dataFim |
| Contas a pagar em aberto | Soma de `PAGAR ABERTA/VENCIDA` com vencimento até dataFim |
| Saldo projetado | A receber previsto - A pagar previsto |

**Visão por Vencimento (tabela):**

Faixas baseadas em `dataVencimento` a partir de hoje:

| Faixa | Intervalo |
| :--- | :--- |
| Vencido | vencimento < hoje (com ícone AlertTriangle se houver valores) |
| Vence hoje | vencimento = hoje |
| Próximos 7 dias | hoje + 1d até hoje + 7d |
| Próximos 15 dias | hoje + 8d até hoje + 15d |
| Próximos 30 dias | hoje + 16d até hoje + 30d |
| Acima de 30 dias | hoje + 31d em diante |

Cada linha mostra: A Receber (valor e quantidade), A Pagar (valor e quantidade), Saldo (positivo verde, negativo vermelho).

**API:** `GET /api/financeiro/fluxo-caixa?periodo=30` ou `?dataInicio=&dataFim=` — retorna `{ realizado, previsto, vencimento }`.

**Regras:**

- O fluxo de caixa é somente leitura — não permite alterações diretas
- Cards do previsto usam borda tracejada para diferenciar visualmente do realizado
- Saldos negativos são exibidos em vermelho, positivos nas cores do tema
- As faixas de vencimento são calculadas com base em `dataVencimento` e comparadas com a data atual

---

#### 6.7.5 Financeiro / Contabilidade (`/sistema/financeiro/contabilidade`)

Página de exportação contábil para geração de arquivos SPED e relatórios fiscais.

**Fluxo de uso:**

1. Usuário seleciona período (data início e data fim)
2. Clica em "Exportar" para gerar arquivo CSV/TXT
3. O sistema chama `GET /api/financeiro/exportar?inicio=&fim=`
4. O arquivo é baixado automaticamente pelo navegador

**API:** `GET /api/financeiro/exportar?inicio=&fim=` — retorna blob (CSV) para download.

**Campos exportados:**

- Data, tipo (RECEBER/PAGAR), descrição, cliente/fornecedor, valor, forma de pagamento, status, vencimento

**Regras:**

- Acesso exclusivo para FINANCEIRO e ADMINISTRADOR
- Período obrigatório para evitar exportações massivas
- Arquivo gerado no formato CSV para compatibilidade com sistemas contábeis

### 6.8 Pedidos do Estoque (`/sistema/estoque/pedidos`)

Página focada nos pedidos que exigem ação do estoque: verificação de disponibilidade, separação e despacho.

Os perfis com acesso são: **ESTOQUE** e **ADMINISTRADOR**.

**Filtros/abas internas (botões horizontais, mesmo padrão de Pedidos Financeiros):**

| Filtro | Status incluídos |
| :--- | :--- |
| Verificação de estoque | PEDIDO_CRIADO, AGUARDANDO_ESTOQUE, ESTOQUE_PARCIAL, ESTOQUE_INDISPONIVEL, AGUARDANDO_FORNECEDOR |
| Separação | AUTORIZADO_PARA_SEPARACAO, FATURADO, PEDIDO_INTERNO_AUTORIZADO, EM_SEPARACAO |
| Aguardando despacho | SEPARADO |
| Finalizados | DESPACHADO, FINALIZADO |
| Todos | Todos acima combinados |

**Cada pedido exibe um card com:**

- Número do pedido
- Tipo (Normal/NF ou Interno) como badge
- Empresa fiscal (DAC/Pulse) quando disponível
- Status atual como badge colorido
- Cliente, vendedor e data
- Valor total
- Lista de itens com quantidade

**Seções visuais:**

- **Verificação de Estoque** — header azul, ações: Verificar, Confirmar & Enviar, Aguardar fornecedor (com campo de observação)
- **Separação Autorizada** — header indigo, ações: Iniciar separação / Finalizar separação, badge de empresa fiscal
- **Separados para Despacho** — header verde, ação: Marcar despachado (finaliza automaticamente)
- **Finalizados** — tabela resumida com pedido, cliente, tipo, valor, status, data

**Ações disponíveis:**

| Ação | Comportamento |
| :--- | :--- |
| Verificar | Chama `transicionar(id, "verificar_estoque")` — reavalia disponibilidade |
| Confirmar & Enviar | Chama `transicionar(id, "confirmar_estoque")` — confirma manualmente, reserva produtos e envia para pré-aprovação financeira |
| Aguardar fornecedor | Chama `transicionar(id, "aguardar_fornecedor", { observacao })` — marca como aguardando fornecedor |
| Iniciar separação | Chama `transicionar(id, "iniciar_separacao")` — cria registro de separação e muda para EM_SEPARACAO |
| Finalizar separação | Chama `transicionar(id, "finalizar_separacao")` — dá baixa no estoque (SAIDA), cria movimentação fiscal se NF, muda para SEPARADO |
| Marcar despachado | Chama `transicionar(id, "despachar")` — move para DESPACHADO e automaticamente para FINALIZADO |

**API:** `GET /api/estoque/pedidos?filtro=` — retorna `{ pedidos, filtro }` com inclusão de `cliente`, `vendedor`, `empresaFiscal`, `itens`, `separacao`, `historico`.

**Regras:**

- O estoque NÃO pode aprovar financeiro, faturar ou emitir NF
- O estoque NÃO pode alterar forma de pagamento
- O estoque só pode separar depois da autorização final do financeiro
- Finalizar separação dá baixa física no estoque (decrementa `quantidadeReservada`, cria `MovimentacaoEstoque` tipo SAIDA)
- Pedidos com NF precisam de `DocumentoFiscal` e `empresaFiscalId` antes da baixa de estoque
- Despachar finaliza automaticamente: DESPACHADO → FINALIZADO na mesma transação
- O ERP não controla entrega ou logística após o despacho
- SWR com refresh automático a cada 30 segundos

---

#### 6.8.1 Movimentações de Estoque (`/sistema/estoque/movimentacoes`)

Página para visualização completa do histórico de movimentações de estoque.

**KPIs exibidos:**

- Entradas do mês
- Saídas do mês
- Reservas do mês
- Ajustes realizados
- Movimentações do dia

**Filtros rápidos:** Hoje, 7 dias, 30 dias, Entradas, Saídas, Reservas, Ajustes
**Filtros avançados:** Produto, Pedido, Usuário, Lote, Origem (painel colapsável)
**Range de datas:** Data início e data fim manuais

**Tabela de movimentações** (até 200 registros):

- Produto (código + nome)
- Tipo (ENTRADA, SAIDA, AJUSTE, RESERVA, CANCELAMENTO_RESERVA, DEVOLUCAO, PERDA)
- Quantidade (colorido +/-)
- Lote e validade
- Pedido vinculado
- Origem
- Empresa Fiscal
- Usuário
- Data/Hora

**Modal de detalhe** (ícone de olho): exibe dados completos da movimentação incluindo documento fiscal, localização e observação.

**API:** `GET /api/estoque/movimentacoes?filtro=&inicio=&fim=` — retorna `{ movimentacoes, kpis }`.

---

#### 6.8.2 Entrada de Estoque (`/sistema/estoque/entrada`)

Página para registro de entrada de produtos no estoque com controle de lote e validade.

**Formulário de entrada:**

| Campo | Tipo | Obrigatório |
| :--- | :--- | :--- |
| Produto | Select do catálogo | Sim |
| Código do Lote | Texto | Sim |
| Data de Validade | Data | Não |
| Quantidade | Número | Sim |
| Custo Unitário | Número (R$) | Não |
| Observação | Texto | Não |

**Comportamento:**

- Ao submeter, chama `POST /api/estoque/lote/entrada`
- Cria ou atualiza `Lote` com `StatusLote.DISPONIVEL`
- Incrementa `EstoqueAtual.quantidadeDisponivel`
- Gera `MovimentacaoEstoque` tipo `ENTRADA`
- Se o produto tem `controlaLote = true`, o lote é obrigatório
- Se o produto tem `controlaValidade = true`, a validade é obrigatória
- Formulário limpa após submissão com sucesso

**API:** `POST /api/estoque/lote/entrada`

---

#### 6.8.3 Giro de Estoque (`/sistema/estoque/giro`)

Página analítica de giro de estoque.

Exibe indicadores de rotatividade por produto e período, auxiliando na gestão de compras e identificação de produtos parados.

**API:** `GET /api/estoque/giro?periodo=`

---

#### 6.8.4 Alertas de Estoque (`/sistema/estoque/alertas`)

Página de alertas e notificações de estoque.

Exibe:

- Produtos abaixo do estoque mínimo
- Produtos próximos ao vencimento
- Produtos sem movimentação recente
- Lotes em quarentena ou bloqueados

**API:** `GET /api/estoque/alertas`

---

### 6.9 Compras (`/sistema/compras` e `/sistema/compras/importar`)

Módulo de gestão de compras, acessível por ESTOQUE e ADMINISTRADOR.

#### 6.9.1 Pedidos de Compra (`/sistema/compras`)

**Criar pedido de compra:**

- Selecionar fornecedor
- Adicionar itens (produto, quantidade, preço unitário)
- Status inicial: `RASCUNHO`
- Status possíveis: `RASCUNHO`, `ENVIADO`, `PARCIAL`, `RECEBIDO`, `CANCELADO`

**Visualização:** Tabela com número, fornecedor, status, valor total e data.

**API:** `GET /api/compras`, `POST /api/compras`, `GET /api/compras/[id]`

#### 6.9.2 Importar NF-e de Entrada (`/sistema/compras/importar`)

Permite fazer upload de arquivo XML de NF-e de entrada para:

- Criar pedido de compra automaticamente
- Extrair produtos, quantidades e valores do XML
- Associar fornecedor pelo CNPJ

**Parser:** `lib/nfe-parser.ts` — extrai chave, número, emitente, produtos (com lote/validade se disponível no XML).

**API:** `POST /api/compras/importar`

---

### 6.10 Vendedores (`/sistema/vendedores`)

Módulo de cadastro e gestão de vendedores, acessível por VENDAS e ADMINISTRADOR.

**CRUD de vendedores:**

| Campo | Tipo |
| :--- | :--- |
| Nome | Texto (obrigatório) |
| Email | Texto |
| Telefone | Texto |
| Comissão | Número (%) |
| Meta Mensal | Número (R$) |

**Vinculação:** Um `Vendedor` pode ser vinculado a um `Usuario` do perfil `VENDAS` (campo `usuarioId`, unique).

**APIs:** `GET /api/vendedores`, `POST /api/vendedores`, `GET|PUT|DELETE /api/vendedores/[id]`

---

### 6.11 Categorias (`/sistema/categorias`)

Gerenciamento de categorias de produtos com hierarquia de até 5 níveis.

**Estrutura hierárquica:**

- Categoria pai (`parentId` opcional, auto-referência via `CategoriaHierarchy`)
- Limite de 5 níveis de profundidade
- Validação de referência circular ao alterar categoria

**CRUD de categorias:**

- Criar categoria (vinculada a `empresaId = 1` fixo)
- Listar categorias em árvore recursiva
- Atualizar categoria (valida profundidade máxima e ausência de ciclo)
- Excluir categoria (soft delete, apenas se sem produtos vinculados)

**APIs:** `GET /api/produto/categoria`, `POST /api/produto/categoria`, `GET|PUT|DELETE /api/produto/categoria/[id]`

**Serviço:** `lib/services/categorias.service.ts`

---

### 6.12 Relatórios (`/sistema/relatorios`)

Módulo de relatórios gerenciais, acessível por ADMINISTRADOR.

#### 6.12.1 Margem (`/sistema/relatorios/margem`)

Relatório de margem por produto/período.

**API:** `GET /api/relatorios/margem`

#### 6.12.2 Validade (`/sistema/relatorios/validade`)

Relatório de controle de validade dos lotes.

**API:** `GET /api/estoque/relatorio` (reutilizada)

---

### 6.13 Configurações (`/sistema/configuracoes`)

Página de configurações do sistema, acessível apenas por ADMINISTRADOR.

Centraliza parâmetros gerais do ERP (detalhes a serem definidos conforme necessidade).

---

## 7. Análise de Funções e Core Logic

Esta seção define a responsabilidade dos principais serviços, rotas e regras internas do MedFlow ERP.

A IA deve respeitar esta separação ao criar novas funcionalidades, telas, endpoints ou alterações no sistema.

---

### 7.1 `lib/services/produtos.service.ts`

Responsável pelo cadastro, consulta e manutenção dos produtos.

Funções principais:

- `getProdutos(filtros)`: busca produtos com filtros dinâmicos.
- `criarProduto(data)`: cria produto convertendo corretamente os tipos vindos do frontend.
- `atualizarProduto(id, data)`: atualiza informações cadastrais do produto.
- `inativarProduto(id)`: inativa produto sem apagar histórico.

Regras:

- Produto não deve ser excluído fisicamente se já tiver movimentação.
- Produtos hospitalares podem exigir controle de lote e validade.
- Produto com controle de validade deve exigir validade nas entradas de estoque.
- Produto com controle de lote deve exigir lote nas entradas de estoque.
- Produtos inativos não devem aparecer para novas vendas, mas devem permanecer no histórico.

---

### 7.2 `app/api/dashboard/route.ts`

Responsável por fornecer dados consolidados para o dashboard executivo.

Deve calcular:

- Faturamento mensal apenas de pedidos com NF.
- Pedidos em aberto.
- Pedidos internos separados de faturamento fiscal.
- SKUs ativos.
- Produtos vencendo nos próximos 30 dias.
- Valor de estoque.
- Produtos mais vendidos.
- Clientes mais relevantes.
- Pedidos por status.

Regras:

- Pedido interno não deve entrar como faturamento fiscal.
- Pedido interno pode aparecer como saída operacional.
- Produtos vencendo devem ser calculados com base em lote e validade.
- O dashboard deve usar agregações eficientes no banco, como `_sum`, `_count` e agrupamentos.

---

### 7.3 `app/api/vendas/route.ts`

Responsável pela criação e listagem de pedidos de venda.

Funções principais:

- Criar pedido.
- Listar pedidos.
- Buscar pedido por status.
- Buscar pedido por cliente.
- Buscar pedido por tipo:
  - Pedido com NF
  - Pedido interno

Regras:

- A criação do pedido deve ser feita pelo vendedor.
- Ao criar pedido, deve gerar o primeiro registro em `HistoricoPedido`.
- A forma de pagamento pode ser opcional na criação.
- Antes do faturamento/autorização final, a forma de pagamento deve estar definida.
- O pedido deve iniciar com status `Pedido criado`.
- A página de Vendas deve continuar sendo a base principal de criação do pedido.

---

### 7.4 `app/api/vendas/[id]/transicao/route.ts`

Responsável por centralizar as mudanças de status do pedido.

Este endpoint deve receber ações como:

- Confirmar estoque
- Marcar parcialmente disponível
- Marcar indisponível
- Enviar para pré-aprovação financeira
- Pré-aprovar financeiro
- Reprovar financeiro
- Enviar para confirmação do cliente
- Confirmar cliente
- Cancelar pelo cliente
- Enviar para revisão
- Faturar pedido com NF
- Autorizar pedido interno
- Liberar para separação
- Iniciar separação
- Marcar como separado
- Marcar como despachado
- Finalizar pedido

Regra importante:

Ao marcar o pedido como `Despachado`, o sistema deve finalizar automaticamente o pedido.

Fluxo final:

```text
Separado
↓
Despachado
↓
Finalizado
```

---

### 7.5 APIs do Módulo Financeiro

Rotas sob `app/api/financeiro/`:

#### `GET /api/financeiro`

Lista contas. Query params: `tipo` (RECEBER/PAGAR), `status` (ABERTA,PAGA,VENCIDA separados por vírgula), `clienteId`.

Inclui: `cliente`, `fornecedor`, `pedidoVenda`, `historicoPagamentos`.

#### `POST /api/financeiro`

Cria conta(s). Body: `tipo`, `descricao`, `valor`, `dataVencimento`, `observacao`, `formaPagamento`, `categoria`, `clienteId`, `fornecedorId`, `parcelas`, `intervalo`.

Se `parcelas > 1`, usa `createMany` para gerar N contas com valores rateados e vencimentos escalonados.

#### `GET /api/financeiro/[id]`

Detalhe de uma conta com `historicoPagamentos`, `cliente`, `fornecedor`, `pedidoVenda`.

#### `PUT /api/financeiro/[id]`

Atualiza conta. Suporta duas ações:

- **Edição normal:** `status`, `dataVencimento`, `dataPagamento`, `observacao`, `descricao`, `formaPagamento`, `categoria`
- **Baixa financeira:** `acao: "baixa"`, `valor`, `data`, `formaPagamento`, `observacao`. Atualiza `valorPago`, recalcula status (PAGA se saldo zerado, ABERTA/VENCIDA caso contrário), cria `HistoricoPagamento`. Operação atômica via `$transaction`.

#### `DELETE /api/financeiro/[id]`

Soft-delete: muda status para `CANCELADA`. Não remove o registro.

#### `GET /api/financeiro/resumo`

Resumo para o Dashboard Financeiro. Retorna: `aReceber`, `qtdReceber`, `aPagar`, `qtdPagar`, `recebidoMes`, `pagoMes`, `saldoRealizado`, `saldoPrevisto`, `contasVencidas`, `vencendoHoje`, `preAprovacao`, `faturamento`, `internosAutorizar`, `clientesPendencia`.

Todas as agregações usam `_sum` e `_count` do Prisma.

#### `GET /api/financeiro/pedidos?filtro=`

Lista pedidos financeiros filtrados por grupo de status. Query param `filtro`:
`pre_aprovacao`, `pre_aprovados`, `cliente_confirmou`, `faturamento`, `pendente_interno`, `faturados`, `liberados`, `revisao`, `todos`.

Retorna `{ pedidos, historicoClientes, empresas }`. `historicoClientes` contém para cada cliente envolvido: total de compras, contas abertas, valor aberto, inadimplências e valor inadimplente.

#### `GET /api/financeiro/fluxo-caixa?periodo=`

Dados do fluxo de caixa. Query params: `periodo` (hoje, 7, 15, 30, mes) OU `dataInicio` + `dataFim`.

Retorna:

- `realizado`: entradas recebidas, saídas pagas, resultado
- `previsto`: a receber em aberto, a pagar em aberto, saldo projetado
- `vencimento`: array de 6 faixas (Vencido, Vence hoje, Próx. 7d, Próx. 15d, Próx. 30d, Acima de 30d) cada uma com aReceber, qtdReceber, aPagar, qtdPagar, saldo

#### `GET /api/financeiro/clientes-devedores`

Lista clientes com pendências financeiras. Retorna array ordenado por total em aberto decrescente, com: `razaoSocial`, `cnpjCpf`, `limiteCredito`, `totalAberto`, `totalVencido`, `totalAVencer`, `venceEm7Dias`, `ultimoPagamento`, `parcelasAbertas`, `parcelasVencidas`, `pedidosVinculados`.

Filtra apenas clientes que possuem pelo menos uma conta RECEBER com status ABERTA ou VENCIDA.

#### `GET /api/financeiro/exportar?inicio=&fim=`

Exporta dados financeiros em CSV para contabilidade/SPED. Retorna blob com colunas: data, tipo (RECEBER/PAGAR), descrição, cliente/fornecedor, valor, forma de pagamento, status, vencimento.

### 7.6 APIs do Estoque

Rotas sob `app/api/estoque/`:

#### `GET /api/estoque/pedidos?filtro=`

Lista pedidos na alçada do estoque. Query param `filtro`:
`verificacao`, `separacao`, `despacho`, `finalizados`, `todos`.

Inclui: `cliente`, `vendedor`, `empresaFiscal`, `itens` (com `produto`), `separacao`, `historico` (últimas 5 transições com `usuario`).

#### `GET /api/estoque/movimentacoes?filtro=&inicio=&fim=&produto=&pedido=&usuario=&lote=&origem=`

Lista movimentações de estoque com filtros combináveis. Retorna `{ movimentacoes, kpis }` com agregações de entradas, saídas, reservas, ajustes e total do dia.

#### `GET /api/estoque/resumo`

Resumo agregado do estoque para cards de dashboard: SKUs ativos, total de itens, itens críticos, itens esgotados.

#### `GET /api/estoque/produtos-resumo`

Resumo por produto com: código, descrição, categoria, quantidade atual (disponível e reservada), estoque mínimo, nível (barra de progresso), status.

#### `GET /api/estoque/relatorio`

Relatório de estoque com dados de validade por lote.

#### `GET /api/estoque/historico/[produtoId]`

Histórico de movimentações de um produto específico.

#### `POST /api/estoque/saida`

Registra saída manual de estoque (não vinculada a pedido).

#### `POST /api/estoque/reserva`

Cria reserva de estoque para um pedido.

#### `POST /api/estoque/reserva/cancelar`

Cancela reserva de estoque, liberando o saldo.

#### `GET /api/estoque/alertas`

Lista alertas: produtos abaixo do mínimo, lotes próximos ao vencimento, lotes em quarentena/bloqueados.

#### `GET /api/estoque/giro?periodo=`

Dados de giro/rotatividade de estoque por produto e período.

#### `POST /api/estoque/lote/entrada`

Registra entrada de estoque com lote, validade, quantidade e custo. Cria ou atualiza `Lote`, incrementa `EstoqueAtual`, gera `MovimentacaoEstoque` tipo ENTRADA.

#### `GET /api/estoque/lote`

Lista lotes cadastrados.

### 7.7 APIs Fiscais

Rotas sob `app/api/fiscal/`:

#### `GET /api/fiscal/empresas`

Lista empresas fiscais (DAC, Pulse).

#### `GET /api/fiscal/relatorio`

Relatório fiscal agregado.

#### `GET /api/fiscal/movimentacoes`

Lista movimentações fiscais vinculadas a documentos fiscais.

### 7.8 APIs de Compras

Rotas sob `app/api/compras/`:

#### `GET /api/compras`

Lista pedidos de compra.

#### `POST /api/compras`

Cria pedido de compra com itens.

#### `POST /api/compras/importar`

Importa NF-e de entrada via upload de XML. Usa `lib/nfe-parser.ts` para extrair dados.

### 7.9 APIs de Vendedores

Rotas sob `app/api/vendedores/`:

#### `GET /api/vendedores`

Lista vendedores.

#### `POST /api/vendedores`

Cria vendedor.

#### `GET|PUT|DELETE /api/vendedores/[id]`

Operações por ID.

### 7.10 Outras APIs

#### `GET /api/vendas/[id]/nfe`

Gera NF-e de saída para o pedido. Usa `lib/nfe-generator.ts`.

#### `GET /api/relatorios/margem`

Relatório de margem por produto/período.

---

## 8. Mapeamento de Banco de Dados — Entidades Chave

Esta seção define as principais entidades do banco de dados do MedFlow ERP.

A IA deve respeitar essas entidades ao criar novas funcionalidades, telas, APIs, serviços ou alterações no sistema.

O banco deve priorizar:

- Integridade do pedido
- Controle de estoque
- Rastreabilidade por lote e validade
- Histórico de status
- Auditoria de movimentações
- Separação entre pedido com NF e pedido interno
- Separação entre saída operacional e faturamento fiscal

Importante:

O sistema não deve possuir entidade de entrega, logística, transportadora, rastreio ou confirmação de entrega.

O fluxo termina em:

```text
Separado
↓
Despachado
↓
Finalizado
```

| Entidade | Propósito | Regra de Negócio |
| :--- | :--- | :--- |
| **Lote** | Rastreabilidade | Único por número de lote e produto. |
| **EstoqueAtual** | Controle de saldo | Segrega disponível de reservado. Possui custo unitário e status. |
| **MovimentacaoEstoque** | Auditoria de estoque | Log imutável de entradas, saídas, reservas, cancelamentos e ajustes. |
| **EmpresaFiscal** | Emissor de NF | Representa DAC ou Pulse no momento da saída/faturamento. |
| **MovimentacaoFiscal** | Vínculo fiscal | Conecta saída física a documento fiscal quando houver NF. |
| **PedidoVenda** | Comercial | Entidade central do fluxo. Controla tipo do pedido e status atual. |
| **HistoricoPedido** | Auditoria do pedido | Registra cada transição de status, usuário, setor, data e observação. |
| **Conta** | Financeiro | Contas a receber/pagar vinculadas a pedidos. Campos: `valorPago`, `formaPagamento`, `categoria`, `parcelaNumero`, `parcelaTotal`. Status: ABERTA, PAGA, VENCIDA, CANCELADA. |
| **HistoricoPagamento** | Auditoria financeira | Registra cada baixa/pagamento com valor, data, forma de pagamento e observação. Vinculado a `Conta` com cascade delete. |
| **Separacao** | Separação operacional | Controla picking, conferência, embalagem e despacho interno. |
| **DocumentoFiscal** | Documento fiscal | NF-e de entrada ou saída. Armazena chave de acesso, número e status. |
| **Categoria** | Categoria de produtos | Hierarquia de até 5 níveis via `parentId`. Vinculada a `empresaId`. |
| **Localizacao** | Localização física | Controle de endereçamento de estoque (prateleira, galpão, etc). |
| **TabelaPreco** | Preço por cliente | Tabela de preços vinculada opcionalmente a um cliente. |
| **ItemTabelaPreco** | Preço por produto | Preço e desconto máximo por produto dentro de uma tabela. |
| **PedidoCompra** | Compra | Pedido de compra com fornecedor. Status: RASCUNHO, ENVIADO, PARCIAL, RECEBIDO, CANCELADO. |
| **ItemPedidoCompra** | Item de compra | Produto, quantidade e preço unitário do pedido de compra. |
| **Vendedor** | Vendedor | Cadastro de vendedor com meta e comissão. Pode ser vinculado a `Usuario`. |

---

## 9. Fluxo Resumido Oficial

Este é o resumo obrigatório do fluxo principal do pedido dentro do MedFlow ERP.

A IA deve usar este fluxo como referência rápida sempre que for criar telas, cards, status, botões, ações, APIs, regras de negócio ou melhorias no sistema.

```text
1. Vendedor cria o pedido
   ↓
2. Sistema verifica disponibilidade automaticamente
   ↓
3. Se houver disponibilidade total:
   - Sistema confirma estoque
   - Sistema reserva os produtos
   ↓
4. Se houver disponibilidade parcial ou indisponível:
   - Estoquista verifica manualmente
   - Estoquista confirma, recusa, marca parcial ou envia para revisão
   ↓
5. Pedido vai para pré-aprovação financeira
   ↓
6. Financeiro analisa condição comercial
   - Valor
   - Forma de pagamento
   - Prazo
   - Dívida do cliente
   - Desconto
   - Tipo de pedido
   ↓
7. Financeiro pré-aprova
   ↓
8. Pedido volta para o vendedor confirmar com o cliente
   ↓
9. Cliente confirma, recusa ou pede alteração
   ↓
10. Se cliente confirmar:
    Pedido volta para o financeiro
   ↓
11. Financeiro fatura com NF ou autoriza pedido interno
   ↓
12. Pedido é liberado para separação
   ↓
13. Estoque separa, confere e embala
   ↓
14. Estoque marca como despachado
   ↓
15. Sistema finaliza o pedido automaticamente

**Regras financeiras adicionais no fluxo:**

- Ao faturar pedido normal: `PedidoService.gerarContasReceber()` cria automaticamente a conta a receber
- Ao autorizar pedido interno: também gera conta a receber automaticamente
- Métodos imediatos (PIX, DINHEIRO, CARTAO_DEBITO): conta é criada como PAGA
- Demais métodos: conta é criada como ABERTA com vencimento baseado em `prazoPagamento`
- Toda baixa financeira (total ou parcial) gera registro em `HistoricoPagamento`
- Contas vencidas são identificadas por `dataVencimento < hoje AND status = ABERTA`
- O Dashboard Financeiro exibe 12 KPIs que servem como atalhos para as páginas detalhadas
- O Fluxo de Caixa combina dados realizados (contas pagas) e previstos (contas em aberto) no período selecionado


Agora a parte 10:

```md
## 10. Conclusão Técnica e Operacional

O MedFlow ERP é um sistema vertical para distribuição de produtos hospitalares, com foco em controle de pedidos, estoque, financeiro, faturamento, rastreabilidade e auditoria.

O sistema deve ser construído para garantir que cada pedido siga um fluxo organizado, controlado e rastreável, desde a criação pelo vendedor até a finalização após o despacho.

A prioridade do sistema não é apenas criar telas bonitas, mas garantir consistência entre operação, estoque, financeiro e histórico.

---

### 10.1 Núcleo do Sistema

O núcleo do MedFlow ERP é formado por:

- Pedido de venda
- Itens do pedido
- Cliente
- Produto
- Estoque
- Lote
- Validade
- Reserva de estoque
- Movimentação de estoque
- Financeiro
- Faturamento
- Pedido interno
- Empresa emissora
- Histórico de status
- Auditoria de ações

Toda nova funcionalidade deve respeitar esse núcleo.

---

### 10.2 Princípios Técnicos

O sistema deve manter:

- Separação clara entre frontend, APIs e serviços de regra de negócio.
- Serviços internos responsáveis por proteger as regras críticas.
- Transações atômicas em operações que afetam pedido, estoque, financeiro ou fiscal.
- Histórico completo de ações relevantes.
- Controle de permissões por perfil e etapa.
- Rastreabilidade por lote, validade e movimentação.
- Separação entre saída operacional e faturamento fiscal.

---

### 10.3 Princípios Operacionais

O ERP deve garantir que:

- O vendedor crie e acompanhe o pedido.
- O estoque confirme disponibilidade, reserve, separe e despache.
- O financeiro pré-aprove, fature ou autorize pedido interno.
- O pedido só avance quando a etapa anterior estiver correta.
- O estoque só separe depois da autorização final do financeiro.
- O pedido com NF registre a empresa emissora.
- O pedido interno não seja tratado como faturamento fiscal.
- Toda mudança importante gere histórico.
- Nenhum setor altere pedido fora da sua etapa de responsabilidade.

---

### 10.4 Regras Inegociáveis

As seguintes regras não devem ser alteradas sem solicitação explícita:

1. O ERP não controla entrega ou logística.
2. O fluxo termina em `Despachado` e depois `Finalizado`.
3. Não devem existir status de entrega, transporte, rastreio ou confirmação de entrega.
4. Pedido interno não emite NF dentro do sistema.
5. Pedido interno ainda precisa de autorização financeira.
6. Pedido com NF exige empresa emissora: DAC ou Pulse.
7. A empresa emissora é definida na saída/faturamento, não na entrada de estoque.
8. Toda mudança relevante deve gerar histórico.
9. Produtos reservados não ficam disponíveis para outros pedidos.
10. Pedido em revisão deve cancelar reservas anteriores e refazer o fluxo necessário.
11. Pedido faturado, autorizado, separado, despachado ou finalizado não deve permitir edição comum.
12. O pedido só pode ser alterado pelo setor responsável pela etapa atual.
13. Toda baixa financeira deve gerar registro em `HistoricoPagamento` com valor, data, forma de pagamento e observação.
14. Baixas financeiras devem ser atômicas: atualização da `Conta` e criação do `HistoricoPagamento` na mesma transação.
15. O módulo financeiro possui exatamente 5 páginas: Dashboard, Pedidos Financeiros, Contas, Fluxo de Caixa e Contabilidade.
16. O módulo de estoque de pedidos possui filtros internos por grupo de status, seguindo o mesmo padrão visual de Pedidos Financeiros.

---

### 10.5 Regra Final de Contexto para IA

Sempre que a IA for solicitada a criar, alterar ou melhorar qualquer parte do MedFlow ERP, ela deve validar a resposta contra estas perguntas:

1. Essa alteração respeita o fluxo oficial do pedido?
2. Essa alteração mantém a separação entre pedido com NF e pedido interno?
3. Essa alteração preserva a rastreabilidade de estoque?
4. Essa alteração registra histórico das ações importantes?
5. Essa alteração respeita o setor responsável pela etapa?
6. Essa alteração evita qualquer controle de entrega ou logística?
7. Essa alteração mantém o pedido finalizando após despacho?
8. Essa alteração mantém o módulo financeiro em no máximo 5 páginas (Dashboard, Pedidos Financeiros, Contas, Fluxo de Caixa, Contabilidade)?
9. Toda baixa financeira gera registro de auditoria em `HistoricoPagamento`?
10. As APIs financeiras usam transações atômicas para baixas e criação de parcelas?

Se alguma resposta for "não", a solução deve ser ajustada antes de ser implementada.

---

### 10.6 Fechamento

O MedFlow ERP deve funcionar como uma base central de controle operacional da empresa.

Ele deve permitir que vendas, estoque e financeiro trabalhem no mesmo fluxo, cada setor com sua responsabilidade, sem perda de informação, sem movimentações invisíveis e sem alterações sem histórico.

O objetivo final é garantir:

- Clareza operacional
- Controle de estoque
- Segurança financeira
- Rastreabilidade de produtos hospitalares
- Separação correta entre NF e pedido interno
- Auditoria completa
- Finalização simples após despacho

Fluxo final obrigatório:

```text
Pedido criado
↓
Estoque confirmado
↓
Pré-aprovação financeira
↓
Cliente confirmou
↓
Faturado ou autorizado
↓
Separado
↓
Despachado
↓
Finalizado

---

## 11. Roadmap: App Mobile Android (VENDAS e ESTOQUE)

### 11.1 Visão Geral

Está planejado um **aplicativo nativo Android (APK)** para os perfis **VENDAS** e **ESTOQUE**, a ser desenvolvido após a estabilização completa do MVP web.

O app consumirá as **mesmas APIs REST** já existentes no backend, sem necessidade de novo backend. A autenticação usará o mesmo sistema NextAuth com tokens JWT.

**Premissas:**
- O APK só será gerado quando o sistema web estiver 100% funcional e estável
- Durante o desenvolvimento do MVP web, as funcionalidades devem ser pensadas considerando o futuro uso mobile
- APIs devem permanecer stateless e autenticáveis via Bearer token

### 11.2 Funcionalidades por Perfil

#### VENDAS (App Mobile)

| Funcionalidade | API Existente |
| :--- | :--- |
| Criar pedido rápido | `POST /api/vendas` |
| Selecionar cliente | `GET /api/clientes` |
| Buscar produtos (catálogo) | `GET /api/produto` |
| Visualizar status dos pedidos | `GET /api/vendas?status=` |
| Confirmar com cliente | `POST /api/vendas/[id]/transicao` |
| Enviar para revisão | `POST /api/vendas/[id]/transicao` |
| Funil de vendas simplificado | `GET /api/vendas/funil` |
| Notificações push | A implementar (Firebase Cloud Messaging) |

#### ESTOQUE (App Mobile)

| Funcionalidade | API Existente |
| :--- | :--- |
| Verificar disponibilidade | `GET /api/estoque/pedidos?filtro=verificacao` |
| Confirmar estoque / Enviar para financeiro | `POST /api/vendas/[id]/transicao` |
| Marcar aguardando fornecedor | `POST /api/vendas/[id]/transicao` |
| Iniciar / Finalizar separação | `POST /api/vendas/[id]/transicao` |
| Marcar despachado | `POST /api/vendas/[id]/transicao` |
| **Scanner de código de barras** | `GET /api/estoque/lote` |
| Entrada de estoque rápida | `POST /api/estoque/lote/entrada` |
| Consultar posição de estoque | `GET /api/estoque/produtos-resumo` |
| Notificações push | A implementar (Firebase Cloud Messaging) |

### 11.3 Recomendações Técnicas (verificar se são realmente as melhores opções para o projeto)

| Aspecto | Recomendação |
| :--- | :--- |
| **Linguagem** | Kotlin (nativo Android) |
| **Autenticação** | Bearer token JWT via NextAuth |
| **Rede** | Retrofit + OkHttp |
| **Offline** | Room DB para cache; fila de ações com sincronização |
| **Push** | Firebase Cloud Messaging (FCM) |
| **Scanner** | CameraX + ML Kit Barcode Scanning |
| **Arquitetura** | MVVM com Repository pattern |
| **Build** | Gradle, APK assinado para distribuição interna |

### 11.4 Cuidados para o Desenvolvimento Atual

Enquanto o MVP web está em desenvolvimento:

1. **APIs retornam JSON puro** — sem dependência de cookies/sessão
2. **Rotas de transição são autocontidas** — `POST /api/vendas/[id]/transicao` com body `{ acao }`
3. **Endpoints suportam filtros via query params** — evitam over-fetching no mobile
4. **Respostas incluem dados relacionados** com `include` do Prisma — evitam N+1 requests
5. **Tratamento de erro padronizado** — `{ error: string }` com HTTP status apropriado
6. **Não criar lógica de UI no backend** — mobile terá sua própria UI

### 11.5 Fluxo de Notificações Push (Planejado)

| Evento no ERP | Notificação para |
| :--- | :--- |
| Pedido vai para `AGUARDANDO_ESTOQUE` | ESTOQUE |
| Pedido vai para `AGUARDANDO_APROVACAO_FINANCEIRA` | FINANCEIRO |
| Pedido vai para `AGUARDANDO_CONFIRMACAO_CLIENTE` | VENDAS |
| Pedido vai para `AUTORIZADO_PARA_SEPARACAO` | ESTOQUE |

As notificações push serão implementadas após a estabilização do MVP, junto com o desenvolvimento do APK.
