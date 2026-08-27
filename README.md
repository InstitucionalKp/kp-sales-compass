# KP Sales Compass

Crie um dashboard comercial web para a KP Assessoria, uma agência de marketing de performance.

Objetivo: acompanhar o funil de vendas do time comercial (do lead à venda fechada), espelhado

no pipeline do CRM GoHighLevel (GHL), com dados de investimento vindos do Meta Ads e dados

manuais/complementares de uma planilha do Google Sheets.

Stack: React + TypeScript + Tailwind + Recharts. Backend em Lovable Cloud / Supabase

(Edge Functions + Secrets + tabelas de cache + RLS).

════════════════════════════════════════

IDENTIDADE VISUAL

════════════════════════════════════════

- Tema dark. Fundo geral quase preto (#0B0B0F). Cards em #15151C, borda #232330, cantos 12px.

- Cor da marca: roxo/violeta (gradiente #7C3AED → #A855F7) em botões primários, header e filtros ativos.

- Header fixo: quadrado com logo "KP" (gradiente roxo) + título "KP Assessoria — Dashboard Comercial".

- Tipografia Inter. Valores de KPI grandes e em negrito (32–40px), labels em cinza (#9CA3AF) com ícone à esquerda.

- Cada card de KPI: ícone no topo, label, valor grande, rodapé em cinza com a fonte do dado ("GHL", "Planilha", "Meta Ads").

- Layout responsivo em grid, densidade de informação alta.

════════════════════════════════════════

BARRA DE FILTROS (abaixo do header)

════════════════════════════════════════

1. Dropdown "Vendedor" (Todos / lista vinda do GHL).

2. Dropdown "Pipeline" (lista de pipelines do GHL).

3. Botões de período rápido: 7d / 15d / 30d / 60d (ativo com fundo roxo).

4. Botão "Período" com ícone de calendário → date range picker.

5. Botão "Sincronizar" com estado de loading ("Sincronizando..." + spinner + fundo roxo animado).

6. Dropdown "Sync Específico" (re-sincronizar só uma fonte: Meta / GHL / Sheets).

7. Botão "Configurações" (ícone de engrenagem) → abre a PÁGINA DE CONFIGURAÇÕES (ver seção própria).

════════════════════════════════════════

LINHA 1 — KPI CARDS (4 por linha, 2 linhas)

════════════════════════════════════════

Linha A: Leads Recebidos · MQLs (mini-dropdown "Planilha/GHL" no card) · Reuniões Agendadas · Reuniões Realizadas (com % no-show em texto pequeno).

Linha B: Propostas Enviadas · Vendas Fechadas (destaque maior) · Receita Fechada (R$) · Ticket Médio (R$).

- Sem dado → mostrar "•••". Erro na fonte → texto do erro em vermelho no rodapé.

════════════════════════════════════════

LINHA 2 — TAXAS DE CONVERSÃO (faixa de cards menores)

════════════════════════════════════════

Lead→MQL % · MQL→Reunião Agendada % · Reunião Realizada→Proposta % · Proposta→Venda % ·

Conversão Geral Lead→Venda % · Ciclo de Vendas Médio (dias).

Cada um com indicador de tendência vs. período anterior (verde ↑ / vermelho ↓).

════════════════════════════════════════

LINHA 3 — FUNIL + RANKING DE VENDEDORES (2 colunas)

════════════════════════════════════════

Esquerda: gráfico de FUNIL vertical (Leads → MQLs → Reuniões Agendadas → Reuniões Realizadas →

Propostas → Vendas), cada faixa com valor absoluto e % de retenção vs. etapa anterior, degradê de roxo.

Direita: tabela RANKING DE VENDEDORES — # | Vendedor | Vendas | Receita | Conv. % | Ticket Médio.

Ordenável, barra de progresso atrás da Receita, troféu no 1º lugar.

════════════════════════════════════════

LINHA 4 — DUAS TABELAS DE RANKING

════════════════════════════════════════

Esquerda "Leads por Origem": # | Origem | Info (CPL: R$ X) | Qtd.

Direita "Vendas por Origem": # | Origem | Info (CAC: R$ X) | Qtd.

Barra colorida à esquerda proporcional ao valor, scroll vertical, até 10 linhas.

════════════════════════════════════════

LINHA 5 — EVOLUÇÃO TEMPORAL (linha full-width)

════════════════════════════════════════

Título "Evolução Temporal". Eixo X: datas (dd/mm). Duas séries com eixos Y independentes:

"Leads" (azul ciano) e "Receita Fechada (R$)" (verde). Área com gradiente leve, tooltip por dia,

legenda centralizada embaixo, seletor de granularidade (dia/semana/mês).

════════════════════════════════════════

PÁGINA DE CONFIGURAÇÕES (aberta pelo botão "Configurações")

════════════════════════════════════════

Página/rota própria (/configuracoes) com menu lateral e as abas:

▸ ABA "Integrações"

Três cards, um por fonte, cada um com: nome, ícone, status (Conectado ✔ verde / Não conectado ○ /

Erro ✖ vermelho), data da última sincronização, botão "Sincronizar agora" e botão "Editar".

Ao editar, abre formulário com os campos abaixo. Credenciais são salvas como Secrets do Supabase

via Edge Function — NUNCA retornar o valor da credencial para o client depois de salva (mostrar

só "••••••" + botão "substituir"). Cada formulário tem botão "Testar conexão" que faz uma chamada

real e mostra sucesso/erro.

  1. Meta Ads

     - Access Token (longa duração) · ID(s) da Conta de Anúncios (act_XXXX, permite múltiplas)

     - Campo configurável: qual action_type conta como "lead" (ex. "lead" ou "offsite_conversion.fb_pixel_lead")

     - "Testar conexão" → chama /me/adaccounts e lista as contas encontradas.

  2. GoHighLevel

     - Access Token (Private Integration Token) · Location ID

     - Após conectar, botão "Carregar pipelines" preenche a lista de pipelines e stages.

     - "Testar conexão" → GET /pipelines.

  3. Google Sheets

     - Upload/colar do JSON da Service Account · ID da Planilha · Aba · Range (ex. "Leads!A1:H")

     - "Testar conexão" → lê a primeira linha e mostra os cabeçalhos detectados.

▸ ABA "Mapeamento do Funil"

Para o pipeline selecionado do GHL, listar todos os stages e, ao lado de cada um, um dropdown

para mapear ao estágio do funil (Lead / MQL / Reunião Agendada / Reunião Realizada / Proposta /

Venda / Ignorar). Salvar em tabela `pipeline_stage_map`.

▸ ABA "Mapeamento da Planilha"

Mostrar os cabeçalhos detectados no Sheets e, para cada campo interno (Data, Nome, Origem,

Vendedor, Etapa, É_MQL, Valor, Observação), um dropdown para escolher a coluna correspondente.

Salvar em `sheet_column_map`.

▸ ABA "Fontes dos KPIs"

Para cada KPI que tem mais de uma fonte possível (hoje: Leads, MQLs), escolher a fonte padrão

(GHL ou Planilha). É o valor default do mini-dropdown dos cards.

▸ ABA "Metas"

Definir meta mensal de Receita (R$) e meta mensal de Vendas (nº). O dashboard usa isso para

mostrar % de atingimento nos cards de Receita Fechada e Vendas Fechadas.

════════════════════════════════════════

INTEGRAÇÕES — BACKEND (Edge Functions)

════════════════════════════════════════

Regra: o dashboard SEMPRE lê das tabelas de cache do Supabase, nunca chama API externa direto.

O botão "Sincronizar" e o cron (a cada 30 min) disparam o refresh.

Tabela `sync_status` (source, last_run_at, status, rows_synced, error_message) alimenta os

spinners e as mensagens de erro. Se uma fonte falha, as outras continuam.

Tratar paginação e rate limit. Sync incremental por updatedAt/since quando a API permitir.

1) `sync-meta` (Secrets: META_ACCESS_TOKEN, META_AD_ACCOUNT_IDS)

   GET graph.facebook.com/v21.0/act_{id}/insights

   fields: spend, impressions, clicks, actions, action_values, cpc, ctr

   params: level=campaign, time_increment=1, time_range={since,until}

   Extrair "leads" de actions pelo action_type configurado. Buscar nomes de campanha/adset/anúncio.

   → tabela `meta_insights` (date, campaign_id, campaign_name, adset_name, ad_name, spend,

     impressions, clicks, leads, purchases, revenue).

2) `sync-ghl` (Secrets: GHL_ACCESS_TOKEN, GHL_LOCATION_ID; Header Version: 2021-07-28;

   base https://services.leadconnectorhq.com)

   GET /pipelines/?locationId=...   → `ghl_pipeline_stages` (stage_id, nome, ordem, pipeline_id)

   GET /users/?locationId=...       → nomes dos vendedores

   GET /opportunities/search?location_id=...&pipeline_id=...&date range  (paginar até esgotar)

   campos: id, contactId, pipelineId, pipelineStageId, status (open/won/lost/abandoned),

   monetaryValue, assignedTo, source, dateAdded, lastStageChangeAt, (won_at quando status=won)

   → tabela `ghl_opportunities`.

   Derivações no dashboard: Vendas = status "won" (ou stage mapeado p/ "Venda");

   Receita = Σ monetaryValue; Ciclo = média(won_at - dateAdded) em dias;

   contagem de cada estágio do funil via `pipeline_stage_map`; ranking por assignedTo.

3) `sync-sheets` (Secrets: GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SHEET_ID)

   Sheets API v4 spreadsheets/{id}/values/{range} (auth JWT service account).

   1ª linha = cabeçalho; aplicar `sheet_column_map`.

   → tabela `sheet_rows` (campos mapeados + row_number).

   Uso: fonte alternativa para Leads e MQLs + lançamento manual de leads fora do GHL.

4) `sync-all`: chama as três em sequência, atualiza `sync_status`, devolve resultado

   consolidado para o front atualizar o botão e os erros dos cards.

════════════════════════════════════════

COMPORTAMENTO / DADOS

════════════════════════════════════════

- Iniciar com dados mock realistas (vendedores fictícios, ~150 leads, ~12 vendas em 60d) para o layout ficar preenchido antes de conectar as integrações.

- Skeletons nos cards durante o loading.

- Moeda em R$ pt-BR (milhar ".", decimal ",").

- Filtros persistidos na URL (query params) para compartilhar link.

- RLS em todas as tabelas: só usuários autenticados da KP leem. Credenciais só em Secrets, acessadas apenas pelas Edge Functions.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/82d3efc5-9d54-423a-9213-7cdb7ce07978).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
