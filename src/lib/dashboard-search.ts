import { TODAY, isoAgo } from "./mock-data";

export type Granularity = "dia" | "semana" | "mes";

export type DashboardSearch = {
  /** vazio = todas as campanhas */
  campanhas: string[];
  de: string;
  ate: string;
  preset: number | null;
  gran: Granularity;
};

export const DEFAULT_SEARCH: DashboardSearch = {
  campanhas: [],
  de: isoAgo(TODAY, 29),
  ate: TODAY,
  preset: 30,
  gran: "dia",
};
