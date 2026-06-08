-- ============================================================================
-- GOM | SME — Seed seguro das Configurações do Sistema
-- ----------------------------------------------------------------------------
-- Use este arquivo quando a tela Configurações aparecer com "0 configurações".
-- Ele cria as chaves padrão sem apagar valores já preenchidos.
-- ============================================================================

insert into public.configuracoes (chave, valor, grupo, descricao, ativo) values
  ('PERMISSOES_MODO','ABERTO','Permissões','ABERTO mantém acesso total para configuração/homologação. RESTRITO aplica perfis por e-mail.',true),
  ('EMAILS_ADMIN_GOM','','Permissões','E-mails administradores com acesso total.',true),
  ('EMAILS_GOM_OPERACIONAL','','Permissões','E-mails da equipe GOM operacional. Acesso às telas de operação, sem Configurações.',true),
  ('EMAILS_EMPRESA_ADICIONAIS','','Permissões','E-mails adicionais da empresa, além de EMAIL_EMPRESA.',true),
  ('EMAILS_CAMPO','','Permissões','E-mails de usuários de campo. Acesso à tela Campo e Acompanhar.',true),
  ('EMAILS_CONFERENTE','','Permissões','E-mails de conferentes. Leitura de dashboard, obras, memorial e relatórios.',true),
  ('PERFIL_SEM_LOGIN','PUBLICO','Permissões','Perfil usado quando não há e-mail identificado. Sugestão: PUBLICO.',true),
  ('EMAIL_EMPRESA','','Empresa','E-mail da empresa que receberá cobranças e avisos operacionais.',true),
  ('NOME_EMPRESA','','Empresa','Nome da empresa responsável pelos atendimentos.',true),
  ('EMAIL_RESPONSAVEL_GOM','','Empresa','E-mail interno da GOM para cópias, avisos e alertas.',true),
  ('HORARIO_LIMITE_CAMPO','11:00','Empresa','Horário limite para a empresa registrar as equipes do dia.',true),
  ('SLA_ANALISE_DIAS','3','Prazos/SLA','Prazo máximo desejado para chamados novos/em análise sem movimentação.',true),
  ('SLA_VISITA_DIAS','3','Prazos/SLA','Prazo máximo desejado para chamados aguardando visita.',true),
  ('SLA_ORCAMENTO_DIAS','5','Prazos/SLA','Prazo máximo desejado para retorno de orçamento solicitado.',true),
  ('SLA_APROVACAO_DIAS','2','Prazos/SLA','Prazo máximo desejado para análise de orçamento realizado.',true),
  ('SLA_OS_DIAS','7','Prazos/SLA','Prazo de referência para execução de OS emitida.',true),
  ('SLA_FINALIZACAO_DIAS','2','Prazos/SLA','Prazo para validação interna após serviço realizado.',true),
  ('ALERTA_COBRANCA_CAMPO_ATIVO','SIM','Alertas','Ativa cobrança automática quando não houver preenchimento diário da empresa.',true),
  ('ALERTA_EMAIL_EMPRESA_ATIVO','SIM','Alertas','Permite envio de e-mails de alerta para a empresa.',true),
  ('ALERTA_OS_SEM_NUMERO_ATIVO','SIM','Alertas','Destaca OS emitida sem numeração preenchida.',true),
  ('ALERTA_ORCAMENTO_SEM_RETORNO_ATIVO','SIM','Alertas','Destaca orçamentos solicitados sem retorno dentro do prazo.',true),
  ('ALERTA_ANALISE_PARADA_ATIVO','SIM','Alertas','Destaca chamados em análise sem interação acima do SLA.',true),
  ('ALERTA_VISITA_ATRASADA_ATIVO','SIM','Alertas','Destaca chamados aguardando visita acima do prazo configurado.',true),
  ('ALERTA_APROVACAO_PARADA_ATIVO','SIM','Alertas','Destaca orçamentos realizados aguardando decisão acima do SLA.',true),
  ('ALERTA_PREVISAO_VENCIDA_ATIVO','SIM','Alertas','Destaca OS com data prevista de conclusão vencida.',true),
  ('ALERTA_OS_SEM_PREVISAO_ATIVO','SIM','Alertas','Destaca OS em campo sem data prevista de conclusão.',true),
  ('ALERTA_SERVICO_SEM_FINALIZACAO_ATIVO','SIM','Alertas','Destaca serviço realizado ainda não finalizado no prazo.',true),
  ('NOME_SISTEMA','Gestão GOM','Sistema','Nome exibido nos e-mails e telas públicas.',true),
  ('SETOR_RESPONSAVEL','GOM | SME','Sistema','Identificação institucional do setor responsável.',true),
  ('TIMEZONE','America/Sao_Paulo','Sistema','Fuso horário utilizado nos registros e alertas.',true),
  ('LIMITE_ANEXOS','5','Anexos','Quantidade máxima de arquivos por envio.',true),
  ('TAMANHO_MAX_MB','8','Anexos','Tamanho máximo de cada anexo em MB.',true),
  ('STATUS_PADRAO_NOVO_CHAMADO','Em análise','Status','Status inicial padrão para novos chamados.',true),
  ('STATUS_DEVOLVIDO_MEMORIAL','Devolvido para a escola','Status','Status usado quando a solicitação é devolvida para a unidade e encerrada no Memorial.',true)
on conflict (chave) do update set
  valor = coalesce(nullif(public.configuracoes.valor, ''), excluded.valor),
  grupo = excluded.grupo,
  descricao = excluded.descricao,
  ativo = coalesce(public.configuracoes.ativo, excluded.ativo),
  updated_at = now();
