# Ajuste — Fluxo global dos seletores de status

## Objetivo

Padronizar todos os seletores de alteração de situação para exibirem somente os próximos status permitidos no fluxo, evitando que telas operacionais exibam a lista completa de status do sistema.

## O que foi ajustado

### Função central de fluxo

Foi criada a função global:

`gomProximosStatusFluxo(status, contexto)`

Ela retorna somente os próximos status válidos para o status atual.

### Modal de detalhes do chamado

O modal de detalhes agora usa a função central para montar o campo `Alterar situação`.

Exemplos:

- `OS emitida` → `Serviço Realizado`
- `Atendimento Emergencial` → `Serviço Realizado`
- `Garantia de Obra` → `Serviço Realizado`
- `Garantia de Serviço` → `Serviço Realizado`
- `Solicitado Orçamento` → `Orçamento Realizado`
- `Serviço Realizado` → `Concluído` ou `Garantia de Serviço`
- `Em análise` → opções da Triagem
- `Aguardando visita` → opções da Fila

### Triagem/Fila inline

A edição inline de Triagem/Fila também passa a usar a mesma função central.

## Onde aparece o ajuste de número da OS

O bloco `Regularizar número da OS antiga` aparece no modal, abaixo de `Observações`, quando:

1. o usuário é Secretaria/GOM ou Admin GOM;
2. o chamado está em `OS emitida`;
3. o chamado está sem número de OS.

## Arquivos alterados

- `js/utils.js`
- `js/modal-chamados.js`
- `js/triagem-fila-inline.js`

## SQL necessário

Não precisa rodar SQL.

## Validação

1. Abrir um chamado `OS emitida` no Painel da Empresa.
2. Conferir que o campo `Alterar situação` mostra apenas `OS emitida` e `Serviço Realizado`.
3. Abrir um chamado `Solicitado Orçamento`.
4. Conferir que mostra apenas `Solicitado Orçamento` e `Orçamento Realizado`.
5. Abrir Triagem e Fila.
6. Conferir que os seletores também seguem apenas o fluxo permitido.
