-- Alinha o modelo ao PRD v1.1: remove entrega/logistica, adiciona despacho e
-- reforca auditoria do pedido.

ALTER TABLE "HistoricoPedido"
ADD COLUMN IF NOT EXISTS "setor" "PerfilUsuario",
ADD COLUMN IF NOT EXISTS "tipoAcao" TEXT;

DROP TABLE IF EXISTS "Romaneio";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatusPedido') THEN
    CREATE TYPE "StatusPedido_new" AS ENUM (
      'PEDIDO_CRIADO',
      'AGUARDANDO_ESTOQUE',
      'ESTOQUE_CONFIRMADO',
      'ESTOQUE_PARCIAL',
      'ESTOQUE_INDISPONIVEL',
      'AGUARDANDO_FORNECEDOR',
      'AGUARDANDO_APROVACAO_FINANCEIRA',
      'APROVADO_FINANCEIRO',
      'REPROVADO_FINANCEIRO',
      'PAGAMENTO_PENDENTE',
      'CONDICAO_COMERCIAL_PENDENTE',
      'AGUARDANDO_CONFIRMACAO_CLIENTE',
      'CLIENTE_CONFIRMOU',
      'PEDIDO_EM_REVISAO',
      'AGUARDANDO_FATURAMENTO',
      'PEDIDO_INTERNO_AUTORIZADO',
      'AUTORIZADO_PARA_SEPARACAO',
      'EM_SEPARACAO',
      'SEPARADO',
      'FATURADO',
      'DESPACHADO',
      'FINALIZADO',
      'CANCELADO',
      'CANCELADO_PELO_CLIENTE'
    );

    ALTER TABLE "PedidoVenda" ALTER COLUMN "status" DROP DEFAULT;

    ALTER TABLE "HistoricoPedido"
    ALTER COLUMN "statusAnterior" TYPE "StatusPedido_new"
    USING (
      CASE
        WHEN "statusAnterior"::text = 'RESERVADO' THEN 'ESTOQUE_CONFIRMADO'
        WHEN "statusAnterior"::text = 'EM_TRANSITO' THEN 'DESPACHADO'
        WHEN "statusAnterior"::text = 'ENTREGUE' THEN 'FINALIZADO'
        ELSE "statusAnterior"::text
      END
    )::"StatusPedido_new";

    ALTER TABLE "HistoricoPedido"
    ALTER COLUMN "statusNovo" TYPE "StatusPedido_new"
    USING (
      CASE
        WHEN "statusNovo"::text = 'RESERVADO' THEN 'ESTOQUE_CONFIRMADO'
        WHEN "statusNovo"::text = 'EM_TRANSITO' THEN 'DESPACHADO'
        WHEN "statusNovo"::text = 'ENTREGUE' THEN 'FINALIZADO'
        ELSE "statusNovo"::text
      END
    )::"StatusPedido_new";

    ALTER TABLE "PedidoVenda"
    ALTER COLUMN "status" TYPE "StatusPedido_new"
    USING (
      CASE
        WHEN "status"::text = 'RESERVADO' THEN 'ESTOQUE_CONFIRMADO'
        WHEN "status"::text = 'EM_TRANSITO' THEN 'DESPACHADO'
        WHEN "status"::text = 'ENTREGUE' THEN 'FINALIZADO'
        ELSE "status"::text
      END
    )::"StatusPedido_new";

    DROP TYPE "StatusPedido";
    ALTER TYPE "StatusPedido_new" RENAME TO "StatusPedido";
    ALTER TABLE "PedidoVenda" ALTER COLUMN "status" SET DEFAULT 'PEDIDO_CRIADO';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatusSeparacao') THEN
    CREATE TYPE "StatusSeparacao_new" AS ENUM (
      'PENDENTE',
      'EM_ANDAMENTO',
      'CONFERIDO',
      'DESPACHADO'
    );

    ALTER TABLE "Separacao" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "Separacao"
    ALTER COLUMN "status" TYPE "StatusSeparacao_new"
    USING (
      CASE
        WHEN "status"::text = 'ENVIADO' THEN 'DESPACHADO'
        ELSE "status"::text
      END
    )::"StatusSeparacao_new";

    DROP TYPE "StatusSeparacao";
    ALTER TYPE "StatusSeparacao_new" RENAME TO "StatusSeparacao";
    ALTER TABLE "Separacao" ALTER COLUMN "status" SET DEFAULT 'PENDENTE';
  END IF;
END $$;
