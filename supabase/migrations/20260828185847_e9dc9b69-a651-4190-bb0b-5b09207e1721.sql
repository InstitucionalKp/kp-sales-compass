-- valor da venda (do GHL) e "o que ele vende" (da planilha), para calcular ROI por criativo
alter table public.leads add column if not exists sale_value numeric not null default 0;
alter table public.leads add column if not exists vende text;

-- clicks/impressions por linha de investimento, para CPC / CPM por criativo
-- (a tabela meta_insights já tem; nada a fazer aqui além de garantir os defaults)