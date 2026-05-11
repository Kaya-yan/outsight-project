# 数据库 Schema

> 状态：Draft · 最后更新：2026-05-08

## ER 概览

10 张核心表，通过外键关联：

```
profiles ────┬── coding_frameworks ──── coding_nodes
             │        │
             ├── articles ──── annotations ──── coding_nodes
             │     │
             ├── assignments (article_id → articles, assignee_id → profiles)
             │
             ├── collection_logs (triggered_by → profiles)
             ├── activity_logs (user_id → profiles)
             ├── ai_queue (created_by → profiles)
             └── ai_prompts (created_by → profiles)
```

## 表清单

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| profiles | 用户档案，1:1 auth.users | username, email, role |
| coding_frameworks | 编码框架（版本化） | name, version, is_active |
| coding_nodes | 框架节点树 | framework_id, parent_id, lft/rgt |
| articles | 新闻语料 | title, source, full_text, is_archived |
| annotations | 编码标注 | article_id, node_id, coder_id, confidence |
| assignments | 任务分配 | article_id, assignee_id, status |
| collection_logs | 采集日志（只追加） | batch_id, source, status |
| activity_logs | 操作审计日志（只追加） | user_id, action, entity_type |
| ai_queue | AI 处理队列 | job_type, status, payload, result |
| ai_prompts | AI Prompt 模板 | name, system_prompt, user_prompt_template |

## RLS 策略

所有表均启用 RLS。核心规则：
- **profiles**: 所有人可读，仅本人可修改
- **frameworks/nodes**: 所有人可读，仅 admin/lead_researcher 可写
- **articles**: 所有认证用户可读写
- **annotations**: 所有人可读，仅创建者可修改自己的标注
- **assignments**: 所有人可读，仅 admin/lead_researcher 可管理
