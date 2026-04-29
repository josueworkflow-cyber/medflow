# Documento de Requisitos de Produto (PRD) - MedFlow ERP
**Versão:** 1.0  
**Status:** Completo (Análise Meticulosa)

---

## 1. Introdução e Objetivo
O **MedFlow ERP** é uma solução vertical para o setor de distribuição hospitalar. Seu objetivo principal é garantir o rastreio total de produtos (lote/validade) e a eficiência financeira de uma operação de distribuição.

### Diferenciais Técnicos
- **Zero Latency UI**: Uso de `Framer Motion` e `Skeleton Loaders` para uma percepção de velocidade premium.
- **Transações Atômicas**: Garantia de integridade de dados via Prisma Transactions.
- **Rastreabilidade**: Design de banco de dados focado em auditorias sanitárias (ANVISA).

---

## 2. Arquitetura de Segurança e Acesso

### 2.1 Fluxo de Autenticação (`/login`)
O sistema implementa o **Login por Login** da seguinte forma:
- **Interface**: Design minimalista com gradientes premium. Utiliza `useState` para controle de inputs e `next-auth/react` para disparo da autenticação.
- **Lógica de Backend (`auth.ts`)**:
  - `authorize(credentials)`: Busca o usuário pelo e-mail, valida o hash `bcrypt` e injeta o `PerfilUsuario` (ADMINISTRADOR, VENDAS, etc.) no JWT.
- **Middleware**: Intercepta requisições. Se o usuário tentar acessar `/sistema` sem token, o `NextResponse.redirect` o envia para a raiz do login.

---

## 3. Análise Detalhada dos Módulos (Página por Página)

### 3.1 Dashboard Executivo (`/sistema/page.tsx`)
**Análise de Linha de Negócio:**
- **Indicadores Principais**: Faturamento Mensal (pedidos FATURADOS), Pedidos em Aberto, SKUs Ativos e Produtos Vencendo (30 dias).
- **Ranking de Vendas**: Agrega dados da tabela `PedidoVenda` para exibir os clientes mais valiosos e produtos mais vendidos.
- **Valor de Estoque**: Multiplica `quantidadeDisponivel` em cada localidade pelo `precoCustoBase` do cadastro do produto.

### 3.2 Catálogo de Produtos (`/sistema/produtos`)
**Lógica de Funcionamento:**
- **Server-Side Fetching**: A página principal busca os dados no servidor (`getProdutos`) para SEO e velocidade inicial.
- **Client Management (`ProdutosClient.tsx`)**:
  - **Markup Automático**: Calcula a margem em tempo real no formulário: `((Venda - Custo) / Custo) * 100`.
  - **Controle Sanitário**: Flags para `controlaValidade` e `controlaLote` determinam se o sistema exigirá esses dados em futuras entradas de nota.
  - **SWR (Stale-While-Revalidate)**: Utilizado para garantir que a lista de produtos se atualize instantaneamente após um cadastro ou exclusão sem recarregar a página.

### 3.3 Pipeline de Pedidos e Funil Kanban (`/sistema/vendas` e `/sistema/pedidos/funil`)
**Fluxo de Operação e Tipagem Dupla:**
- **Dois Modos de Operação**: Suporte a `PEDIDO_NORMAL` (com faturamento e Nota Fiscal, exigindo Empresa Fiscal) e `PEDIDO_INTERNO` (movimentação de estoque sem NF).
- **Funil Kanban (Pipeline)**: Interface visual interativa organizada em colunas por status (`Criado`, `Reservado`, `Financeiro`, `Separação`, `Faturado`, `Trânsito`, `Entregue`, `Finalizado`).
- **Máquina de Estados**: O backend controla rigidamente as transições permitidas. Um pedido interno, por exemplo, pula automaticamente a coluna de Faturamento.
- **Entrada Dinâmica**: Inserção de múltiplos itens com busca de preço automático e validação forte de cliente/emissor na finalização.

### 3.4 Gestão de Clientes e Fornecedores
- **Clientes (`/sistema/clientes`)**: Gerencia limite de crédito e dados de faturamento.
- **Fornecedores (`/sistema/fornecedores`)**: Essencial para o módulo de Compras e entrada de estoque.

