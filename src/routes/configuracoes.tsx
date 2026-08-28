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
import {
  loadConfig,
  saveConfig,
  saveSecret,
  secretIsSet,
  type ConfigKey,
  type SecretKey,
} from "@/lib/app-config";
import { runSync, type SyncSource } from "@/lib/sync";

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

async function persist(key: ConfigKey, value: Record<string, unknown> | unknown[], label: string) {
  try {
    await saveConfig(key, value);
    toast.success(`${label} salvo`, { description: "Configuração gravada no banco." });
  } catch (e) {
    toast.error("Não foi possível salvar", {
      description: e instanceof Error ? e.message : "Erro desconhecido",
    });
  }
}

async function persistSecret(key: SecretKey, value: string, label: string) {
  try {
    await saveSecret(key, value);
    toast.success(`${label} salvo`, { description: "Guardado com segurança — não volta para a tela." });
  } catch (e) {
    toast.error("Não foi possível salvar", {
      description: e instanceof Error ? e.message : "Erro desconhecido",
    });
  }
}

function SecretInput({
  label,
  isSet,
  value,
  onChange,
  onSave,
}: {
  label: string;
  isSet: boolean;
  value: string;
  onChange: (v: string) => void;
  onSave: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-2 text-xs">
        {label}
        {isSet ? <span className="text-success">✓ salvo</span> : null}
      </Label>
      <div className="flex gap-2">
        <Input
          type="password"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isSet ? "•••••••••• (cole um novo para trocar)" : "Cole o token"}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={!value || saving}
          onClick={async () => {
            setSaving(true);
            await onSave();
            setSaving(false);
          }}
        >
          Salvar
        </Button>
      </div>
    </div>
  );
}

