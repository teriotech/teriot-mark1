"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const chartData = Array.from({ length: 31 }, (_, index) => {
  const day = index + 1;
  const electrical = day === 7 ? 2040822 : day === 8 ? 265000 : 0;
  const mechanical = 0;

  return {
    day: `${day}`,
    electrical,
    mechanical,
  };
});

const totalElectrical = chartData.reduce((sum, item) => sum + item.electrical, 0);
const totalMechanical = chartData.reduce((sum, item) => sum + item.mechanical, 0);
const totalCost = totalElectrical + totalMechanical;
const dailyAverage = Math.round(totalCost / 12);
const pieData = [
  { name: "Electrical Parts", value: totalElectrical, fill: "#e0df17" },
  { name: "Mechanical Parts", value: totalMechanical, fill: "#03d5eb" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default function Page() {
  return (
    <div className="bg-slate-950 text-slate-100 text-[0.72rem] max-w-[1880px] mx-auto p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end justify-between mb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400 mb-2">Maintenance Cost</div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-100">July 2026 summary</h1>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs uppercase">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/40">☰</span>
          <span className="inline-flex h-10 min-w-[120px] items-center justify-center rounded-xl bg-slate-950/40">Overview</span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-[0_10px_60px_-40px_rgba(0,0,0,0.65)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <div className="text-sm text-slate-400 uppercase tracking-[0.28em]">Daily cost by part type</div>
              <div className="text-3xl font-semibold text-slate-100 mt-2">July 2026</div>
            </div>
            <div className="flex items-center gap-2 text-slate-300 text-xs uppercase">
              <div className="h-2.5 w-2.5 rounded-full bg-[#e0df17]" /> Electrical Parts
              <div className="h-2.5 w-2.5 rounded-full bg-[#03d5eb]" /> Mechanical Parts
            </div>
          </div>

          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 12, right: 14, left: -14, bottom: 0 }}>
                <CartesianGrid stroke="#ffffff14" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    color: "#e5e7eb",
                  }}
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), "Cost"]}
                  labelStyle={{ color: "#9ca3af" }}
                />
                <Bar dataKey="electrical" radius={[8, 8, 0, 0]} stackId="a" fill="#e0df17" />
                <Bar dataKey="mechanical" radius={[8, 8, 0, 0]} stackId="a" fill="#03d5eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 text-center sm:grid-cols-4">
            <div className="rounded-3xl border border-slate-800/60 bg-slate-950/20 px-4 py-5">
              <div className="text-xs text-slate-400 uppercase tracking-[0.22em]">Electrical parts</div>
              <div className="mt-3 text-lg font-semibold text-slate-100">{formatCurrency(totalElectrical)}</div>
            </div>
            <div className="rounded-3xl border border-slate-800/60 bg-slate-950/20 px-4 py-5">
              <div className="text-xs text-slate-400 uppercase tracking-[0.22em]">Mechanical parts</div>
              <div className="mt-3 text-lg font-semibold text-slate-100">{formatCurrency(totalMechanical)}</div>
            </div>
            <div className="rounded-3xl border border-slate-800/60 bg-slate-950/20 px-4 py-5">
              <div className="text-xs text-slate-400 uppercase tracking-[0.22em]">Daily average</div>
              <div className="mt-3 text-lg font-semibold text-slate-100">{formatCurrency(dailyAverage)}</div>
            </div>
            <div className="rounded-3xl border border-slate-800/60 bg-slate-950/20 px-4 py-5">
              <div className="text-xs text-slate-400 uppercase tracking-[0.22em]">Total</div>
              <div className="mt-3 text-lg font-semibold text-slate-100">{formatCurrency(totalCost)}</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-[0_10px_60px_-40px_rgba(0,0,0,0.65)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-slate-400 uppercase tracking-[0.28em]">Cost distribution</div>
              <div className="text-xl md:text-2xl font-semibold text-slate-100 mt-2">Part type share</div>
            </div>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/40 text-slate-300">☰</div>
          </div>

          <div className="flex flex-col items-center justify-center gap-8 py-4">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={84}
                    outerRadius={128}
                    paddingAngle={4}
                    stroke="transparent"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      color: "#e5e7eb",
                    }}
                    formatter={(value) => [formatCurrency(Number(value ?? 0)), "Cost"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-4 w-full">
              {pieData.map((item) => {
                const percent = totalCost === 0 ? 0 : Math.round((item.value / totalCost) * 10000) / 100;
                return (
                  <div key={item.name} className="rounded-3xl border border-slate-800/60 bg-slate-950/20 p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-slate-400 uppercase tracking-[0.22em]">{item.name}</div>
                      <div className="mt-2 text-sm font-semibold text-slate-100">{formatCurrency(item.value)}</div>
                    </div>
                    <div className="text-sm font-semibold text-slate-100">{percent.toFixed(2)}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
