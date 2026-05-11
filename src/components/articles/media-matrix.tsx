"use client";

import { cn } from "@/lib/utils";
import { MEDIA_OUTLETS, RESEARCH_PERIODS } from "@/lib/constants";

interface MediaMatrixProps {
  data: Record<string, Record<string, number>>; // data[media][period] = count
  onCellClick?: (media: string, period: string) => void;
  mini?: boolean;
}

export function MediaMatrix({ data, onCellClick, mini = false }: MediaMatrixProps) {
  if (mini) {
    return <MediaMatrixMini data={data} onCellClick={onCellClick} />;
  }

  const allCells = MEDIA_OUTLETS.flatMap((m) =>
    RESEARCH_PERIODS.map((p) => ({
      media: m.value,
      period: p.value,
      count: data[m.value]?.[p.value] ?? 0,
    })),
  );
  const maxCount = Math.max(1, ...allCells.map((c) => c.count));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="p-2 text-left text-[#7F8A93] font-medium">媒体</th>
            {RESEARCH_PERIODS.map((p) => (
              <th
                key={p.value}
                className="p-2 text-center text-[#7F8A93] font-medium"
              >
                {p.label}
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
                const intensity = count / maxCount;
                return (
                  <td
                    key={p.value}
                    className={cn(
                      "p-2 text-center font-mono transition-colors",
                      onCellClick && "cursor-pointer hover:ring-1 hover:ring-[#4A90A4]",
                    )}
                    style={{
                      backgroundColor: intensity > 0
                        ? `rgba(74, 144, 164, ${0.08 + intensity * 0.4})`
                        : "#F9FAFB",
                    }}
                    onClick={() => count > 0 && onCellClick?.(m.value, p.value)}
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

function MediaMatrixMini({ data, onCellClick }: Omit<MediaMatrixProps, "mini">) {
  return (
    <div className="grid grid-cols-6 gap-0.5">
      {MEDIA_OUTLETS.map((m) =>
        RESEARCH_PERIODS.map((p) => {
          const count = data[m.value]?.[p.value] ?? 0;
          return (
            <div
              key={`${m.value}-${p.value}`}
              className="aspect-square flex items-center justify-center rounded-[2px] text-[10px] font-mono cursor-pointer hover:ring-1 hover:ring-[#4A90A4]"
              style={{
                backgroundColor: count > 0
                  ? `rgba(93, 173, 147, ${0.15 + (count / 50) * 0.5})`
                  : "#F0F2F5",
              }}
              onClick={() => count > 0 && onCellClick?.(m.value, p.value)}
              title={`${m.label} · ${p.label}: ${count}篇`}
            >
              {count > 0 ? count : ""}
            </div>
          );
        }),
      )}
    </div>
  );
}
