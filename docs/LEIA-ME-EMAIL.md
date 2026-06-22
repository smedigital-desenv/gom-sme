# GOM · SME — E-mail do sistema (Fase A: motor de envio)

Todo e-mail do sistema sai pela **conta institucional** que publica o Apps Script
(a mesma do `GomDriveMigrador`). O frontend não envia e-mail direto nem guarda
segredo: o disparo automático virá por gatilho de tempo lendo uma fila no
Supabase (Fases B e C), seguindo o mesmo padrão do migrador de anexos.

## Por que pela conta institucional (e não pela conta logada de cada usuário)

O login do sistema (Supabase + Google) serve só para identidade — ele não recebe
permissão para enviar e-mail em nome da pessoa. Habilitar isso exigiria
consentimento sensível por usuário, verificação do app pelo Google e gestão de
tokens, e ainda quebraria para quem não usa Gmail. Para e-mails institucionais, o
Apps Script rodando como a conta dona é mais simples, estável e rastreável.

## Fase A — validar o motor de envio

1. Abra <https://script.google.com> com a **conta institucional** (a dona do
   `GomDriveMigrador`) e cole o arquivo `apps-script/GomEmail.gs` num projeto.
2. **Configurações do projeto → Propriedades do script**, adicione:
   - `GOM_EMAIL_TESTE_PARA` = um e-mail seu (destino do teste)
   - `GOM_EMAIL_REMETENTE_NOME` = `GOM · SME` (opcional — nome de exibição)
   - `GOM_EMAIL_REPLY_TO` = e-mail para resposta (opcional)
3. Selecione a função **`gomEmailTesteDeFumaca`** e clique em **Executar**.
4. **Autorize** os escopos quando solicitado (envio de e-mail).
5. Confira a caixa de entrada do `GOM_EMAIL_TESTE_PARA`. O remetente deve ser a
   conta institucional. Se chegou, a Fase A está concluída.

Para conferir quanto ainda pode enviar hoje, rode `gomEmailQuotaRestante`
(contas Workspace costumam ter ~1.500/dia).

## O que já existe no sistema (aproveitado nas próximas fases)

- **SLAs em dias** por etapa (Configurações → Prazos/SLA): análise, visita,
  orçamento, aprovação, OS, finalização.
- **Listas de e-mail por perfil** (Configurações): `EMAILS_SECRETARIA`,
  `EMAIL_EMPRESA`, `EMAILS_ESCOLA`, etc.
- **Alertas** já calculam atrasos por SLA — hoje só visuais, sem envio.

## Próximas fases (resumo)

- **Fase B — Template:** tela em Configurações para editar assunto, corpo (com
  variáveis como `{{escola}}`, `{{numero}}`, `{{status}}`, `{{dias_atraso}}`,
  `{{link}}`) e anexos.
- **Fase C — Disparo:** gatilho de tempo (como o migrador) lê os chamados e uma
  fila no Supabase e envia: avisos de SLA e o **e-mail de visita agendada para a
  escola** (com data, equipe e itens da visita). Inclui controle de "já avisado"
  para não repetir o mesmo aviso.
