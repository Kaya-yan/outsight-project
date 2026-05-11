"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

interface TimelineChartProps {
  data: Record<string, Record<string, number>>; // media -> period -> count
}

export function TimelineChart({ data }: TimelineChartProps) {
  const periods = ["2022.10-2023.03", "2023.04-2023.09", "2023.10-2024.03", "2024.04-2024.09", "2024.10-2024.12"];
  const medias = Object.keys(data);

  const chartData = periods.map((period) => {
    const row: Record<string, string | number> = { period: period.replace("202", "").slice(0, 5) };
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
