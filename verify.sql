SELECT 'pedidos' as tabela, COUNT(*) as total FROM "PedidoVenda"
UNION ALL SELECT 'produtos', COUNT(*) FROM "Produto"
UNION ALL SELECT 'clientes', COUNT(*) FROM "Cliente"
UNION ALL SELECT 'usuarios', COUNT(*) FROM "Usuario"
UNION ALL SELECT 'fornecedores', COUNT(*) FROM "Fornecedor";
