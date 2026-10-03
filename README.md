# Sanya Acupuncture International Patient Service

三亚针灸国际患者服务项目，第一阶段聚焦俄罗斯及俄语地区游客。

## 产品定位

核心路径：

俄语搜索 / Telegram / VK / 旅游渠道 → 了解针灸与医院 → 提交预约需求 → 确认时间 → 到医院就诊 → 俄语组织沟通 → 后续服务。

这个网站是独立的信息与组织服务入口，不是医院官方网站。医疗决定、诊断与治疗方案由医疗机构及医生负责。

## 当前版本

- React + Vite
- Russian / Chinese / English 页面
- Russian SEO-first 页面结构
- `config/site.json` 单一事实源；构建时自动同步为运行时静态配置
- 医院官方信息、医生信息、Telegram、VK、WhatsApp、邮箱均可从配置层填写
- 预约表单目前生成 Telegram 消息，不在网站保存患者医疗资料
- GitHub Pages 自动部署
- robots.txt + sitemap.xml + hreflang + canonical + JSON-LD 基础 SEO

## 内容配置

主要配置文件：

`config/site.json`

可填写：

- Telegram URL / 用户名
- VK / WhatsApp / Email
- 医院正式名称、地址、电话、官网、科室
- 医生姓名、职称、专长、语言、资质
- Russian / Chinese / English SEO title、description、keywords
- 网站主域名

医生配置默认关闭。只有确认医生、出诊安排和资质后再设置 `enabled: true`。

## 为什么先做配置层，而不是把后台账号硬塞进静态网站？

GitHub Pages 是静态托管，本身不能安全地保存管理员密码、患者资料或直接提供数据库写入接口。因此当前版本把“可变业务内容”从前端代码里抽离出来。

下一阶段接入真正后端时，可以逐步把配置内容迁移到 Content API / 数据库；前台保持现有配置接口，不必重做页面。

推荐的后端数据模型：

`site_settings`、`hospitals`、`doctors`、`services`、`prices`、`faq_items`、`leads`、`source_events`、`admin_users`。

## SEO 方向

首要语言为俄语，重点覆盖真实搜索意图，而不是堆砌关键词：

- иглоукалывание в Санье
- акупунктура в Санье
- иглотерапия Санья
- китайская медицина в Санье
- иглоукалывание для русских
- врач китайской медицины Санья
- больница китайской медицины Санья
- лечение в Санье для русскоязычных туристов

后续应继续建立独立俄语内容页：

- `/ru/acupuncture/`
- `/ru/hospital/`
- `/ru/pricing/`
- `/ru/faq/`
- `/ru/prepare-for-visit/`

每个页面都解决一个真实问题，并使用内部链接回到预约入口。

## 数据与隐私

第一版不主动采集身份证、护照、MRI/CT、病历等敏感资料。患者只留下最少的预约组织信息。

正式后端上线后，应进一步设计：

- 数据最小化
- 权限分层
- 审计日志
- 数据删除/导出
- 隐私政策与跨境数据处理说明
- 医疗信息与营销信息分开管理

## 重要原则

不发布未经核实的医生履历，不把独立服务写成医院官方渠道，不作诊断，不保证疗效，不提前承诺固定疗程。


## 2026-10 架构审计后的技术边界

- GitHub Pages：只负责公开前台、SEO 静态内容与 Admin 前端代码，不存放数据库凭据。
- 运行时配置：源文件唯一保留在 `config/site.json`；`npm run build` 会先生成 `public/config/site.json`，避免手工维护两份配置。
- Admin：未配置 API 时为本机 CRM Lite；配置 HTTPS API 后切换到共享 CRM 登录模式。
- API：Node.js + PostgreSQL，负责认证、Lead、漏斗事件和后台统计。
- 数据：当前只保存最小组织信息，不设计成电子病历系统。
- 安全：公开 Lead / Event 接口具有限流；后台 Session 服务端存储 token 摘要；管理员密码使用 scrypt 哈希。
