#!/usr/bin/env python3
"""
OutSight 语料同步脚本 (sync_cli.py)
=====================================
本地兜底方案：通过 RSS 和 NewsAPI 拉取新闻语料，直接写入 Supabase 数据库。
适用于网络环境不稳定、无法访问 Vercel 托管的 Web 同步功能时使用。

依赖安装：
  pip install supabase-py requests

环境变量（必需）：
  SUPABASE_URL=https://xxxxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxx

可选环境变量：
  NEWSAPI_KEY=xxxxx  (仅 NewsAPI 需要，RSS 不需要)

用法：
  python sync_cli.py              # 执行同步
  python sync_cli.py --dry-run    # 预览但不写入数据库
  python sync_cli.py --source rss # 仅 RSS
  python sync_cli.py --source newsapi  # 仅 NewsAPI
"""

import os
import sys
import uuid
import time
import argparse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from urllib.parse import urlparse

try:
    from supabase import create_client, Client
except ImportError:
    print("请安装 supabase-py: pip install supabase-py")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("请安装 requests: pip install requests")
    sys.exit(1)


# ============================================================
# 配置
# ============================================================

RSS_FEEDS = [
    {"name": "BBC", "url": "https://feeds.bbci.co.uk/news/world/rss.xml"},
    {"name": "Guardian", "url": "https://www.theguardian.com/world/rss"},
]

SEARCH_QUERIES = [
    "Chinese modernization",
    "China economic development",
    "Belt and Road Initiative",
    "China foreign policy",
]

NEWSAPI_BASE = "https://newsapi.org/v2"


# ============================================================
# RSS 解析
# ============================================================

def fetch_rss_articles() -> list[dict]:
    """从 RSS feeds 拉取文章."""
    results = []
    for feed in RSS_FEEDS:
        try:
            resp = requests.get(
                feed["url"],
                headers={"User-Agent": "OutSight/0.1 (Academic Research Tool)"},
                timeout=15,
            )
            resp.raise_for_status()
            root = ET.fromstring(resp.text)
            for item in root.iter("item"):
                title = item.findtext("title", "").strip()
                link = item.findtext("link", "").strip()
                if not title or not link:
                    continue
                pub_date = item.findtext("pubDate", "")
                try:
                    pub_date = (
                        datetime.strptime(pub_date, "%a, %d %b %Y %H:%M:%S %z")
                        .date()
                        .isoformat()
                        if pub_date
                        else None
                    )
                except ValueError:
                    pub_date = None
                desc = item.findtext("description", "")
                results.append({
                    "title": title,
                    "url": link,
                    "publish_date": pub_date,
                    "source": feed["name"],
                    "description": desc[:500] if desc else None,
                })
        except Exception as e:
            print(f"  [WARN] RSS {feed['name']} 拉取失败: {e}")
    return results


# ============================================================
# NewsAPI 拉取
# ============================================================

