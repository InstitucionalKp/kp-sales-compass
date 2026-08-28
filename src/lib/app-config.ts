import { supabase } from "@/integrations/supabase/client";

export type ConfigKey =
  | "sheet_source"
  | "sheet_column_map"
  | "ghl_sale_stages"
  | "ghl_location_id"
  | "meta_accounts"
  | "kpi_sources"
  | "goals";

export async function loadConfig<T>(key: ConfigKey): Promise<T | null> {
  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return (data?.value as T) ?? null;
}

export async function saveConfig(key: ConfigKey, value: Record<string, unknown> | unknown[]) {
  const { error } = await supabase
    .from("app_config")
    .upsert({ key, value: value as never }, { onConflict: "key" });
  if (error) throw error;
}

/** Chaves de credencial guardadas em secret_config (o valor nunca volta ao browser). */
export type SecretKey = "meta_access_token" | "ghl_access_token";

export async function saveSecret(key: SecretKey, value: string) {
  const { error } = await supabase.rpc("set_secret", {
    secret_key: key,
    secret_value: value,
  });
  if (error) throw error;
}

export async function secretIsSet(key: SecretKey): Promise<boolean> {
  const { data, error } = await supabase.rpc("secret_is_set", { secret_key: key });
  if (error) throw error;
  return data === true;
}
