# Status "Cancelado" e marcação de eventos

Duas funcionalidades novas:

## 1. Status "Cancelado"

- Novo status terminal **Cancelado**, disponível como encaminhamento a partir de
  *Em análise*, *Aguardando visita*, *Visita agendada* e *Visita Técnica*
  (o Administrador GOM também pode forçá-lo por override em qualquer chamado).
- Ao passar o chamado para **Cancelado**, o **motivo do cancelamento é
  obrigatório** — ele é digitado no campo "Nova observação" e fica registrado na
  timeline do chamado (ação `Chamado cancelado`).
- Chamados cancelados **saem das filas ativas** e são **encaminhados para o
  Memorial** (tela Histórico/Memorial), como os demais status finais.
- Cor do status: `#be123c` (vermelho-rosé), ícone `bi-x-octagon-fill`.

**Não exige alteração de banco** — o status é gravado na coluna `situacao`, que
já é texto livre.

## 2. Marcação de eventos (ex.: Tempestade 24/07)

Permite sinalizar que um chamado decorre de um evento específico. Já vem
cadastrado o evento **"Tempestade 24/07"**. O selo aparece no cabeçalho do modal
do chamado, nos cartões (triagem/fila/dashboard) e nas linhas do Memorial, com
estilo harmônico ao restante do sistema.

**Quem pode marcar:** apenas o perfil **Secretaria** (o **Administrador GOM**
mantém acesso total, como nas demais ações). Os outros perfis (ex.: Empresa)
continuam **vendo o selo**, mas o seletor "Evento associado" não aparece para
eles e qualquer tentativa de gravação é bloqueada.

### Cadastrar novos eventos

Basta acrescentar um objeto à lista `EVENTOS_ESPECIAIS` em
`js/gom-config.js` — a marcação passa a aparecer automaticamente no seletor do
modal:

```js
var EVENTOS_ESPECIAIS = window.EVENTOS_ESPECIAIS = [
  {
    id: 'tempestade-2026-07-24',        // identificador estável (gravado no banco)
    nome: 'Tempestade 24/07',           // rótulo exibido no selo
    descricao: 'Chamado decorrente da tempestade de 24/07/2026.',
    cor: '#0284c7',                     // cor do selo
    icone: 'bi-cloud-lightning-rain-fill'
  }
  // , { id: 'outro-evento', nome: '...', ... }
];
```

### Migração de banco (obrigatória para a marcação de eventos)

A marcação é persistida numa nova coluna `evento` na tabela `solicitacoes`.
Execute no editor SQL do Supabase **uma vez**:

```sql
ALTER TABLE public.solicitacoes
  ADD COLUMN IF NOT EXISTS evento text;

-- (opcional) acelera filtros/relatórios por evento
CREATE INDEX IF NOT EXISTS idx_solicitacoes_evento
  ON public.solicitacoes (evento);
```

Enquanto a coluna não existir, o selo simplesmente não é gravado — o status
"Cancelado" funciona independentemente dessa migração.
