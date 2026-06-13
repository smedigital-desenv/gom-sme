# GOM/SME — v44 Ajuste da pasta do Drive por escola

Este patch ajusta o Apps Script migrador para salvar os arquivos no mesmo padrão do fluxo direto anterior:

`GOM-SME Anexos / escolas / NOME_DA_ESCOLA / chamado-ID / categoria / arquivo`

Em vez de:

`GOM-SME Anexos / chamados / chamado-ID / categoria / arquivo`

## Arquivos

- `apps-script/GomDriveMigrador.gs`
- `sql/13_migrador_drive_pasta_escolas.sql`

## Aplicação

1. Rodar o SQL `sql/13_migrador_drive_pasta_escolas.sql` no Supabase.
2. Substituir o código do Apps Script pelo novo `GomDriveMigrador.gs`.
3. Salvar o Apps Script.
4. Rodar `testarMigracaoUmaVez`.

Os arquivos já migrados continuam funcionando. O novo padrão vale para as próximas migrações.
