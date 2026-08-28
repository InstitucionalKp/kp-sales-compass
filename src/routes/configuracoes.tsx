import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileSpreadsheet,
  GitBranch,
  Layers,
  Megaphone,
  RefreshCw,
  Target,
  Table2,
  Workflow,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PIPELINES } from "@/lib/mock-data";
import { DEFAULT_SEARCH } from "@/lib/dashboard-search";
import { loadConfig, saveConfig, type ConfigKey } from "@/lib/app-config";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações | KP Assessoria" },
      {
        name: "description",
        content:
          "Configure integrações Meta Ads, GoHighLevel e Google Sheets, mapeamento da planilha, marcação de vendas e metas de marketing.",
      },
      { property: "og:title", content: "Configurações | KP Assessoria" },
      {
        property: "og:description",
        content: "Integrações, mapeamento da planilha, vendas do GHL, fontes de KPI e metas da KP Assessoria.",
      },
    ],
  }),
  component: SettingsPage,
});

const TABS = [
  { id: "integracoes", label: "Integrações", icon: Layers },
  { id: "planilha", label: "Mapeamento da Planilha", icon: Table2 },
  { id: "vendas", label: "Vendas (GHL)", icon: Workflow },
  { id: "kpis", label: "Fontes dos KPIs", icon: GitBranch },
  { id: "metas", label: "Metas", icon: Target },
] as const;

type TabId = (typeof TABS)[number]["id"];

const GHL_STAGES = [
  "Novo Lead",
  "Contato Realizado",
  "Qualificado",
  "Reunião Marcada",
  "Reunião Feita",
  "Proposta Enviada",
  "Negociação",
  "Ganho",
  "Perdido",
];

const VENDA_OPTIONS = ["Conta como venda", "Ignorar"];

// Cabeçalhos reais detectados na planilha da conta.
const SHEET_HEADERS = [
  "NOME",
  "CONTATO",
  "EMAIL",
  "NOME DA EMPRESA",
  "CARGO",
  "STATUS DE REUNIÃO",
  "MQL",
  "QUALIFICAÇÃO",
  "ORIGEM",
  "CAMPANHA",
  "CRIATIVO",
  "CONJUNTO",
  "DATA",
  "HORA",
];

const INTERNAL_FIELDS = [
  "Data",
  "Hora",
  "Nome do Lead",
  "Empresa",
  "Origem",
  "Campanha",
  "Conjunto",
  "Criativo",
  "Qualificação (A/B/C/D)",
  "MQL (SIM/NÃO)",
  "Status de Reunião",
];

// Palpite inicial do mapeamento (nome interno -> cabeçalho da planilha).
const DEFAULT_COL_MAP: Record<string, string> = {
  Data: "DATA",
  Hora: "HORA",
  "Nome do Lead": "NOME",
  Empresa: "NOME DA EMPRESA",
  Origem: "ORIGEM",
  Campanha: "CAMPANHA",
  Conjunto: "CONJUNTO",
  Criativo: "CRIATIVO",
  "Qualificação (A/B/C/D)": "QUALIFICAÇÃO",
  "MQL (SIM/NÃO)": "MQL",
  "Status de Reunião": "STATUS DE REUNIÃO",
};

function Picker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-52 justify-between">
          {value}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
        {options.map((o) => (
          <DropdownMenuItem key={o} onSelect={() => onChange(o)}>
            {o}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type Status = "conectado" | "desconectado" | "erro";

function StatusPill({ status }: { status: Status }) {
  if (status === "conectado")
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-success">
        <CheckCircle2 className="size-3.5" /> Conectado
      </span>
    );
  if (status === "erro")
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-destructive">
        <XCircle className="size-3.5" /> Erro
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
      <Circle className="size-3.5" /> Não conectado
    </span>
  );
}

function credentialsPending() {
  toast.info("Credenciais ainda não cadastradas", {
    description: "Peça no chat para cadastrar os tokens do Meta Ads, GoHighLevel e Google Sheets como secrets.",
  });
}

async function persist(key: ConfigKey, value: Record<string, unknown>, label: string) {
  try {
    await saveConfig(key, value);
    toast.success(`${label} salvo`, { description: "Configuração gravada no banco." });
  } catch (e) {
    toast.error("Não foi possível salvar", {
      description: e instanceof Error ? e.message : "Erro desconhecido",
    });
  }
}

function IntegrationCard({
  name,
  icon: Icon,
  status,
  lastSync,
  children,
}: {
  name: string;
  icon: typeof Megaphone;
  status: Status;
  lastSync: string;
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="panel flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg">
            <Icon className="size-4 text-primary-foreground" />
          </span>
          <div>
            <p className="text-sm font-semibold">{name}</p>
            <StatusPill status={status} />
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">Última sincronização: {lastSync}</p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={credentialsPending}>
          <RefreshCw className="size-3.5" /> Sincronizar agora
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}>
          {editing ? "Fechar" : "Editar"}
        </Button>
      </div>
      {editing ? <div className="space-y-3 border-t border-border pt-3">{children}</div> : null}
    </div>
  );
}

