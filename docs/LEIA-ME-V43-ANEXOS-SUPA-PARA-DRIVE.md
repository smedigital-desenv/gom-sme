# GOM/SME — v43 Anexos rápidos no Supabase + migração automática para Drive

Este pacote substitui a ideia de upload direto para o Drive.

## Novo fluxo

1. O usuário anexa arquivo no sistema.
2. O arquivo é salvo rapidamente no Supabase Storage.
3. A tabela `anexos` recebe `migracao_status = pendente`.
4. O modal do chamado atualiza sem F5.
5. Um Apps Script agendado roda a cada 1 hora.
6. O Apps Script copia os arquivos pendentes para o Google Drive.
7. O Apps Script atualiza a linha do anexo com `url`, `drive_id`, `storage_path = drive:<id>`.
8. O Apps Script apaga o arquivo original do Supabase Storage.

## Arquivos do pacote

- `js/supabase/anexos.js`
- `js/modal-chamados.js`
- `js/config.js`
- `sql/12_anexos_migracao_drive_assincrona.sql`
- `apps-script/GomDriveMigrador.gs`
- `docs/LEIA-ME-V43-ANEXOS-SUPA-PARA-DRIVE.md`

## Ordem de aplicação

1. Rodar no Supabase:
   - `sql/12_anexos_migracao_drive_assincrona.sql`
2. Atualizar os arquivos JS no GitHub.
3. Criar um projeto Apps Script com `apps-script/GomDriveMigrador.gs`.
4. Configurar Propriedades do Script:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `BUCKET_ANEXOS` = `anexos`
   - opcional: `PASTA_RAIZ_ID`
   - opcional: `PASTA_RAIZ_NOME`
5. Executar `testarMigracaoUmaVez` uma vez para autorizar.
6. Executar `instalarGatilhoHorario` para rodar a cada 1 hora.

## Importante

A `SUPABASE_SERVICE_ROLE_KEY` não deve ser colocada no GitHub, no `config.js`, nem enviada em chat. Ela deve ficar somente nas Propriedades do Script.

## Teste

1. Anexar arquivo em um chamado.
2. Confirmar que aparece no modal sem F5.
3. Confirmar linha em `public.anexos` com `migracao_status = pendente`.
4. Rodar `testarMigracaoUmaVez` no Apps Script.
5. Confirmar arquivo no Drive.
6. Confirmar linha em `public.anexos` com:
   - `migracao_status = migrado`
   - `origem_storage = drive`
   - `storage_path = drive:<id>`
   - `url` preenchida
   - `storage_path_original` preenchido
