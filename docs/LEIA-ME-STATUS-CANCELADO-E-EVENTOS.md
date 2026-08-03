# Status "Cancelado", marcação de eventos e fluxos correlatos

Funcionalidades:

## 1. Status "Cancelado"

- Novo status terminal **Cancelado**, disponível como encaminhamento a partir de
  *Em análise*, *Aguardando visita*, *Visita agendada* e *Visita Técnica*
  (o Administrador GOM também pode forçá-lo por override em qualquer chamado).
- **Quem pode cancelar:** apenas o perfil **Secretaria** (o **Administrador GOM**
  mantém acesso total). Para os demais perfis a opção "Cancelado" não aparece no
  seletor de status e a gravação é bloqueada.
- Ao passar o chamado para **Cancelado**, o **motivo do cancelamento é
  obrigatório** — ele é digitado no campo "Nova observação" (ou na observação da
  linha, na triagem/fila) e fica registrado na timeline (ação `Chamado cancelado`).
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

### Filtro de busca por evento

- No **Memorial** há um novo filtro **"Todos os eventos"**, ao lado dos filtros
  de mês/status/tipo — permite listar só os chamados de um evento (ex.: só a
  Tempestade 24/07).
- O **nome do evento** também entra na **busca por texto** (campo de pesquisa)
  em todas as telas de chamados — basta digitar, por exemplo, "tempestade".

## 3. Atendimento Emergencial — abrir OS na conclusão

No atendimento emergencial o serviço é executado antes de qualquer OS, então o
chamado chega à validação final **sem número de OS**. Agora, na **aprovação
final** (Serviço Realizado → *Validar e enviar para Memorial*):

- se o chamado **passou por "Atendimento Emergencial"** e está **sem OS**, o
  sistema **abre a OS** (gera o número automaticamente, na mesma numeração das
  demais) **e encaminha para o Memorial na mesma ação**;
- a abertura fica registrada na timeline (ação *"Emergencial concluído — OS
  aberta e enviada ao Memorial"*).

Fluxos normais (que emitem a OS antes do serviço) e garantias seguem inalterados
— a abertura automática na conclusão vale **apenas** para o emergencial sem OS.
Não exige alteração de banco.
