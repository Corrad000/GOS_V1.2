// app/cruscotto/page.tsx
// Cruscotto di esempio: KPI, grafico ricavi vs costi, stato progetti.
// Dipendenze: npm install recharts   (Tailwind CSS già configurato nel progetto Next.js)
// I dati sono di prova: nella versione reale arrivano da Supabase (vedi nota in fondo).

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Stato = "verde" | "giallo" | "rosso";

type Progetto = {
  nome: string;
  cliente: string;
  orePreviste: number;
  oreConsuntivate: number;
  margine: number; // in percentuale
};

type Kpi = {
  label: string;
  value: string;
  note: string;
  tono: "neutro" | "ok" | "attenzione";
};

// ---------- Dati di prova ----------

const kpi: Kpi[] = [
  { label: "Ricavi YTD", value: "€412k", note: "+18% vs anno precedente", tono: "ok" },
  { label: "Margine medio", value: "34%", note: "ponderato sui ricavi", tono: "neutro" },
  { label: "Backlog", value: "€230k", note: "contratti firmati", tono: "neutro" },
  { label: "Utilizzo consulenti", value: "78%", note: "soglia 85%", tono: "attenzione" },
];

const mensile = [
  { mese: "Gen", ricavi: 30, costi: 20 },
  { mese: "Feb", ricavi: 34, costi: 22 },
  { mese: "Mar", ricavi: 38, costi: 25 },
  { mese: "Apr", ricavi: 36, costi: 24 },
  { mese: "Mag", ricavi: 42, costi: 27 },
  { mese: "Giu", ricavi: 45, costi: 29 },
  { mese: "Lug", ricavi: 28, costi: 19 },
  { mese: "Ago", ricavi: 20, costi: 14 },
  { mese: "Set", ricavi: 44, costi: 28 },
  { mese: "Ott", ricavi: 52, costi: 33 },
];

const progetti: Progetto[] = [
  { nome: "Progetto Alfa", cliente: "Cliente X", orePreviste: 200, oreConsuntivate: 150, margine: 36 },
  { nome: "Progetto Beta", cliente: "Cliente Y", orePreviste: 180, oreConsuntivate: 170, margine: 27 },
  { nome: "Progetto Gamma", cliente: "Cliente Z", orePreviste: 120, oreConsuntivate: 110, margine: 12 },
];

// ---------- Regole del semaforo ----------
// Ipotesi da validare: scostamento ore oltre il 15% o margine sotto il 15% -> rosso;
// scostamento oltre il 5% o margine sotto il 25% -> giallo; altrimenti verde.

function calcolaStato(p: Progetto): Stato {
  // Scostamento ore: positivo = più ore consuntivate del previsto
  const scostamento = (p.oreConsuntivate - p.orePreviste) / p.orePreviste;

  if (scostamento > 0.15 || p.margine < 15) return "rosso";
  if (scostamento > 0.05 || p.margine < 25) return "giallo";
  return "verde";
}

// ---------- Stili ----------

const toneKpi: Record<Kpi["tono"], string> = {
  neutro: "text-gray-500",
  ok: "text-green-700",
  attenzione: "text-amber-700",
};

const coloreStato: Record<Stato, string> = {
  verde: "bg-green-100 text-green-800",
  giallo: "bg-amber-100 text-amber-800",
  rosso: "bg-red-100 text-red-800",
};

const coloreBarra: Record<Stato, string> = {
  verde: "bg-green-600",
  giallo: "bg-amber-500",
  rosso: "bg-red-600",
};

// ---------- Componente ----------

export default function CruscottoProgetti() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-medium text-gray-900">Cruscotto progetti</h1>

      {/* KPI */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpi.map((k) => (
          <div key={k.label} className="rounded-lg bg-gray-100 p-4">
            <p className="text-sm text-gray-600">{k.label}</p>
            <p className="mt-1 text-2xl font-medium text-gray-900">{k.value}</p>
            <p className={`mt-1 text-xs ${toneKpi[k.tono]}`}>{k.note}</p>
          </div>
        ))}
      </section>

      {/* Grafico ricavi vs costi */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-base font-medium text-gray-900">Ricavi mensili vs costi diretti (€k)</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mensile} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="mese" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={36} />
              <Tooltip />
              <Legend />
              <Bar dataKey="ricavi" name="Ricavi" fill="#378ADD" radius={[4, 4, 0, 0]} />
              <Bar dataKey="costi" name="Costi diretti" fill="#B4B2A9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Stato progetti */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-base font-medium text-gray-900">Stato dei progetti attivi</h2>
        <ul className="space-y-4">
          {progetti.map((p) => {
            const stato = calcolaStato(p);
            const avanzamento = Math.min(100, Math.round((p.oreConsuntivate / p.orePreviste) * 100));
            return (
              <li key={p.nome} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 md:grid-cols-[2fr_1fr_auto]">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                  <p className="text-xs text-gray-500">{p.cliente} · margine {p.margine}%</p>
                </div>
                <span className={`justify-self-end rounded-md px-2 py-1 text-xs font-medium ${coloreStato[stato]}`}>
                  {stato}
                </span>
                <div className="col-span-2 md:col-span-1">
                  <div className="h-2 w-full rounded bg-gray-200">
                    <div className={`h-2 rounded ${coloreBarra[stato]}`} style={{ width: `${avanzamento}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {p.oreConsuntivate} / {p.orePreviste} ore ({avanzamento}%)
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-gray-500">
          Il colore segue regole esplicite (vedi funzione calcolaStato). Le soglie sono ipotesi da validare.
        </p>
      </section>
    </main>
  );
}

// NOTA PER LA VERSIONE REALE
// I valori di kpi, mensile e progetti vanno sostituiti con query a Supabase,
// eseguite sul server (Server Component) e filtrate dalle regole RLS del ruolo.
// I totali (ricavi, margini, backlog) conviene calcolarli in viste SQL.
