# Supabase 项目配置

> 状态：Draft · 最后更新：2026-05-08

## 创建项目

1. 访问 [supabase.com](https://supabase.com) 注册账号
2. 创建新项目，选择区域（建议 Southeast Asia 或 US West）
3. 记录以下信息：
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role Key → `SUPABASE_SERVICE_ROLE_KEY`

## 环境变量

复制 `.env.example` 为 `.env.local`，填入上述值。

## Auth 设置

在 Supabase Dashboard → Authentication：
- Site URL: `http://localhost:3000`（开发）/ 生产 URL
- Redirect URLs: `http://localhost:3000/auth/callback`
- JWT Expiry: 2592000 秒（30 天）

### Email OTP 配置（关键）

在 Authentication → Providers → Email：
- 启用 Email 提供商
- 开启 **Email OTP**（Enable email OTP）
- OTP Length: **6** 位数
- OTP Expiry: 300 秒（5 分钟）

> 注意：必须开启 Email OTP，否则 `signInWithOtp` 默认发送 Magic Link 而非六位验证码。

### 邮件模板

可在 Authentication → Email Templates 中自定义 OTP 验证邮件。
模板变量 `{{ .Token }}` 会被替换为六位验证码。

## 执行迁移

在 Supabase SQL Editor 中运行 `supabase/migrations/0000_initial_schema.sql`。

## 验证

```sql
-- 检查表是否创建
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- 检查 RLS 是否启用
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('profiles', 'articles');
```
