export const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: v >= 10000 ? 0 : 2,
  }).format(v);

export const num = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

export const pct = (v: number, digits = 1) =>
  `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v)}%`;

export const ddmm = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const dateLabel = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("pt-BR");
};

export const safeDiv = (a: number, b: number) => (b === 0 ? 0 : (a / b) * 100);
