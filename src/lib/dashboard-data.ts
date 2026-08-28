import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  MOCK_LEADS,
  MOCK_SPEND,
  type Channel,
  type Lead,
  type LeadGrade,
  type SpendRow,
} from "@/lib/mock-data";

type LeadRow = Tables<"leads">;
type MetaRow = Tables<"meta_insights">;

function channelFromOrigin(origem: string | null): Channel {
  const o = (origem ?? "").toLowerCase();
  if (o.includes("google") || o.includes("gads") || o.includes("adwords")) return "Google Ads";
  if (o.includes("tiktok") || o.includes("tik_tok")) return "TikTok Ads";
  if (o === "ig" || o.includes("organic") || o.includes("orgânic") || o.includes("bio")) {
    return "Instagram Orgânico";
  }
  return "Meta Ads";
}

function toGrade(q: string | null): LeadGrade {
  const g = (q ?? "").toUpperCase().trim();
  return g === "A" || g === "B" || g === "C" || g === "D" ? (g as LeadGrade) : "D";
}

function dbToLead(r: LeadRow): Lead {
  const date = (r.lead_date ?? "").slice(0, 10);
  const time = r.lead_time ?? "00:00";
  return {
    id: r.id,
    datetime: r.lead_at ?? `${date}T${time}`,
    date,
    time,
    name: r.nome ?? "—",
    company: r.empresa ?? "",
    origin: r.origem ?? "",
    campaign: r.campanha ?? "—",
    adset: r.conjunto ?? "—",
    creative: r.criativo ?? "(sem criativo)",
    channel: channelFromOrigin(r.origem),
    grade: toGrade(r.qualificacao),
    isMql: r.is_mql,
    mqlFlag: r.mql_flag,
    meetingStatus: r.status_reuniao ?? "",
    vende: r.vende ?? "",
    sold: r.sold,
    saleValue: Number(r.sale_value ?? 0),
  };
}

function dbToSpend(r: MetaRow): SpendRow {
  return {
    date: String(r.insight_date).slice(0, 10),
    creative: r.criativo ?? "(sem criativo)",
    campaign: r.campanha ?? "—",
    channel: "Meta Ads",
    amount: Number(r.spend ?? 0),
    impressions: Number(r.impressions ?? 0),
    clicks: Number(r.clicks ?? 0),
  };
}

export type LeadsResult = {
  leads: Lead[];
  /** 'mock' quando o backend não respondeu; 'supabase' quando veio do banco. */
  source: "mock" | "supabase";
  /** true quando o banco respondeu mas ainda não há leads sincronizados. */
  empty: boolean;
};

export function useDashboardLeads() {
  return useQuery<LeadsResult>({
    queryKey: ["dashboard", "leads"],
    staleTime: 30_000,
    retry: false,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .order("lead_at", { ascending: true });
        if (error) throw error;
        const rows = (data ?? []).filter((r) => r.lead_date);
        if (rows.length === 0) return { leads: [], source: "supabase", empty: true };
        return { leads: rows.map(dbToLead), source: "supabase", empty: false };
      } catch {
        return { leads: MOCK_LEADS, source: "mock", empty: false };
      }
    },
  });
}

export type SpendResult = { spend: SpendRow[]; source: "mock" | "supabase" };

export function useDashboardSpend() {
  return useQuery<SpendResult>({
    queryKey: ["dashboard", "spend"],
    staleTime: 30_000,
    retry: false,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("meta_insights").select("*");
        if (error) throw error;
        if (!data || data.length === 0) return { spend: [], source: "supabase" };
        return { spend: data.map(dbToSpend), source: "supabase" };
      } catch {
        return { spend: MOCK_SPEND, source: "mock" };
      }
    },
  });
}

export type SyncRow = Tables<"sync_status">;

export function useSyncStatus() {
  return useQuery<SyncRow[]>({
    queryKey: ["dashboard", "sync_status"],
    staleTime: 15_000,
    retry: false,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("sync_status").select("*");
        if (error) throw error;
        return data ?? [];
      } catch {
        return [];
      }
    },
  });
}
