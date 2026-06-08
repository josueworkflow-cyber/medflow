-- CreateIndex
CREATE INDEX "Categoria_parentId_idx" ON "Categoria"("parentId");

-- CreateIndex
CREATE INDEX "Categoria_empresaId_idx" ON "Categoria"("empresaId");

-- CreateIndex
CREATE INDEX "Conta_clienteId_idx" ON "Conta"("clienteId");

-- CreateIndex
CREATE INDEX "Conta_fornecedorId_idx" ON "Conta"("fornecedorId");

-- CreateIndex
CREATE INDEX "Conta_pedidoVendaId_idx" ON "Conta"("pedidoVendaId");

-- CreateIndex
CREATE INDEX "Conta_status_idx" ON "Conta"("status");

-- CreateIndex
CREATE INDEX "Conta_dataVencimento_idx" ON "Conta"("dataVencimento");

-- CreateIndex
CREATE INDEX "DocumentoFiscal_empresaFiscalId_idx" ON "DocumentoFiscal"("empresaFiscalId");

-- CreateIndex
CREATE INDEX "DocumentoFiscal_fornecedorId_idx" ON "DocumentoFiscal"("fornecedorId");

-- CreateIndex
CREATE INDEX "DocumentoFiscal_clienteId_idx" ON "DocumentoFiscal"("clienteId");

-- CreateIndex
CREATE INDEX "DocumentoFiscal_pedidoVendaId_idx" ON "DocumentoFiscal"("pedidoVendaId");

-- CreateIndex
CREATE INDEX "EstoqueAtual_produtoId_idx" ON "EstoqueAtual"("produtoId");

-- CreateIndex
CREATE INDEX "EstoqueAtual_loteId_idx" ON "EstoqueAtual"("loteId");

-- CreateIndex
CREATE INDEX "EstoqueAtual_localizacaoId_idx" ON "EstoqueAtual"("localizacaoId");

-- CreateIndex
CREATE INDEX "HistoricoPagamento_contaId_idx" ON "HistoricoPagamento"("contaId");

-- CreateIndex
CREATE INDEX "HistoricoPedido_pedidoVendaId_idx" ON "HistoricoPedido"("pedidoVendaId");

-- CreateIndex
CREATE INDEX "HistoricoPedido_usuarioId_idx" ON "HistoricoPedido"("usuarioId");

-- CreateIndex
CREATE INDEX "ItemPedidoCompra_pedidoCompraId_idx" ON "ItemPedidoCompra"("pedidoCompraId");

-- CreateIndex
CREATE INDEX "ItemPedidoCompra_produtoId_idx" ON "ItemPedidoCompra"("produtoId");

-- CreateIndex
CREATE INDEX "ItemPedidoVenda_pedidoVendaId_idx" ON "ItemPedidoVenda"("pedidoVendaId");

-- CreateIndex
CREATE INDEX "ItemPedidoVenda_produtoId_idx" ON "ItemPedidoVenda"("produtoId");

-- CreateIndex
CREATE INDEX "ItemSeparacao_separacaoId_idx" ON "ItemSeparacao"("separacaoId");

-- CreateIndex
CREATE INDEX "ItemSeparacao_produtoId_idx" ON "ItemSeparacao"("produtoId");

-- CreateIndex
CREATE INDEX "ItemTabelaPreco_tabelaPrecoId_idx" ON "ItemTabelaPreco"("tabelaPrecoId");

-- CreateIndex
CREATE INDEX "ItemTabelaPreco_produtoId_idx" ON "ItemTabelaPreco"("produtoId");

-- CreateIndex
CREATE INDEX "Lote_produtoId_idx" ON "Lote"("produtoId");

-- CreateIndex
CREATE INDEX "Lote_localizacaoId_idx" ON "Lote"("localizacaoId");

-- CreateIndex
CREATE INDEX "Lote_fornecedorId_idx" ON "Lote"("fornecedorId");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_produtoId_idx" ON "MovimentacaoEstoque"("produtoId");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_loteId_idx" ON "MovimentacaoEstoque"("loteId");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_localizacaoId_idx" ON "MovimentacaoEstoque"("localizacaoId");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_pedidoVendaId_idx" ON "MovimentacaoEstoque"("pedidoVendaId");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_usuarioId_idx" ON "MovimentacaoEstoque"("usuarioId");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_empresaFiscalId_idx" ON "MovimentacaoEstoque"("empresaFiscalId");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_createdAt_idx" ON "MovimentacaoEstoque"("createdAt");

-- CreateIndex
CREATE INDEX "MovimentacaoFiscal_pedidoVendaId_idx" ON "MovimentacaoFiscal"("pedidoVendaId");

-- CreateIndex
CREATE INDEX "MovimentacaoFiscal_clienteId_idx" ON "MovimentacaoFiscal"("clienteId");

-- CreateIndex
CREATE INDEX "MovimentacaoFiscal_empresaFiscalId_idx" ON "MovimentacaoFiscal"("empresaFiscalId");

-- CreateIndex
CREATE INDEX "MovimentacaoFiscal_documentoFiscalId_idx" ON "MovimentacaoFiscal"("documentoFiscalId");

-- CreateIndex
CREATE INDEX "MovimentacaoFiscal_produtoId_idx" ON "MovimentacaoFiscal"("produtoId");

-- CreateIndex
CREATE INDEX "MovimentacaoFiscal_loteId_idx" ON "MovimentacaoFiscal"("loteId");

-- CreateIndex
CREATE INDEX "PedidoCompra_fornecedorId_idx" ON "PedidoCompra"("fornecedorId");

-- CreateIndex
CREATE INDEX "PedidoVenda_clienteId_idx" ON "PedidoVenda"("clienteId");

-- CreateIndex
CREATE INDEX "PedidoVenda_vendedorId_idx" ON "PedidoVenda"("vendedorId");

-- CreateIndex
CREATE INDEX "PedidoVenda_empresaFiscalId_idx" ON "PedidoVenda"("empresaFiscalId");

-- CreateIndex
CREATE INDEX "PedidoVenda_status_idx" ON "PedidoVenda"("status");

-- CreateIndex
CREATE INDEX "PedidoVenda_createdAt_idx" ON "PedidoVenda"("createdAt");

-- CreateIndex
CREATE INDEX "Produto_categoriaId_idx" ON "Produto"("categoriaId");

-- CreateIndex
CREATE INDEX "TabelaPreco_clienteId_idx" ON "TabelaPreco"("clienteId");
