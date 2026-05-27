"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid } from "recharts";

interface LitStats {
  total: number;
  forReview: number;
  byTag: Record<string, number>;
  byContributor: Record<string, number>;
  byRating: Record<string, number>;
  avgRating: number;
}

const COLORS = ["#4A90A4", "#5DAD93", "#E67E22", "#7F8A93", "#2D3436", "#4A6FA5", "#C44569", "#F5B041"];

export function LiteratureDashboard({ stats }: { stats: LitStats }) {
  const tagData = Object.entries(stats.byTag)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const reviewData = [
    { name: "综述用", value: stats.forReview },
    { name: "非综述", value: stats.total - stats.forReview },
  ];

  const ratingData = [1, 2, 3, 4, 5].map((v) => ({
    name: `${v} 星`,
    count: stats.byRating[String(v)] ?? 0,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {/* Summary cards */}
      <div className="col-span-1 md:col-span-4 flex gap-3">
        {[
          { label: "文献总数", value: stats.total, color: "text-[#4A90A4]" },
          { label: "综述用", value: stats.forReview, color: "text-[#E67E22]" },
          { label: "平均评分", value: stats.avgRating.toFixed(1), color: "text-[#5DAD93]" },
          { label: "标签种类", value: Object.keys(stats.byTag).length, color: "text-[#7F8A93]" },
        ].map((s) => (
          <div key={s.label} className="flex-1 bg-white rounded-lg border border-[#E2E5E9] p-3 text-center">
            <p className={`text-lg font-semibold font-mono ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-[#7F8A93]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tag distribution */}
      <div className="md:col-span-2 bg-white rounded-lg border border-[#E2E5E9] p-3">
        <h4 className="text-xs font-medium text-[#2D3436] mb-2">标签分布</h4>
        {tagData.length === 0 ? (
          <p className="text-xs text-[#95A5A6] py-4 text-center">暂无数据</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={tagData} layout="vertical" margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="#95A5A6" />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} stroke="#95A5A6" />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {tagData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Review split */}
      <div className="bg-white rounded-lg border border-[#E2E5E9] p-3">
        <h4 className="text-xs font-medium text-[#2D3436] mb-2">综述占比</h4>
        {stats.total === 0 ? (
          <p className="text-xs text-[#95A5A6] py-4 text-center">暂无数据</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={reviewData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                <Cell fill="#E67E22" />
                <Cell fill="#F0F2F5" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Rating distribution */}
      <div className="bg-white rounded-lg border border-[#E2E5E9] p-3">
        <h4 className="text-xs font-medium text-[#2D3436] mb-2">评分分布</h4>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={ratingData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#95A5A6" />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
            <Bar dataKey="count" fill="#4A90A4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