function IntegrationCard({
  name,
  icon: Icon,
  status,
  lastSync,
  syncSource,
  onBeforeSync,
  children,
}: {
  name: string;
  icon: typeof Megaphone;
  status: Status;
  lastSync: string;
  syncSource: SyncSource;
  onBeforeSync?: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [running, setRunning] = useState(false);

  const onSyncNow = async () => {
    setRunning(true);
    try {
      if (onBeforeSync) await onBeforeSync(); // grava o que estiver preenchido na tela
      const r = await runSync(syncSource);
      if (r.ok) toast.success(`${name}: ${r.message}`);
      else toast.error(`${name} falhou`, { description: r.message });
    } catch (e) {
      toast.error(`${name} falhou`, {
        description: e instanceof Error ? e.message : "Erro ao salvar as credenciais",
      });
    } finally {
      setRunning(false);
    }
  };

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
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onSyncNow} disabled={running}>
          <RefreshCw className={cn("size-3.5", running && "animate-spin")} /> Sincronizar agora
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}>
          {editing ? "Fechar" : "Editar"}
        </Button>
      </div>
      {editing ? <div className="space-y-3 border-t border-border pt-3">{children}</div> : null}
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
  const [sheetSrc, setSheetSrc] = useState({
    spreadsheetId: "1esmBP_vybIjhh2aw7miaS-oZMp9pDeroAUhYFaiTs9c",
    gid: "220089555",
  });
  const [metaAccounts, setMetaAccounts] = useState("");
  const [metaToken, setMetaToken] = useState("");
  const [metaTokenSet, setMetaTokenSet] = useState(false);
  const [ghlLocation, setGhlLocation] = useState("");
  const [ghlToken, setGhlToken] = useState("");
  const [ghlTokenSet, setGhlTokenSet] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [src, cols, sales, sources, savedGoals, accounts, ghlLoc, metaSet, ghlSet] =
          await Promise.all([
            loadConfig<{ spreadsheetId: string; gid: string }>("sheet_source"),
            loadConfig<Record<string, string>>("sheet_column_map"),
            loadConfig<{ pipeline: string; stages: Record<string, string> }>("ghl_sale_stages"),
            loadConfig<{ Leads: string; MQL: string }>("kpi_sources"),
            loadConfig<{ mql: string; cpmql: string; investimento: string }>("goals"),
            loadConfig<string[]>("meta_accounts"),
            loadConfig<{ id: string }>("ghl_location_id"),
            secretIsSet("meta_access_token").catch(() => false),
            secretIsSet("ghl_access_token").catch(() => false),
          ]);
        if (!active) return;
        if (src) setSheetSrc((s) => ({ ...s, ...src }));
        if (cols) setColMap((m) => ({ ...m, ...cols }));
        if (sales?.stages) setVendaMap((m) => ({ ...m, ...sales.stages }));
        if (sales?.pipeline) setPipeline(sales.pipeline);
        if (sources) setKpiSources((s) => ({ ...s, ...sources }));
        if (savedGoals) setGoals((g) => ({ ...g, ...savedGoals }));
        if (Array.isArray(accounts)) setMetaAccounts(accounts.join("\n"));
        if (ghlLoc?.id) setGhlLocation(ghlLoc.id);
        setMetaTokenSet(metaSet);
        setGhlTokenSet(ghlSet);
      } catch {
        /* mantém os valores padrão */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const parseAccounts = (raw: string) =>
    raw
      .split(/[\n,]+/)
      .map((a) => a.trim())
      .filter(Boolean)
      .map((a) => (a.startsWith("act_") ? a : `act_${a}`));

  // grava (sem toast de erro engolido) o que estiver preenchido nos campos
  const saveMeta = async () => {
    if (metaToken.trim()) {
      await saveSecret("meta_access_token", metaToken.trim());
      setMetaTokenSet(true);
      setMetaToken("");
    }
    await saveConfig("meta_accounts", parseAccounts(metaAccounts));
  };
  const saveGhl = async () => {
    if (ghlToken.trim()) {
      await saveSecret("ghl_access_token", ghlToken.trim());
      setGhlTokenSet(true);
      setGhlToken("");
    }
    if (ghlLocation.trim()) await saveConfig("ghl_location_id", { id: ghlLocation.trim() });
  };

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
              <IntegrationCard
                name="Google Sheets"
                icon={FileSpreadsheet}
                status="desconectado"
                lastSync="—"
                syncSource="sheets"
              >
                <p className="text-[11px] text-muted-foreground">
                  A planilha precisa estar como <strong>"qualquer pessoa com o link pode ver"</strong>.
                  Sem credencial do Google.
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs">ID da Planilha</Label>
                  <Input
                    value={sheetSrc.spreadsheetId}
                    onChange={(e) => setSheetSrc((s) => ({ ...s, spreadsheetId: e.target.value }))}
                    placeholder="1AbC..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">GID da aba (número no fim da URL, após gid=)</Label>
                  <Input
                    value={sheetSrc.gid}
                    onChange={(e) => setSheetSrc((s) => ({ ...s, gid: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <Button
                  size="sm"
                  className="bg-brand-gradient text-primary-foreground"
                  onClick={() => persist("sheet_source", sheetSrc, "Planilha")}
                >
                  Salvar planilha
                </Button>
              </IntegrationCard>

              <IntegrationCard
                name="Meta Ads"
                icon={Megaphone}
                status={metaTokenSet ? "conectado" : "desconectado"}
                lastSync="—"
                syncSource="meta"
                onBeforeSync={saveMeta}
              >
                <SecretInput
                  label="Access Token (longa duração, permissão ads_read)"
                  isSet={metaTokenSet}
                  value={metaToken}
                  onChange={setMetaToken}
                  onSave={() => persistSecret("meta_access_token", metaToken.trim(), "Token do Meta").then(() => {
                    setMetaTokenSet(true);
                    setMetaToken("");
                  })}
                />
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Contas de anúncio (uma por linha — só o número ou com act_)
                  </Label>
                  <Textarea
                    rows={3}
                    value={metaAccounts}
                    onChange={(e) => setMetaAccounts(e.target.value)}
                    placeholder={"893917593787021\nact_123456789"}
                  />
                </div>
                <Button
                  size="sm"
                  className="bg-brand-gradient text-primary-foreground"
                  onClick={() =>
                    saveMeta().then(
                      () => toast.success("Meta Ads salvo"),
                      (e) =>
                        toast.error("Não foi possível salvar", {
                          description: e instanceof Error ? e.message : "Erro",
                        }),
                    )
                  }
                >
                  Salvar
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  "Sincronizar agora" já salva o que estiver preenchido. Puxa os últimos 30 dias.
                </p>
              </IntegrationCard>

              <IntegrationCard
                name="GoHighLevel"
                icon={Workflow}
                status={ghlTokenSet ? "conectado" : "desconectado"}
                lastSync="—"
                syncSource="ghl"
                onBeforeSync={saveGhl}
              >
                <SecretInput
                  label="Private Integration Token"
                  isSet={ghlTokenSet}
                  value={ghlToken}
                  onChange={setGhlToken}
                  onSave={() => persistSecret("ghl_access_token", ghlToken.trim(), "Token do GHL").then(() => {
                    setGhlTokenSet(true);
                    setGhlToken("");
                  })}
                />
                <div className="space-y-1.5">
                  <Label className="text-xs">Location ID</Label>
                  <Input
                    value={ghlLocation}
                    onChange={(e) => setGhlLocation(e.target.value)}
                    placeholder="ex: aBcD1234..."
                  />
                </div>
                <Button
                  size="sm"
                  className="bg-brand-gradient text-primary-foreground"
                  onClick={() =>
                    saveGhl().then(
                      () => toast.success("GoHighLevel salvo"),
                      (e) =>
                        toast.error("Não foi possível salvar", {
                          description: e instanceof Error ? e.message : "Erro",
                        }),
                    )
                  }
                >
                  Salvar
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  "Sincronizar agora" já salva o que estiver preenchido. Usado só para marcar quais
                  criativos geraram venda (stages na aba "Vendas (GHL)").
                </p>
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
