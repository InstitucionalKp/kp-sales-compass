import { supabase } from "@/integrations/supabase/client";

export type ConfigKey = "sheet_column_map" | "ghl_sale_stages" | "kpi_sources" | "goals";

export async function loadConfig<T>(key: ConfigKey): Promise<T | null> {
  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return (data?.value as T) ?? null;
}

export async function saveConfig(key: ConfigKey, value: unknown) {
  const { error } = await supabase
    .from("app_config")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw error;
}
