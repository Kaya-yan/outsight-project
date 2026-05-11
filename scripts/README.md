# OutSight 本地同步脚本 (sync_cli.py)

本地兜底方案：当 Vercel 托管的 Web 同步功能不可用时，队员可在本地运行此脚本直接拉取新闻语料入库。

## 依赖安装

```bash
pip install supabase-py requests
```

## 环境变量

```bash
# 必需
export SUPABASE_URL=https://xxxxx.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxx

# 可选（仅 NewsAPI）
export NEWSAPI_KEY=xxxxx
```

> `SUPABASE_SERVICE_ROLE_KEY` 可在 Supabase Dashboard → Project Settings → API 中找到。**此密钥拥有最高权限，请妥善保管，不要分享给非团队成员。**

## 用法

```bash
# 执行同步
python sync_cli.py

# 预览而不写入数据库
python sync_cli.py --dry-run

# 仅 RSS
python sync_cli.py --source rss

# 仅 NewsAPI
python sync_cli.py --source newsapi
```

## Windows 计划任务配置

1. 打开"任务计划程序"（Task Scheduler）
2. 创建基本任务 → 名称: "OutSight Sync"
3. 触发器: 每天，选择非高峰时间（如 8:00）
4. 操作: 启动程序
   - 程序: `C:\path\to\python.exe`
   - 参数: `C:\path\to\outsight-project\scripts\sync_cli.py`
   - 起始于: `C:\path\to\outsight-project\scripts`

5. 在"条件"中取消"仅当交流电源时启动"（笔记本）
6. 在环境变量中添加 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`

## macOS LaunchAgent 配置

创建 `~/Library/LaunchAgents/com.outsight.sync.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.outsight.sync</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/path/to/scripts/sync_cli.py</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>SUPABASE_URL</key>
        <string>https://xxxxx.supabase.co</string>
        <key>SUPABASE_SERVICE_ROLE_KEY</key>
        <string>sb_secret_xxxxx</string>
    </dict>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>8</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
```

加载: `launchctl load ~/Library/LaunchAgents/com.outsight.sync.plist`
