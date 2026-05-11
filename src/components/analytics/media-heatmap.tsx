"use client";

import { cn } from "@/lib/utils";
import { MEDIA_OUTLETS, RESEARCH_PERIODS } from "@/lib/constants";

interface MediaHeatmapProps {
  data: Record<string, Record<string, number>>;
}

export function MediaHeatmap({ data }: MediaHeatmapProps) {
  const allValues = RESEARCH_PERIODS.flatMap((p) =>
    MEDIA_OUTLETS.map((m) => data[m.value]?.[p.value] ?? 0),
  );
  const maxVal = Math.max(1, ...allValues);

  const hasData = allValues.some((v) => v > 0);
  if (!hasData) {
    return <p className="text-xs text-[#7F8A93] text-center py-8">暂无语料数据</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="p-2 text-left text-[#7F8A93] font-medium">媒体</th>
            {RESEARCH_PERIODS.map((p) => (
              <th key={p.value} className="p-2 text-center text-[#7F8A93] font-medium">
                {p.label.slice(2, 7)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MEDIA_OUTLETS.map((m) => (
            <tr key={m.value}>
              <td className="p-2 text-[#2D3436] font-medium">{m.label}</td>
              {RESEARCH_PERIODS.map((p) => {
                const count = data[m.value]?.[p.value] ?? 0;
                return (
                  <td
                    key={p.value}
                    className="p-2 text-center font-mono"
                    style={{
                      backgroundColor: `rgba(74, 144, 164, ${0.05 + (count / maxVal) * 0.5})`,
                    }}
                  >
                    {count > 0 ? count : "-"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
