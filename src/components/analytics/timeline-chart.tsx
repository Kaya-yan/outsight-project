"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { RESEARCH_PERIODS } from "@/lib/constants";

interface TimelineChartProps {
  data: Record<string, Record<string, number>>; // media -> period -> count
}

export function TimelineChart({ data }: TimelineChartProps) {
  const periods = RESEARCH_PERIODS.map((p) => p.value);
  const medias = Object.keys(data);

  const chartData = periods.map((period) => {
    // Compact label: "2022.10-2023.03" → "22.10", "2025.01-2025.06" → "25.01"
    const row: Record<string, string | number> = { period: period.slice(2, 7) };
    for (const media of medias) {
      row[media] = data[media]?.[period] ?? 0;
    }
    return row;
  });

  const hasData = chartData.some((d) =>
    Object.values(d).some((v) => typeof v === "number" && v > 0));

  if (!hasData) {
    return <p className="text-xs text-[#7F8A93] text-center py-8">暂无时间序列数据</p>;
  }

  const COLORS = ["#4A90A4", "#5DAD93", "#2D3436", "#E67E22", "#7F8A93", "#A0B4C8"];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E5E9" />
        <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#7F8A93" }} />
        <YAxis tick={{ fontSize: 11, fill: "#7F8A93" }} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {medias.map((m, i) => (
          <Bar key={m} dataKey={m} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
