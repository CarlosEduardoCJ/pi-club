# Reforço de acesso aos dados (RLS) + exclusão suave

Antes de mexer, verifiquei as regras que estão hoje no banco. Duas coisas importantes:

## O que já está correto (os alertas do scanner não batem com a realidade atual)

- **Mensagens diretas**: hoje só o remetente e o destinatário conseguem ler cada mensagem, e só é possível enviar para alguém da mesma escola. O alerta "qualquer usuário autenticado lê qualquer conversa" não corresponde às regras atuais — provavelmente é um resultado antigo. Vou confirmar isso com um teste real (item 4) em vez de reescrever essas regras sem motivo.

## O que realmente está aberto e precisa correção

1. **Publicações**: qualquer pessoa logada consegue ler publicações de **todas as escolas**. Correção: leitura permitida só para publicações da própria escola do usuário (mais os desenvolvedores, que veem tudo, como já funciona hoje).
2. **Cargos (admin/moderador)**: um administrador consegue ver os cargos de usuários de outras escolas. Correção: administrador passa a ver apenas cargos de pessoas da própria escola; cada pessoa continua vendo o próprio cargo; desenvolvedor continua vendo tudo.

## Ponto que preciso confirmar com você: perfis

Você pediu "cada usuário vê só o seu próprio perfil". Isso **quebraria o app**: sem ler outros perfis, deixam de funcionar nome/foto no feed, busca de pessoas, seguidores, lista de conversas e o painel admin.

Minha recomendação: perfis ficam visíveis apenas **dentro da mesma escola** (e para desenvolvedores), em vez de somente o próprio. Vou seguir por esse caminho, salvo se você preferir outra coisa.

## Exclusão suave (soft delete)

- Adicionar `deleted_at` em **publicações** e em **mensagens diretas** (vazio por padrão).
- Excluir passa a marcar a data em vez de apagar de verdade; tudo que lista dados passa a esconder os itens marcados.
- Mensagens diretas já têm um campo `deleted` em uso no chat; vou manter o comportamento visual atual e usar `deleted_at` como registro de quando foi apagada.
- Também adicionar `updated_at` com atualização automática nas duas tabelas.

## Testes de isolamento entre escolas

Depois das mudanças, testo com contas reais de escolas diferentes:
- usuário da escola A tentando ler publicações da escola B → resultado vazio, sem erro;
- usuário A tentando ler conversas de que não participa → resultado vazio;
- usuário A lendo perfis da escola B → resultado vazio;
- e confirmo que o app continua funcionando normalmente para quem está na mesma escola (feed, busca, chat, admin, painel do desenvolvedor).

## Detalhes técnicos

- Migração 1 (schema): `posts.deleted_at`, `posts.updated_at`, `direct_messages.deleted_at`, `direct_messages.updated_at` + triggers `update_updated_at_column`; índices parciais em `deleted_at IS NULL`.
- Migração 2 (policies):
  - `posts`: substituir `Posts are viewable by authenticated` (USING `true`) por `school = public.current_user_school() AND deleted_at IS NULL`, mantendo policy separada para `developer`.
  - `user_roles`: substituir o SELECT atual por versão que troca `has_role(admin)` amplo por admin + mesma escola (via função SECURITY DEFINER comparando `profiles.school`).
  - `profiles`: substituir `Active profiles viewable by everyone` por `deleted_at IS NULL AND school = public.current_user_school()`, mantendo "vê o próprio perfil" e "developer vê todos".
  - `direct_messages`: manter as policies de participante; acrescentar `deleted_at IS NULL` não é adequado no SELECT (o chat precisa mostrar "mensagem apagada"), então o filtro fica na leitura do app.
- Frontend: filtrar `deleted_at IS NULL` em `useSupabaseData.ts` (posts, user posts, feed infinito), `ProfileScreen`, `DevPanelScreen`, `AdminScreen`; trocar `delete()` por `update({ deleted_at })` em `PostCard.tsx` e no chat direto.
- Verificação final: build limpo + varredura de segurança.
