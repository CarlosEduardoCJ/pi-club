# Corrigir "Erro ao apagar" ao excluir publicação

## O que já verifiquei

- O código de apagar (em `PostCard.tsx`) está sintaticamente correto e marca a publicação como apagada com data/hora.
- As permissões do banco permitem que o autor da publicação a atualize; as permissões de tabela para usuários autenticados também estão completas.
- A coluna de "apagado em" existe no banco e nos tipos do app; a compilação está sem erros.
- Não há registro de erro capturado do navegador nesta conversa, então a causa exata ainda não está confirmada.

Ou seja: não posso afirmar ainda que seja regra de acesso, e não vou reescrever regras às cegas.

## Plano

1. **Mostrar o erro real em vez da mensagem genérica**: o aviso passa a exibir o motivo devolvido pelo banco e registra o detalhe no console, para identificar em um clique se é permissão, coluna ou nenhuma linha afetada.
2. **Detectar o caso silencioso de "nenhuma linha alterada"**: pedir de volta o identificador da publicação atualizada. Se voltar vazio, a regra de acesso barrou a operação — nesse caso mostro "Você não tem permissão para apagar esta publicação" em vez de erro genérico.
3. **Fallback seguro**: se a marcação como apagada não afetar nenhuma linha, tentar a exclusão definitiva (que já é permitida ao autor e ao administrador da escola). Assim o botão volta a funcionar em qualquer um dos dois caminhos.
4. **Atualizar a lista corretamente**: garantir que o feed e o perfil recarreguem após apagar (invalidar também as consultas do perfil, não só as do feed), evitando a impressão de que "não apagou".
5. **Validar no app rodando**: entrar no app, apagar uma publicação de teste do próprio usuário e confirmar pelo banco que ela sai da lista; se aparecer erro, ele agora dirá exatamente o motivo e eu corrijo a causa (regra de acesso ou consulta) na mesma etapa.

## Detalhes técnicos

- `src/components/PostCard.tsx`: no handler de exclusão, usar `.update({ deleted_at }).eq('id', post.id).select('id')`; tratar `error` (toast com `error.message`, `console.error`) e `data?.length === 0` (sem permissão → tentar `.delete().eq('id', post.id)`).
- Invalidations: `['posts']`, `['user-posts']`/`['infinite-posts']` conforme as chaves usadas em `src/hooks/useSupabaseData.ts`.
- Nenhuma migração planejada por enquanto: as policies de UPDATE (`Authors can update own posts`, com USING e WITH CHECK em `profile_belongs_to_auth(author_id)`) e os GRANTs estão corretos. Só criarei migração se o erro real apontar para permissão.
