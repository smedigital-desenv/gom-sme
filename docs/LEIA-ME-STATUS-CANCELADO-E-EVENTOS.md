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

## 3. Atendimento Emergencial — abrir e baixar a OS (sem concluir)

No atendimento emergencial o serviço é executado antes de qualquer OS, então o
chamado chega à validação final **sem número de OS**. Existe um **botão amarelo
dedicado** em dois lugares, sempre separado visualmente das demais ações (nunca
espremido junto de outros botões):

- **Tela Aprovação** (validação de *Serviço Realizado*): logo abaixo do botão
  verde **"Registrar validação"**, separado por uma linha divisória com "ou" —
  aparece só quando o chamado ainda não tem número de OS.
- **Modal do chamado**: numa caixa destacada em amarelo, junto das demais caixas
  de situação especial (ex.: regularização de OS legada).

Um clique em **"Abrir OS e baixar documento"**:
1. **Gera o número da OS** (mesma numeração das demais);
2. **Baixa o documento da OS automaticamente** (.docx), sem precisar de um
   segundo clique.

Importante: esse botão **não envia o chamado ao Memorial** — ele continua em
*Serviço Realizado*, agora já com número de OS. O envio ao Memorial só acontece
quando a validação normal for registrada em seguida (botão verde "Registrar
validação" → decisão "Validar e enviar para Memorial"). A abertura fica
registrada na timeline (*"OS aberta manualmente (Atendimento Emergencial)"*). O
botão só aparece para quem pode validar o chamado (Secretaria / Admin GOM).

### Valor da OS (Atendimento Emergencial)

Como o emergencial não passa pela etapa de orçamento, não existe valor
registrado até aqui. Por isso, junto do botão "Abrir OS e baixar documento" (na
tela Aprovação e no modal) há um campo **"Valor da OS"** — mesma máscara de
moeda usada em Empresa/Orçamentos (`R$ 0,00`, digitação livre). Ele só aparece
para chamados de Atendimento Emergencial ainda sem OS.

O valor digitado é **incorporado ao gerar a OS** (reaproveita a coluna
`valor_orcamento`, já existente): entra no documento .docx baixado (valor em
número + por extenso) e fica salvo no chamado, seja pelo botão dedicado, seja
pela validação normal ("Registrar validação"). O preenchimento é opcional —
sem valor, o documento usa o texto padrão "conforme orçamento aprovado por
esta divisão".

Separadamente, se a Secretaria optar por validar e enviar ao Memorial sem usar
esse botão (ou seja, decidir direto "Validar e enviar para Memorial" num
chamado emergencial ainda sem OS), o sistema também abre a OS automaticamente
nessa mesma ação — só que sem o download automático (é possível baixar depois,
veja abaixo). Fluxos normais (que emitem a OS antes do serviço) e garantias
seguem inalterados.

### Valor do atendimento e anexo do orçamento (enquanto ainda é emergencial)

Além do campo acima (na validação final), existe um campo equivalente **mais
cedo no fluxo**: enquanto o chamado está **atualmente** com status
*Atendimento Emergencial* (antes de virar "Serviço Realizado"), o modal do
chamado mostra uma caixa amarela com:

- **"Valor do atendimento (OS)"** — mesma máscara de moeda;
- **"Anexo do orçamento"** — upload dedicado (categoria própria "orcamento",
  igual à usada no fluxo normal de Solicitado Orçamento), separado do campo
  genérico "Adicionar anexos ao chamado".

Só aparece para quem pode alterar o chamado nesse estágio (Empresa / Admin
GOM) e some das telas de Histórico e Campo. Ambos os campos são opcionais e
o valor digitado aqui reaparece pré-preenchido no campo "Valor da OS" mais
adiante, quando o chamado chegar em Serviço Realizado (mesma coluna
`valor_orcamento` reaproveitada).

### Baixar a OS depois — no Memorial

Para chamados que já foram concluídos por essa funcionalidade (ou por qualquer
outro fluxo com OS), o documento pode ser baixado a qualquer momento, sem
precisar reabrir o modal:

- **Botão "Baixar OS" na própria linha do Memorial** — aparece para todo
  chamado com número de OS.
- **Barra verde no topo do modal do chamado** ("Ordem de Serviço · Nº ..."),
  visível em qualquer tela (inclusive Histórico/Memorial e Campo) — antes o
  botão de baixar ficava escondido nessas telas.

Nada disso exige alteração de banco.
