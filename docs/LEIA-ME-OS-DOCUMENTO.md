# Ajuste — Documento de Ordem de Serviço

## Objetivo

Gerar uma Ordem de Serviço preenchida com os dados do chamado, no padrão institucional enviado como referência, para download no sistema e envio manual por e-mail neste primeiro momento.

## O que mudou

- Adicionado botão **Baixar OS** no modal de detalhes do chamado.
- O botão aparece somente para perfis de Secretaria/GOM ou Admin GOM.
- O botão aparece quando o chamado está em **OS emitida** ou já possui número de OS.
- O documento é gerado com os dados do chamado:
  - número da OS;
  - processo/origem;
  - unidade escolar;
  - endereço da unidade;
  - valor do orçamento;
  - valor por extenso;
  - detalhamento dos serviços;
  - dados administrativos configuráveis: PC, Pregão, Ata, prazo e empresa.

## Arquivos alterados

- `index.html`
- `js/modal-chamados.js`
- `js/os-documento.js`
- `js/supabase/dados.js`
- `js/supabase/mapeadores.js`
- `sql/18_config_os_documento.sql`

## SQL necessário

Rode `sql/18_config_os_documento.sql` no Supabase.

Esse SQL não altera chamados, obras, equipes ou históricos. Ele apenas cria/atualiza as chaves de configuração usadas no documento de OS.

## Observação sobre envio automático

Nesta primeira fase, o sistema baixa o documento Word compatível para envio manual por e-mail.

Para envio automático com anexo, será necessário uma camada de backend, como Apps Script, Supabase Edge Function ou outro serviço de e-mail. O navegador sozinho não deve enviar e-mail institucional com anexo automaticamente.

## Validação sugerida

1. Entrar na homologação.
2. Abrir um chamado com status `OS emitida`.
3. Conferir se aparece o botão **Baixar OS**.
4. Baixar o arquivo.
5. Abrir no Word.
6. Conferir se unidade, endereço, valor, OS, processo e serviços foram preenchidos.
