"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#4A90A4", "#5DAD93", "#2D3436", "#E67E22", "#7F8A93", "#A0B4C8"];

interface FrameworkPieProps {
  data: Record<string, number>;
  nodes?: Array<{ id: string; label: string; color?: string }>;
}

export function FrameworkPie({ data, nodes = [] }: FrameworkPieProps) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const chartData = Object.entries(data)
    .map(([nodeId, count]) => {
      const node = nodeMap.get(nodeId);
      return {
        name: node?.label ?? nodeId.slice(0, 8),
        value: count,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  if (chartData.length === 0) {
    return <p className="text-xs text-[#7F8A93] text-center py-8">暂无编码数据</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius={90}
          dataKey="value"
          label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
          labelLine={{ stroke: "#95A5A6", strokeWidth: 1 }}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 4 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