### 3.5 Estoque Central (Operacional e Fiscal) (`/sistema/estoque`)
**Lógica de Arquitetura em Duas Camadas:**
- **Estoque Operacional**: Controle físico puro. Permite entradas rápidas e movimentações internas (ajustes, perdas, quarentena) sem burocracia fiscal.
- **Camada Fiscal**: Controle rígido de faturamento. Uma saída/faturamento exige vinculação com Cliente, Pedido de Venda e Empresa Emissora (Fiscal).
- **Interface Unificada (Tabs)**: O usuário visualiza "Posição Atual", "Movimentações" e "Camada Fiscal" na mesma tela, utilizando `SWR` e `Framer Motion` para transições sem loading.
- **Transações Atômicas (Saída)**: A baixa do saldo físico e a geração do registro fiscal ocorrem na mesma transação de banco de dados, garantindo que o estoque não fique dessincronizado do financeiro/fiscal.

---

## 4. Análise de Funções (Core Logic)

### 4.1 `lib/services/produtos.service.ts`
- `getProdutos(filtros)`: Utiliza filtros dinâmicos do Prisma. Se `filtros.ativo` for `true`, filtra na query SQL.
- `criarProduto(data)`: Converte tipos do frontend para o schema do banco, garantindo que `fatorConversao` e `precos` sejam sempre números.

### 4.2 `app/api/dashboard/route.ts`
- **Lógica de Vencimento**: Calcula `new Date() + 30 dias` para encontrar produtos em risco.
- **Agregações SQL**: Usa `_sum` e `_count` do Prisma para alta performance, evitando carregar milhares de registros na memória do servidor.

### 4.3 `app/api/vendas/route.ts` e Transições (`/transicao`)
- **POST**: Delega a criação para o `PedidoService`, garantindo atomicidade (cabeçalho + itens) e gerando o marco inicial de histórico.
- **Transições Inteligentes**: O endpoint `/api/vendas/[id]/transicao` centraliza todas as ações (aprovar, faturar, despachar), acionando as regras de negócio via serviço.

### 4.4 `lib/services/pedido.service.ts` (Máquina de Estados)
- **Motor de Transições**: Mantém um mapa estrito de transições válidas por `TipoPedido`.
- **Integração de Módulos**: Aciona automaticamente as reservas no `EstoqueService` e o faturamento no `FiscalService`.
- **Auditoria Contínua**: Toda alteração de estado gera um registro detalhado em `HistoricoPedido`.

### 4.5 `lib/services/estoque.service.ts`
- **`registrarEntrada`**: Cria lote (via `upsert`) e registra movimentação operacional de forma livre.
- **`registrarSaidaFaturamento`**: Consome o array de itens, deduz saldos, cria `MovimentacaoEstoque` (SAIDA) e `MovimentacaoFiscal` (EMITIDA) em uma única transação atômica.
- **`getHistorico`**: Aggrega dados operacionais (Usuário, Lote) e fiscais (NF, Emissor) em um único log detalhado.

### 4.6 `lib/services/fiscal.service.ts`
- **Isolamento**: Separa a complexidade de relatórios tributários e listagem de empresas emissoras (CNPJ) do dia a dia da operação logística. Filtragem inteligente para excluir `PEDIDO_INTERNO` dos resumos fiscais.

---

## 5. Mapeamento de Banco de Dados (Entidades Chave)

| Entidade | Propósito | Regra de Negócio |
| :--- | :--- | :--- |
| **Lote** | Rastreabilidade | Único por número de lote e produto. |
| **EstoqueAtual** | Controle de Saldo | Segrega `Disponível` de `Reservado`. Possui `custoUnitario` e `status`. |
| **MovimentacaoEstoque** | Auditoria Logística | Log imutável de quem fez o quê com o físico (ENTRADA, SAIDA, CANCELAMENTO_RESERVA, etc). |
| **EmpresaFiscal** | Emissor de NF | CNPJ emissor que valida a saída da mercadoria (Ex: SIMPLES_NACIONAL, LUCRO_REAL). |
| **MovimentacaoFiscal** | Vínculo Contábil | Conecta a `MovimentacaoEstoque` física a um `DocumentoFiscal` gerado para o `Cliente`. |
| **PedidoVenda** | Comercial | Entidade central do fluxo. Controla o modo (Normal/Interno) e o status atual no pipeline. |
| **HistoricoPedido** | Auditoria Comercial| Log detalhado de cada transição de status do pedido (quem aprovou, faturou, etc). |
| **Conta** | Financeiro | Vincula fluxos de caixa a pedidos reais. |
| **Separacao** | Logística | Controla o picking físico no armazém. |

---

## 6. Conclusão Técnica
O MedFlow ERP é um sistema robusto, com código limpo e modular. A separação entre `lib/services` para lógica de banco e `app/api` para interfaces REST permite que o sistema seja facilmente expandido ou integrado a aplicativos móveis no futuro. A atenção aos detalhes nas animações e estados de carregamento (Skeletons) eleva a experiência do usuário final.
