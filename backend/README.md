# Sanya TCM API

独立后端 MVP，用于把 GitHub Pages 前台从本地 CRM Lite 升级为共享 CRM。

## API

POST /api/leads
接收最小预约组织信息：name、contact、preferredDate、service、language、source、medium、campaign。服务器自动进入 appointment_requested。

POST /api/events
仅接收非医疗漏斗事件。

GET /api/leads
仅管理员 Token。

PATCH /api/leads/:id
管理员更新 stage、appointmentDate、visitDate、followupDate、valueCny、owner。

## 部署

建议单独 Node.js 主机或 VPS，并使用 HTTPS。

## 数据边界

不要通过这个普通 Leads API 接收病历、MRI、CT、诊断或身份证件。生产上线前继续补齐限流、后台登录、角色权限、审计、备份、删除和跨境数据处理评估。
