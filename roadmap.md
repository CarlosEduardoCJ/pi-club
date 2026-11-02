# Tarefas

- [x] Trocar a exclusão do autor por DELETE sem retorno de linhas e mostrar erros reais; quatro testes passaram, DELETE 204 autenticado removeu post de teste do feed/perfil e contador voltou de 2 para 1.
- [x] Consultar policies UPDATE/DELETE e triggers atuais de posts; auditoria de exclusões inexistente, contador ativo.

- [x] Revisar e registrar o fluxo de definição da escola no cadastro.
- [x] Preparar SQL não aplicado para proteção da escola e SELECT autenticado, com rollback completo; validar em PostgreSQL local isolado.
- [x] Registrar testes anônimos ANTES e consultar plano e documentação de backups (inventário do painel não acessível).
- [ ] Aplicar o rascunho aprovado em produção após ANTES e revisão das leituras sem login; parar em qualquer falha, sem rollback automático.
- [ ] Registrar DEPOIS, confirmar trigger de escola e testar somente com conta de teste sem alterar dados de contas reais; não publicar.

- [x] Ajustar a exclusão e manter a atualização do feed e perfil, sem alterar permissões ou migrações.
- [x] Executar cinco testes da exclusão e confirmar, na conta autenticada, que a publicação de teste desaparece do feed e do perfil, inclusive após recarregar.
- [x] Verificar a origem da senha mestra e consultar as migrações aplicadas.