"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface CoderStatsProps {
  data: Record<string, number>;
}

export function CoderStats({ data }: CoderStatsProps) {
  const chartData = Object.entries(data)
    .map(([coderId, count]) => ({
      name: coderId.slice(0, 8),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  if (chartData.length === 0) {
    return <p className="text-xs text-[#7F8A93] text-center py-8">暂无编码数据</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E5E9" />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#7F8A93" }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#7F8A93" }} width={60} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} />
        <Bar dataKey="count" fill="#4A90A4" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
