"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface KappaChartProps {
  values: number[];
}

export function KappaChart({ values }: KappaChartProps) {
  // Bin kappa values into ranges
  const bins = [
    { range: "< 0", min: -1, max: 0, count: 0 },
    { range: "0-0.2", min: 0, max: 0.2, count: 0 },
    { range: "0.2-0.4", min: 0.2, max: 0.4, count: 0 },
    { range: "0.4-0.6", min: 0.4, max: 0.6, count: 0 },
    { range: "0.6-0.8", min: 0.6, max: 0.8, count: 0 },
    { range: "0.8-1.0", min: 0.8, max: 1.01, count: 0 },
  ];

  for (const v of values) {
    for (const bin of bins) {
      if (v >= bin.min && v < bin.max) {
        bin.count++;
        break;
      }
    }
  }

  const chartData = bins.map((b) => ({ range: b.range, count: b.count }));

  if (values.length === 0) {
    return <p className="text-xs text-[#7F8A93] text-center py-8">暂无信度数据</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E5E9" />
        <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#7F8A93" }} />
        <YAxis tick={{ fontSize: 11, fill: "#7F8A93" }} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} />
        <Bar dataKey="count" fill="#5DAD93" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
