# Acupuncture 项目架构与审计说明

## 1. 当前架构

前台层：
- React 19 + Vite 8
- 响应式首页
- Russian / Chinese / English
- Russian-first SEO content pages

内容层：
- `config/site.json`（单一事实源）
- `scripts/sync-runtime-config.mjs`（构建时发布运行时配置）
- Telegram / VK / WhatsApp / Email
- 医院信息
- 医生信息
- SEO metadata
- 定价展示规则
- lead tracking
- 可选 content API
- 可选 leads API

静态内容层：
- `public/ru/*`
- 研究与证据页面
- 患者指南
- 隐私与条款
- sitemap / robots / 404

发布层：
- GitHub Actions
- Vite build
- GitHub Pages

## 2. 为什么现在不直接上数据库后台

GitHub Pages 的定位是静态发布，不应该直接在前端保存管理员密码、患者医疗资料或数据库凭据。

因此当前采用：

前端
→ config/site.json
→ 未来 Content API
→ Database / Admin

这样可以先验证获客模型，再把动态能力放到真正的后端。

## 3. 未来后端模型

建议核心实体：

- site_settings
- hospitals
- departments
- doctors
- services
- prices
- faq_items
- evidence_articles
- content_pages
- leads
- appointments
- source_events
- staff_users
- audit_logs

核心关系：

Patient/Lead
→ Appointment
→ Hospital
→ Department
→ Doctor
→ Service

同时独立记录：

Source Event
→ Telegram / VK / Yandex / Search / Hotel / Agency / Referral

## 4. SEO 架构

俄罗斯市场为第一优先级。

主词：
- иглоукалывание в Санье
- акупунктура в Санье
- иглотерапия Санья
- китайская медицина в Санье
- иглоукалывание для русских

意图词：
- где сделать иглоукалывание в Санье
- сколько стоит иглоукалывание в Санье
- врач китайской медицины Санья
- больница китайской медицины Санья
- можно ли сделать иглоукалывание русскому туристу
- есть ли переводчик в больнице Санья

页面采用“一个页面解决一个问题”的原则。

## 5. 俄语市场内容结论

从公开俄语网站、Yandex Maps 评价、Telegram 旅游内容以及三亚本地公开报道中，可以看到几个反复出现的问题：

1. 是否正规、是否是医院/诊所
2. 是否相信这个服务，能否核验信息
3. 是否方便到达、预约和沟通
4. 是否能提前理解价格和流程
5. 医生是谁、是否可以核验
6. 患者真实体验如何
 

所以网站核心不是“针灸宣传”，而是：

Trust
→ Access
→ Clarity
→ Communication
→ Budget
→ Route
→ Evidence

## 6. 学术内容原则

网站不把科研文献当作疗效承诺。

每篇研究类文章应分成：

- 研究了什么
- 纳入多少研究 / 患者
- 主要结果
- 证据质量
- 研究局限
- 对普通患者意味着什么
- 什么结论不能从研究中推出

优先引用：
- WHO
- PubMed / NLM
- Cochrane
- NICE
- 中国官方医疗机构
- 高质量系统评价 / Meta-analysis

## 7. 医疗内容边界

网站不得：
- 远程诊断
- 保证疗效
- 保证固定疗程
- 暗示可以替代全部常规医疗
- 发布未经验证的医生资格
- 把独立服务写成医院官方服务
- 诱导用户通过公开表单上传病历、MRI、CT、身份证等敏感信息

医生信息必须 `enabled: true` 后才公开。

## 8. 当前技术审计

已处理：

- 删除重复 Pages workflow
- 修正 Actions Node/cache 问题
- 修正多语言 HTML 的 Vite source path
- 统一静态 SEO 页进入 public 层
- 修复 attribution 状态代码
- 修复 preparedMessage 状态
- 修正 locale canonical 逻辑
- 默认仅展示明确 enabled 的医生
- 配置文件可读取未来 Content API
- 预留 Leads API
- 增加 404
- 增加 privacy / terms
- 增加 sitemap / robots
- 增加 JSON-LD
- 增加 UTM / ref 来源追踪

## 9. 当前还需要业务确认的内容

- 正式品牌名
- Telegram
- VK
- WhatsApp
- Email
- 服务主体及法律联系方式
- 最终收费规则
- 确认合作医生及出诊时间
- 是否提供人工俄语翻译
- 是否提供接送
- 是否需要真实预约后端

以上内容不应猜测，直接填写到配置或后端。

## 10. 下一阶段

A. 内容：
- 继续建设俄语专题页
- 医学科普与证据库
- 医院/医生/服务独立页面
- 常见问题持续扩展

B. 获客：
- Yandex Search
- Telegram
- VK
- 酒店 / 旅行社合作
- QR / offline materials
- UTM / source attribution

C. 后端：
- Admin
- Leads
- Appointment status
- Staff permissions
- Audit logs
- Audit log query UI
- Leads pagination / filtering API

D. 平台化：
- 多医院
- 多医生
- 多城市
- 多语言
- 国际患者服务

## 11. 核心产品原则

不是“卖一次针灸”。

而是：

让俄语患者更容易理解中国医疗
→ 更容易做出自己的选择
→ 更容易完成预约
→ 更容易安全地到院
→ 更容易完成沟通
→ 逐步形成可复用的国际患者服务基础设施。


## 12. 本轮深度审计结论

### 已确认的优点

React/Vite 多页面结构适合当前“营销首页 + SEO 专题页 + Admin”阶段；Vite 官方支持多页入口，public 目录适合需要保留固定 URL 的运行时静态资源。公开页面与后台页面已经形成清晰边界。

### 已完成的改进

1. Admin 配置读取改为基于 `BASE_URL`，兼容 GitHub Pages 子路径。
2. 运行时配置改为单一事实源，构建时自动同步。
3. Admin 全部中文化，后台不再混入俄文。
4. Lead 写入失败不再显示假成功。
5. Lead ID 改由服务器生成。
6. 公开 Lead / Event 接口限流并限制事件白名单。
7. PostgreSQL schema 在 API 启动时主动初始化/校验。
8. Russian SEO 页 canonical 统一为目录 URL。
9. Admin 从 robots 中排除。
10. CI 增加运行时配置、后台路由、后端语法和关键安全检查。

### 当前仍未进入正式生产的部分

1. API 尚未部署到公网 HTTPS。
2. Admin 仍未启用共享 CRM。
3. Admin 已改为 HttpOnly + Secure Cookie Session。默认 `SameSite=Lax`；若前台与 API 跨站部署，则将 `SESSION_SAMESITE=none` 并依靠 HTTPS + 严格 Origin 校验。
4. 生产环境需要完整 RBAC、审计日志、备份/恢复、数据删除策略、监控与跨境数据合规评估。
