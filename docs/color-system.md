# 色彩系统

> 状态：Draft · 最后更新：2026-05-08

## 色彩 Token

| Token | 色值 | 用途 |
|-------|------|------|
| `--color-primary` | `#4A90A4` | 主色·雾青：按钮、链接、强调 |
| `--color-secondary` | `#2D3436` | 辅色·石墨：导航背景、正文标题 |
| `--color-accent` | `#5DAD93` | 强调·薄荷：成功状态、进度、侧边栏高亮 |
| `--color-background` | `#FAFBFC` | 素白：主背景 |
| `--color-card` | `#F0F2F5` | 浅灰：卡片底色 |
| `--color-warning` | `#E67E22` | 琥珀：温和提醒 |
| `--color-border` | `#E2E5E9` | 边框 |
| `--color-muted` | `#7F8A93` | 次要文字 |

## shadcn/ui 映射

shadcn 变量自动继承 OutSight Token：
- `--background` → `--color-background`
- `--primary` → `--color-primary`
- `--secondary` → `--color-secondary`
- `--accent` → `--color-accent`
- `--muted` → `--color-muted`
- `--sidebar` → `--color-secondary`

## 字体

| 用途 | 字体栈 |
|------|--------|
| 正文/UI | Inter, -apple-system, PingFang SC, Microsoft YaHei |
| 数据/代码 | JetBrains Mono, Fira Code, monospace |

Inter 通过 `next/font/google` 加载，JetBrains Mono 为系统字体回退。