function SecretField({ label, hint }: { label: string; hint?: string }) {
  const [replacing, setReplacing] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {replacing ? (
        <Input type="password" placeholder="Cole a credencial" />
      ) : (
        <div className="flex items-center gap-2">
          <Input value="••••••••••••" readOnly className="text-muted-foreground" />
          <Button size="sm" variant="outline" onClick={() => setReplacing(true)}>
            Substituir
          </Button>
        </div>
      )}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SettingsPage() {
  const [tab, setTab] = useState<TabId>("integracoes");
  const [vendaMap, setVendaMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(GHL_STAGES.map((s) => [s, s === "Ganho" ? "Conta como venda" : "Ignorar"])),
  );
  const [colMap, setColMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(INTERNAL_FIELDS.map((f) => [f, DEFAULT_COL_MAP[f] ?? "—"])),
  );
  const [kpiSources, setKpiSources] = useState({ Leads: "Planilha", MQL: "Planilha" });
  const [pipeline, setPipeline] = useState(PIPELINES[0]!);
  const [goals, setGoals] = useState({ mql: "70", cpmql: "300", investimento: "20000" });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [cols, sales, sources, savedGoals] = await Promise.all([
          loadConfig<Record<string, string>>("sheet_column_map"),
          loadConfig<{ pipeline: string; stages: Record<string, string> }>("ghl_sale_stages"),
          loadConfig<{ Leads: string; MQL: string }>("kpi_sources"),
          loadConfig<{ mql: string; cpmql: string; investimento: string }>("goals"),
        ]);
        if (!active) return;
        if (cols) setColMap((m) => ({ ...m, ...cols }));
        if (sales?.stages) setVendaMap((m) => ({ ...m, ...sales.stages }));
        if (sales?.pipeline) setPipeline(sales.pipeline);
        if (sources) setKpiSources((s) => ({ ...s, ...sources }));
        if (savedGoals) setGoals((g) => ({ ...g, ...savedGoals }));
      } catch {
        /* mantém os valores padrão */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <AppHeader
        right={
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/" search={DEFAULT_SEARCH}>
              <ArrowLeft className="size-3.5" /> Voltar ao dashboard
            </Link>
          </Button>
        }
      />

      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 p-4 lg:flex-row">
        <nav className="panel h-fit w-full shrink-0 p-2 lg:w-64">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                tab === t.id
                  ? "bg-brand-gradient font-medium text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 space-y-4 pb-10">
          <h1 className="text-lg font-semibold">Configurações</h1>

          {tab === "integracoes" ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <IntegrationCard name="Google Sheets" icon={FileSpreadsheet} status="desconectado" lastSync="—">
                <div className="space-y-1.5">
                  <Label className="text-xs">JSON da Service Account</Label>
                  <Textarea rows={4} placeholder='{"type":"service_account", ...}' />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ID da Planilha</Label>
                  <Input placeholder="1AbC..." />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Aba</Label>
                    <Input placeholder="Leads" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Range</Label>
                    <Input placeholder="Leads!A1:G" />
                  </div>
                </div>
                <Button size="sm" className="bg-brand-gradient text-primary-foreground" onClick={credentialsPending}>
                  Testar conexão
                </Button>
              </IntegrationCard>

              <IntegrationCard name="Meta Ads" icon={Megaphone} status="desconectado" lastSync="—">
                <SecretField label="Access Token (longa duração)" />
                <div className="space-y-1.5">
                  <Label className="text-xs">ID(s) da Conta de Anúncios</Label>
                  <Input placeholder="act_123456, act_789012" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Action type que conta como "lead"</Label>
                  <Input defaultValue="offsite_conversion.fb_pixel_lead" />
                </div>
                <Button size="sm" className="bg-brand-gradient text-primary-foreground" onClick={credentialsPending}>
                  Testar conexão
                </Button>
              </IntegrationCard>

              <IntegrationCard name="GoHighLevel" icon={Workflow} status="desconectado" lastSync="—">
                <SecretField label="Private Integration Token" />
                <div className="space-y-1.5">
                  <Label className="text-xs">Location ID</Label>
                  <Input placeholder="loc_xxxxxxxx" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Usado só para marcar quais criativos geraram venda.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-brand-gradient text-primary-foreground" onClick={credentialsPending}>
                    Testar conexão
                  </Button>
                  <Button size="sm" variant="outline" onClick={credentialsPending}>
                    Carregar pipelines
                  </Button>
                </div>
              </IntegrationCard>
            </div>
          ) : null}

          {tab === "planilha" ? (
            <div className="panel space-y-3 p-4">
              <p className="text-sm text-muted-foreground">
                Cabeçalhos detectados: {SHEET_HEADERS.join(" · ")}
              </p>
              <div className="divide-y divide-border">
                {INTERNAL_FIELDS.map((f) => (
                  <div key={f} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sm">{f}</span>
                    <Picker
                      value={colMap[f] ?? "—"}
                      options={["—", ...SHEET_HEADERS]}
                      onChange={(v) => setColMap((mp) => ({ ...mp, [f]: v }))}
                    />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Total de MQL é derivado da coluna Qualificação: leads A e B contam como MQL
                (a coluna MQL SIM/NÃO fica guardada, mas não entra no cálculo).
              </p>
              <Button
                className="bg-brand-gradient text-primary-foreground"
                onClick={() => persist("sheet_column_map", colMap, "Mapeamento")}
              >
                Salvar mapeamento
              </Button>
            </div>
          ) : null}

          {tab === "vendas" ? (
            <div className="panel space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Escolha quais stages do pipeline do GHL contam como venda fechada.
                </p>
                <Picker value={pipeline} options={PIPELINES} onChange={setPipeline} />
              </div>
              <div className="divide-y divide-border">
                {GHL_STAGES.map((s) => (
                  <div key={s} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sm">{s}</span>
                    <Picker
                      value={vendaMap[s] ?? "Ignorar"}
                      options={VENDA_OPTIONS}
                      onChange={(v) => setVendaMap((mp) => ({ ...mp, [s]: v }))}
                    />
                  </div>
                ))}
              </div>
              <Button
                className="bg-brand-gradient text-primary-foreground"
                onClick={() => persist("ghl_sale_stages", { pipeline, stages: vendaMap }, "Mapeamento de vendas")}
              >
                Salvar
              </Button>
            </div>
          ) : null}

          {tab === "kpis" ? (
            <div className="panel space-y-3 p-4">
              <p className="text-sm text-muted-foreground">
                Fonte padrão para os KPIs que podem vir de mais de uma origem.
              </p>
              {(["Leads", "MQL"] as const).map((k) => (
                <div key={k} className="flex items-center justify-between gap-3 border-t border-border py-2.5">
                  <span className="text-sm">{k}</span>
                  <Picker
                    value={kpiSources[k]}
                    options={["Planilha", "GoHighLevel"]}
                    onChange={(v) => setKpiSources((s) => ({ ...s, [k]: v }))}
                  />
                </div>
              ))}
              <Button
                className="bg-brand-gradient text-primary-foreground"
                onClick={() => persist("kpi_sources", kpiSources, "Fontes dos KPIs")}
              >
                Salvar fontes
              </Button>
            </div>
          ) : null}

          {tab === "metas" ? (
            <div className="panel max-w-md space-y-4 p-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Meta mensal de MQL (nº)</Label>
                <Input
                  inputMode="numeric"
                  value={goals.mql}
                  onChange={(e) => setGoals((g) => ({ ...g, mql: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CPMQL alvo (R$)</Label>
                <Input
                  inputMode="numeric"
                  value={goals.cpmql}
                  onChange={(e) => setGoals((g) => ({ ...g, cpmql: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Investimento previsto no mês (R$)</Label>
                <Input
                  inputMode="numeric"
                  value={goals.investimento}
                  onChange={(e) => setGoals((g) => ({ ...g, investimento: e.target.value }))}
                />
              </div>
              <Button
                className="bg-brand-gradient text-primary-foreground"
                onClick={() => persist("goals", goals, "Metas")}
              >
                Salvar metas
              </Button>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
