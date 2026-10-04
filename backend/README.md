# Sanya TCM API

独立后端 MVP，用于把 GitHub Pages 前台从本地 CRM Lite 升级为共享 CRM。

## 当前能力

POST /api/auth/login
管理员账号密码登录。登录成功后返回短期 Bearer session token，服务器只在 PostgreSQL 保存 token 的 SHA-256 摘要。

GET /api/auth/me
验证当前管理员 session。

POST /api/auth/logout
撤销当前 session。

POST /api/leads
接收最小预约组织信息：name、contact、preferredDate、service、language、source、medium、campaign。服务器自动进入 appointment_requested。

POST /api/events
仅接收非医疗漏斗事件。

GET /api/leads
需要管理员 session，返回最近 500 条 Lead。

GET /api/dashboard
需要管理员 session，返回 Lead 总量、阶段统计、主要来源和事件数量。

PATCH /api/leads/:id
需要管理员 session，可更新 stage、appointmentDate、visitDate、followupDate、valueCny、owner。

GET /health
检查 API 与 PostgreSQL 连通性。

## 管理员登录

不要把真实密码或 token 提交到 GitHub。

先生成密码哈希：

    printf '%s\n' '你的强密码' | node backend/hash-password.mjs

建议密码至少 12 位，并使用密码管理器生成。

服务器环境变量：

    DATABASE_URL=postgresql://...
    ADMIN_USERNAME=admin
    ADMIN_PASSWORD_HASH=scrypt$...
    SESSION_TTL_HOURS=12
    SESSION_SAMESITE=lax
    CORS_ORIGIN=https://cymswj.github.io

旧版 ADMIN_TOKEN 仅用于过渡兼容；正式环境建议留空，让后台全部使用登录 session。Session 现在通过 HttpOnly + Secure Cookie 交换。若前台和 API 位于不同站点，需要将 `SESSION_SAMESITE` 设置为 `none`，同时保持 HTTPS；API 仍通过严格 Origin 校验防止跨站状态修改。

## Docker / VPS

推荐结构：

    GitHub Pages 前台
            │
            ▼
       HTTPS API / Nginx
            │
            ▼
        Node.js API
            │
            ▼
       PostgreSQL 18

复制 backend/.env.example 为 backend/.env，填写真实密码、数据库地址和管理员密码哈希。

Docker Compose 会：

1. 启动 PostgreSQL；
2. 通过 healthcheck 等待数据库可用；
3. 第一次创建数据库卷时自动执行 schema.sql；
4. 再启动 Node API。

首次部署：

    cd backend
    cp .env.example .env
    # 编辑 .env
    docker compose up -d --build

检查：

    curl http://127.0.0.1:8787/health

生产环境再通过 Nginx / Caddy 暴露 HTTPS API，例如：

    https://api.example.com

## GitHub Pages 后台

后台地址：

    https://cymswj.github.io/Acupuncture/admin/

当前 config/site.json 中：

    "adminApi": {
      "enabled": false,
      "baseUrl": ""
    }

因此未部署 API 时，后台保持 CRM Lite 本机测试模式。

部署 API 后，把它改成：

    "adminApi": {
      "enabled": true,
      "baseUrl": "https://api.example.com"
    }

之后 /admin/ 会显示正式登录页，登录后从 PostgreSQL 获取共享 Lead 和漏斗统计。

同时把前台：

    leadsApi.enabled = true
    leadsApi.url = "https://api.example.com/api/leads"

以及：

    analyticsApi.enabled = true
    analyticsApi.url = "https://api.example.com/api/events"

这样网站表单和漏斗数据才会真正进入共享后端。

## 数据边界

不要通过普通 Leads API 接收病历、MRI、CT、诊断、身份证件或其他不必要的敏感医疗资料。

生产上线前仍应补齐并核查：

- HTTPS 与反向代理安全头
- 备份与恢复
- 日志与审计
- 删除 / 保留周期
- 管理员账号轮换
- 更细的角色权限（RBAC）
- 跨境数据处理与隐私合规
- 限流与异常监控

后端目前定位为“国际患者组织服务 CRM”，不是电子病历系统。