def fetch_newsapi_articles(api_key: str) -> list[dict]:
    """从 NewsAPI 拉取文章."""
    results = []
    for query in SEARCH_QUERIES:
        try:
            resp = requests.get(
                f"{NEWSAPI_BASE}/everything",
                params={
                    "q": query,
                    "apiKey": api_key,
                    "language": "en",
                    "sortBy": "publishedAt",
                    "pageSize": 20,
                    "domains": "nytimes.com,washingtonpost.com,wsj.com",
                },
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            if data.get("status") != "ok":
                continue
            for a in data.get("articles", []):
                if not a.get("title") or not a.get("url"):
                    continue
                src = (a.get("source") or {}).get("name", "")
                if "New York Times" in src:
                    source = "NYT"
                elif "Washington Post" in src:
                    source = "WP"
                elif "Wall Street Journal" in src:
                    source = "WSJ"
                else:
                    source = src
                results.append({
                    "title": a["title"],
                    "url": a["url"],
                    "publish_date": a.get("publishedAt", "")[:10] or None,
                    "source": source,
                    "description": (a.get("description") or "")[:500] or None,
                })
        except Exception as e:
            print(f"  [WARN] NewsAPI query '{query}' 失败: {e}")
    return results


# ============================================================
# 去重
# ============================================================

def normalize_url(url: str) -> str:
    """标准化 URL 用于去重."""
    try:
        u = urlparse(url)
        path = u.path.rstrip("/") or "/"
        skip = {"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "ref"}
        query = "&".join(
            sorted([
                f"{k}={v}"
                for k, v in (p.split("=", 1) for p in u.query.split("&") if "=" in p)
                if k not in skip
            ])
        )
        return f"{u.scheme}://{u.netloc}{path}" + (f"?{query}" if query else "")
    except Exception:
        return url.strip().lower()


def find_existing_urls(client: Client, urls: list[str]) -> set[str]:
    """查询数据库中已存在的 URL."""
    existing = set()
    normalized = [normalize_url(u) for u in urls]
    for i in range(0, len(normalized), 100):
        batch = normalized[i:i + 100]
        resp = client.table("articles").select("url").in_("url", batch).execute()
        for row in resp.data or []:
            existing.add(normalize_url(row["url"]))
    return existing


# ============================================================
# 主逻辑
# ============================================================

def run_sync(
    client: Client,
    dry_run: bool = False,
    source_filter: str | None = None,
) -> None:
    """执行同步."""
    articles = []

    if source_filter is None or source_filter == "rss":
        print("[RSS] 拉取中...")
        articles.extend(fetch_rss_articles())

    if source_filter is None or source_filter == "newsapi":
        api_key = os.getenv("NEWSAPI_KEY")
        if api_key:
            print("[NewsAPI] 拉取中...")
            articles.extend(fetch_newsapi_articles(api_key))
        else:
            print("[NewsAPI] 未设置 NEWSAPI_KEY，跳过")

    print(f"  共拉取 {len(articles)} 篇")

    if dry_run:
        print("\n[Dry Run] 预览前 10 篇:")
        for a in articles[:10]:
            print(f"  [{a['source']}] {a['title'][:80]}")
        return

    # 去重
    urls = [a["url"] for a in articles]
    existing = find_existing_urls(client, urls)
    new_articles = [a for a in articles if normalize_url(a["url"]) not in existing]
    print(f"  新增 {len(new_articles)} 篇，重复 {len(articles) - len(new_articles)} 篇")

    if not new_articles:
        print("  无新文章，跳过写入")
        return

    # 写入数据库
    inserted = 0
    for a in new_articles:
        resp = client.table("articles").insert({
            "title": a["title"],
            "url": a["url"],
            "media": a["source"],
            "publish_date": a.get("publish_date"),
            "status": "待发现",
            "abstract": a.get("description"),
        }).execute()
        if not resp.data:
            print(f"  [ERROR] 插入失败: {a['title'][:60]}")
        else:
            inserted += 1

    print(f"  成功插入 {inserted} 篇语文语料")


# ============================================================
# 入口
# ============================================================

def main() -> None:
    parser = argparse.ArgumentParser(description="OutSight 语料同步脚本")
    parser.add_argument("--dry-run", action="store_true", help="预览而不写入数据库")
    parser.add_argument("--source", choices=["rss", "newsapi"], help="指定拉取来源")
    args = parser.parse_args()

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        print("请设置环境变量 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY")
        print("  export SUPABASE_URL=https://xxxxx.supabase.co")
        print("  export SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxx")
        sys.exit(1)

    print(f"=== OutSight Sync CLI ===")
    print(f"  时间: {datetime.now().isoformat()}")
    if args.dry_run:
        print(f"  模式: Dry Run (预览)")
    print()

    client = create_client(supabase_url, supabase_key)
    run_sync(client, dry_run=args.dry_run, source_filter=args.source)
    print("\n  同步完成")


if __name__ == "__main__":
    main()
