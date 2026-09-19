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
  { name: "Electrical Parts", value: totalElectrical, fill: "#ca8a04" },
  { name: "Mechanical Parts", value: totalMechanical, fill: "#0891b2" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default function Page() {
  return (
    <div className="bg-slate-50 text-slate-900 text-[0.72rem] max-w-[1880px] mx-auto p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end justify-between mb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-500 mb-2">Maintenance Cost</div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">July 2026 summary</h1>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-xs uppercase">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200">☰</span>
          <span className="inline-flex h-10 min-w-[120px] items-center justify-center rounded-xl bg-white border border-slate-200">Overview</span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <div className="text-sm text-slate-500 uppercase tracking-[0.28em]">Daily cost by part type</div>
              <div className="text-3xl font-semibold text-slate-900 mt-2">July 2026</div>
            </div>
            <div className="flex items-center gap-2 text-slate-600 text-xs uppercase">
              <div className="h-2.5 w-2.5 rounded-full bg-[#ca8a04]" /> Electrical Parts
              <div className="h-2.5 w-2.5 rounded-full bg-[#0891b2]" /> Mechanical Parts
            </div>
          </div>

          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 12, right: 14, left: -14, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    color: "#0f172a",
                  }}
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), "Cost"]}
                  labelStyle={{ color: "#64748b" }}
                  cursor={{ fill: "#f1f5f9" }}
                />
                <Bar dataKey="electrical" radius={[8, 8, 0, 0]} stackId="a" fill="#ca8a04" />
                <Bar dataKey="mechanical" radius={[8, 8, 0, 0]} stackId="a" fill="#0891b2" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 text-center sm:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5">
              <div className="text-xs text-slate-500 uppercase tracking-[0.22em]">Electrical parts</div>
              <div className="mt-3 text-lg font-semibold text-slate-900">{formatCurrency(totalElectrical)}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5">
              <div className="text-xs text-slate-500 uppercase tracking-[0.22em]">Mechanical parts</div>
              <div className="mt-3 text-lg font-semibold text-slate-900">{formatCurrency(totalMechanical)}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5">
              <div className="text-xs text-slate-500 uppercase tracking-[0.22em]">Daily average</div>
              <div className="mt-3 text-lg font-semibold text-slate-900">{formatCurrency(dailyAverage)}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5">
              <div className="text-xs text-slate-500 uppercase tracking-[0.22em]">Total</div>
              <div className="mt-3 text-lg font-semibold text-slate-900">{formatCurrency(totalCost)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-slate-500 uppercase tracking-[0.28em]">Cost distribution</div>
              <div className="text-xl md:text-2xl font-semibold text-slate-900 mt-2">Part type share</div>
            </div>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500">☰</div>
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
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 12,
                      color: "#0f172a",
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
                  <div key={item.name} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-[0.22em]">{item.name}</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">{formatCurrency(item.value)}</div>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{percent.toFixed(2)}%</div>
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