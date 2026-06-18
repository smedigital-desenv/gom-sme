# Ajuste — Status do modal no Painel da Empresa e localização do número da OS

## Objetivo

Corrigir o modal aberto pelo Painel da Empresa para exibir somente as opções de status válidas para o fluxo daquela tela.

## O que foi ajustado

### Painel da Empresa / Execução diária

Quando o chamado estiver em:

- `OS emitida`
- `Atendimento Emergencial`
- `Garantia de Obra`
- `Garantia de Serviço`

O modal passa a permitir apenas o próximo status do fluxo:

- `Serviço Realizado`

Quando o chamado estiver em `Solicitado Orçamento`, o próximo status permitido é:

- `Orçamento Realizado`

Com isso, o select deixa de exibir todos os status do sistema no painel da empresa.

### Número de OS antiga sem número

O campo de regularização manual do número da OS foi reposicionado para ficar mais visível no modal.

Agora ele aparece logo abaixo do bloco de Observações, antes da Linha do Tempo, quando o chamado atender às três condições:

1. perfil Secretaria/GOM ou Administrador GOM;
2. status `OS emitida`;
3. número da OS vazio.

O bloco exibido é:

`Regularizar número da OS antiga`

As novas OS continuam com numeração automática na aprovação do orçamento.

## Arquivos alterados

- `index.html`
- `js/modal-chamados.js`

## SQL necessário

Não precisa rodar SQL.

## Validação sugerida

1. Entrar na homologação.
2. Abrir Painel da Empresa > Execução diária.
3. Abrir um chamado com `OS emitida`.
4. Confirmar que o select mostra apenas o fluxo válido da empresa, principalmente `Serviço Realizado`.
5. Abrir um chamado antigo com `OS emitida` e sem número.
6. Confirmar que o bloco `Regularizar número da OS antiga` aparece abaixo de Observações.
