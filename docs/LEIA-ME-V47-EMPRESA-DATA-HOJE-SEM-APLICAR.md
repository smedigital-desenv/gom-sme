# GOM/SME — v47 Execução diária da empresa

Ajuste solicitado para a tela Empresa > Execução diária.

## Regras

1. Todos os cards abrem com a data do atendimento pré-setada com o dia atual.
2. O botão `Aplicar a todos` da data global fica oculto.
3. Card sem equipe e apenas com a data de hoje pré-setada não entra na lista de salvamento.
4. O sistema só marca/salva cards com mudança de equipe e/ou data.
5. Observação não salva sozinha; ela acompanha o card quando houve mudança de equipe/data.

## Arquivo alterado

- `js/empresa.js`
