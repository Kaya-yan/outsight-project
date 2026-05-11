# API 路由设计规范

> 状态：Draft · 最后更新：2026-05-08

## 路由结构

```
/api/auth/login      POST  — 发起无密码登录
/api/auth/logout     POST  — 退出登录
/api/auth/access-link POST — 生成临时访问链接（管理员）
/api/archive         POST  — 触发语料归档（管理员/组长）
```

## 请求格式

- Content-Type: `application/json`
- Body: JSON

## 响应格式

成功：
```json
{ "success": true, "data": { ... } }
```

错误：
```json
{ "error": "错误描述信息" }
```

## HTTP 状态码

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未登录 |
| 403 | 权限不足 |
| 500 | 服务端错误 |

## 设计原则

- API Routes 仅做薄路由层（参数校验 + 调用数据访问层 + 返回）
- 业务逻辑封装在 `src/lib/data-access/` 中
- 认证检查在 middleware 层完成，API 内部不再重复检查
