# 无密码认证流程

> 状态：Draft · 最后更新：2026-05-08

## 登录序列

```
用户访问 /login
  → 输入用户名 + 邮箱
  → 点击"获取验证码"
  → POST /api/auth/login { email, username }
  → 服务端调用 supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, data: { username } }
    })
  → Supabase 发送六位 Email OTP 验证码
  → 显示验证码输入框（60 秒后可重新发送）
  → 用户输入六位验证码
  → 点击"进入平台"
  → POST /api/auth/verify-otp { email, token }
  → 服务端调用 supabase.auth.verifyOtp({ email, token, type: "email" })
  → 验证成功，设置 session cookie (HTTP-only, 30 天有效期)
  → 前端重定向到 /dashboard
```

## 会话管理

- JWT 有效期：30 天（2592000 秒）
- Cookie 类型：HTTP-only, Secure, SameSite=Lax
- 自动续期：middleware 每次请求时自动刷新过期 session
- Zustand store: 监听 `onAuthStateChange` 事件，实时同步状态

## 自动注册

- Supabase Trigger `on_auth_user_created` 自动创建 `profiles` 行
- 默认角色：`researcher`
- 用户名从 `raw_user_meta_data.username` 提取

## 临时访问链接

- 管理员 POST /api/auth/access-link { email, expiresInHours }
- 使用 service_role key 调用 `auth.admin.generateLink`
- 生成 24 小时有效的 Magic Link
- 用于邀请临时访问的队员
