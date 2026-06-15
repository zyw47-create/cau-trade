# 校园二手交易微信小程序平台

本项目是一个面向校园场景的二手闲置、校园服务与跑腿任务综合交易平台。系统包含微信小程序端、邮箱验证码后端、MySQL 数据库设计与运维脚本、Python Flask 管理后台，以及需求、概要设计、详细设计、数据设计、数据流图和 ER 图等课程交付文档。

项目重点覆盖：

- 二手闲置发布、浏览、收藏、下单、支付、售后和评价。
- 校园服务发布、查看服务者主页、预约、支付托管、取消与评价。
- 跑腿任务发布、支付托管、骑手抢单、状态推进、沟通与结算。
- 用户主页、信用分、他人评价、用户名展示、聊天列表与交易证据链。
- 学校邮箱验证码实名认证，限制为 `@cau.edu.cn` 邮箱。
- AI/规则审核、违禁词拦截、敏感内容人工复核。
- 管理员处理违规内容、售后仲裁、实名审核、用户治理和审计日志。
- MySQL 建表、视图、触发器、存储过程、角色权限、备份恢复和健康检查。

> 说明：小程序大部分业务接口默认使用本地 mock 数据，便于课堂演示时快速响应；学校邮箱验证码接口走 `backend/server.js` 的真实 Node 后端；MySQL 数据库与 Flask 管理后台是真实连接 `campus_trade` 数据库的实现。支付链路是平台余额和资金托管的课程演示模型，没有接入真实微信支付。

## 目录结构

```text
.
├── miniprogram/                         # 微信小程序源码
│   ├── app.js                           # 全局配置，含 verifyBaseUrl 与 useMock
│   ├── app.json                         # 页面与 tabBar 配置
│   ├── pages/
│   │   ├── home/                        # 首页：二手闲置、校园服务、跑腿任务
│   │   ├── detail/                      # 商品详情、下单、收藏、聊天
│   │   ├── user/                        # 用户公开主页、信誉与评价
│   │   ├── service-detail/              # 服务/跑腿详情
│   │   ├── publish/                     # 发布二手、服务、跑腿
│   │   ├── orders/                      # 订单列表
│   │   ├── order-detail/                # 订单详情、支付、售后、投诉、评价
│   │   ├── services/                    # 服务/跑腿大厅
│   │   ├── chat/                        # 聊天列表与会话
│   │   ├── profile/                     # 我的、钱包、收藏、发布、后台入口
│   │   ├── verify/                      # 学校邮箱实名验证
│   │   └── admin/                       # 小程序内管理演示页
│   └── utils/
│       ├── api.js                       # 小程序 mock API、缓存、审核、业务流程
│       ├── mock.js                      # 演示数据
│       └── store.js                     # 登录态、实名态、当前用户状态
├── backend/                             # Node 邮箱验证码后端
│   ├── server.js                        # /api/status、/api/user/email-code、/api/user/verify
│   ├── encrypt-env.js                   # 加密 .env，生成 .env.enc 和 .env.key
│   ├── .env.example                     # 环境变量模板
│   ├── start-backend.ps1                # Windows 后台启动脚本
│   └── README.md                        # 后端专项说明
├── database/mysql/                      # MySQL 数据库设计与运维
│   ├── schema.sql                       # 建库、建表、约束、索引
│   ├── seed.sql                         # 基础演示数据
│   ├── seed_more.sql                    # 补充演示数据
│   ├── views_and_routines.sql           # 视图、触发器、统计过程、超时取消过程
│   ├── business_procedures.sql          # 下单、支付、收货、售后、跑腿抢单等事务过程
│   ├── security.sql                     # 角色、账号、最小权限
│   ├── ops_events.sql                   # MySQL Event 定时任务
│   ├── security_checks.sql              # 安全与对账检查
│   ├── verify.sql                       # 数据库验收查询
│   ├── scripts/                         # 备份、恢复、健康检查、定时任务脚本
│   └── README.md                        # 数据库专项说明
├── admin_web/                           # Python Flask 管理后台
│   ├── app.py                           # 后台路由、审核、仲裁、审计导出
│   ├── templates/                       # 后台页面模板
│   ├── static/admin.css                 # 后台样式
│   ├── requirements.txt                 # Flask、PyMySQL
│   ├── start-admin.bat                  # Windows 双击启动
│   ├── start-admin.ps1                  # PowerShell 启动
│   └── README.md                        # 管理后台专项说明
├── 数据流图ER图/                         # 导出的数据流图和 ER 图图片
├── 数据设计_规范版_assets/               # 数据设计报告图片与数据库截图
├── 校园二手交易平台_数据流图_黑白.drawio
├── 校园二手交易平台_标准ER图_Chen.drawio
├── 校园二手交易微信小程序平台_数据库设计说明书_规范版.docx
├── 需求文档.txt / 需求文档.docx
├── 概要设计.txt
├── 详细设计.txt
└── 演示清单.docx
```

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 小程序端 | 微信小程序原生 WXML、WXSS、JavaScript |
| 小程序数据层 | 本地 mock API、页面级缓存、统一状态 store |
| 邮箱验证后端 | Node.js HTTP 服务，使用 Node 内置 `http`、`net`、`tls`、`crypto` |
| 邮件发送 | SMTP，支持 QQ 邮箱、163 邮箱、学校邮箱等 SMTP 服务 |
| 数据库 | MySQL 8.0，含表、索引、视图、触发器、存储过程、Event、角色权限 |
| 管理后台 | Python、Flask、PyMySQL |
| 备份运维 | PowerShell、mysqldump、SHA-256 校验 |
| 文档图表 | draw.io、docx、txt、生成脚本 |

## 环境要求

建议使用 Windows 10/11，本项目目前的脚本和路径示例都按 Windows 编写。

必需环境：

- 微信开发者工具。
- Node.js 18 或更高版本。
- MySQL Server 8.0。
- Python 3.10 或更高版本。
- MySQL 命令行工具 `mysql.exe`、`mysqldump.exe`。

推荐工具：

- MySQL Workbench 或 Navicat，用于展示数据库表、视图、过程和备份结果。
- VS Code、Cursor 或其他编辑器。
- PowerShell 5+。

如果 MySQL 安装路径不是默认路径，需要在 `backend/.env` 中修改：

```text
MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe
```

## 快速运行小程序

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择本仓库根目录，例如：

```text
D:\大三下\软件工程
```

4. `project.config.json` 已配置：

```json
{
  "miniprogramRoot": "miniprogram/"
}
```

5. 如果使用自己的 AppID，请在微信开发者工具中替换；如果只本地预览，可使用测试号。
6. 为了本地请求 `http://127.0.0.1:3001`，需要在微信开发者工具中勾选：

```text
不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书
```

小程序全局配置在 [miniprogram/app.js](miniprogram/app.js)：

```js
globalData: {
  baseUrl: 'https://api.campus-trade.com/v1',
  verifyBaseUrl: 'http://127.0.0.1:3001',
  useMock: true
}
```

其中：

- `useMock: true` 表示业务演示默认使用小程序本地 mock 数据。
- `verifyBaseUrl` 是学校邮箱验证码后端地址。
- 如果后续接入完整后端，可把 `baseUrl` 改为真实业务 API 地址，并调整 `miniprogram/utils/api.js`。

## 小程序功能说明

### 首页

首页分为三个业务域：

- 二手闲置：教材资料、数码产品、生活用品、运动用品等。
- 校园服务：打印装订、资料整理、简历排版、学习辅导等可预约服务。
- 跑腿任务：取送物品、校内配送、帮取快递等可抢单任务。

首页不再放“演示入口”，而是按正式小程序的业务分类展示内容。

### 商品详情

商品详情支持：

- 查看商品标题、价格、成色、地点、卖家信息和审核说明。
- 收藏商品。
- 跳转卖家主页，查看信誉分、实名状态、交易评价、在售商品和服务。
- 下单生成订单。
- 支付后进入资金托管。
- 与卖家聊天沟通。

商品详情页不直接展示“商品评价”，评价归属于卖家或服务者主页，符合交易信用模型。

### 发布

发布页支持三类内容：

- 二手闲置。
- 校园服务。
- 跑腿订单。

发布时会校验：

- 是否登录。
- 是否完成实名认证。
- 标题、金额、描述是否完整。
- 金额是否大于 0 且不过高。
- 二手闲置是否填写交易地点。
- 跑腿订单是否填写取件地点和送达地点。
- 内容是否包含违禁词。

跑腿订单发布后会生成待支付订单，支付托管后才进入跑腿大厅，避免发布者不付款导致骑手白接单。

### 校园服务

校园服务支持：

- 查看服务详情。
- 查看服务者公开主页。
- 预约服务。
- 预约后生成待支付订单。
- 支付后服务费进入平台托管。
- 服务完成后确认并评价服务者。
- 预约前可与服务者聊天沟通。

### 跑腿任务

跑腿任务支持：

- 发布者发起任务并支付跑腿费。
- 任务进入跑腿大厅。
- 骑手抢单。
- 抢单时使用状态控制，避免重复接单。
- 骑手推进配送状态。
- 发布者确认完成后结算。
- 点错或异常情况可通过取消、售后或投诉处理。
- 发布者和骑手可以聊天沟通，聊天记录可作为售后证据。

### 订单

订单页统一展示：

- 二手闲置订单。
- 校园服务预约订单。
- 跑腿任务订单。

订单支持：

- 待支付。
- 已支付。
- 已发货/履约中。
- 已完成。
- 已取消。
- 售后中。
- 已退款。

订单详情中可以查看：

- 订单基础信息。
- 资金托管状态。
- 时间线进度。
- 售后进度。
- 聊天证据入口。
- 支付、取消、发货、确认完成、售后、投诉、评价等操作。

### 聊天

聊天模块包含：

- 聊天列表。
- 会话详情。
- 对方昵称与用户名展示。
- 交易对象、商品/服务/跑腿任务标题。
- 消息发送。
- 消息证据哈希展示。
- 违禁词拦截。

### 我的

个人中心包含：

- 登录/退出。
- 实名状态。
- 学校邮箱认证入口。
- 用户名、昵称、学院、信用分。
- 钱包余额。
- 充值、资金流水。
- 收藏列表。
- 我的发布。
- 我的订单。
- 骑手收益和提现。
- 管理员入口。

收藏、发布、钱包等模块按正式小程序样式组织，适合答辩时展开演示。

### 用户主页

用户主页展示：

- 昵称与用户名。
- 信誉分。
- 实名状态。
- 院系、校区、年级、响应速度。
- 个人简介和交易标签。
- 他人评价。
- 在售商品。
- 可预约服务。

交易评价集中在用户主页，强调“评价人而不是评价某个商品”的信誉体系。

### 实名认证

实名页使用学校邮箱验证码：

- 邮箱必须匹配 `@cau.edu.cn`。
- 发送验证码走真实后端接口 `/api/user/email-code`。
- 验证码 5 分钟有效。
- 提交认证走 `/api/user/verify`。
- 学号必须为 8 到 12 位数字。
- 姓名只能包含中文、英文和间隔点，长度 2 到 20。
- 验证通过后可发布、下单、预约、抢单和聊天。

## 启动邮箱验证码后端

后端目录：[backend](backend)

后端只负责真实邮箱验证码相关接口：

- `GET /api/status`
- `POST /api/user/email-code`
- `POST /api/user/verify`

### 配置环境变量

复制模板：

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

典型配置：

```text
PORT=3001

DB_HOST=127.0.0.1
DB_NAME=campus_trade
DB_USER=root
DB_PASSWORD=123456
MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe

CODE_SECRET=change-this-to-a-random-local-secret

SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_mail@qq.com
SMTP_PASS=your_smtp_authorization_code
SMTP_FROM=your_mail@qq.com
SMTP_FROM_NAME=校园二手交易平台
```

注意：

- QQ 邮箱的 `SMTP_PASS` 是 SMTP 授权码，不是 QQ 登录密码。
- 163 邮箱同理，也要开启 SMTP 服务并使用授权码。
- 如果学校邮箱提供 SMTP，也可以使用学校邮箱 SMTP。
- `CODE_SECRET` 应使用随机长字符串，避免验证码哈希被猜测。

### 启动后端

方式一，直接运行：

```powershell
cd backend
node server.js
```

方式二，使用脚本：

```powershell
cd backend
.\start-backend.ps1
```

检查状态：

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3001/api/status
```

浏览器访问也可以：

```text
http://127.0.0.1:3001/api/status
```

返回中应看到：

```json
{
  "code": 200,
  "data": {
    "smtpConfigured": true,
    "mysql": "campus_trade"
  }
}
```

如果 `smtpConfigured` 为 `false`，说明 SMTP 配置不完整。

### 加密敏感配置

`.env` 中包含邮箱授权码，不要分享给别人。配置完成后可加密：

```powershell
cd backend
node encrypt-env.js
```

脚本会生成：

- `backend/.env.enc`：加密配置，可以随代码保存。
- `backend/.env.key`：解密密钥，只能留在自己电脑上。

分享代码时可以给：

- `backend/server.js`
- `backend/encrypt-env.js`
- `backend/.env.example`
- `backend/.env.enc`

不要给：

- `backend/.env`
- `backend/.env.key`

如果别人只拿到 `.env.enc` 但没有 `.env.key` 或 `BACKEND_ENV_KEY`，不能使用你的 SMTP 授权码，也不能体验真实邮箱验证码。别人本地部署时应自己复制 `.env.example`，填写自己的 SMTP 账号和授权码。

## 初始化 MySQL 数据库

数据库目录：[database/mysql](database/mysql)

默认数据库名：

```text
campus_trade
```

默认本地示例密码：

```text
root / 123456
```

正式环境不要使用 root 作为应用账号，应使用 `security.sql` 中的最小权限账号。

### SQL 文件执行顺序

按下面顺序执行：

1. `schema.sql`
2. `seed.sql`
3. `seed_more.sql`
4. `views_and_routines.sql`
5. `business_procedures.sql`
6. `security.sql`
7. `ops_events.sql`
8. `verify.sql`
9. `security_checks.sql`

PowerShell 示例：

```powershell
$env:MYSQL_PWD = '123456'
$mysql = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe'
$root = 'D:\大三下\软件工程\database\mysql'

cmd.exe /c "`"$mysql`" -h 127.0.0.1 -P 3306 -u root --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 < `"$root\schema.sql`""
cmd.exe /c "`"$mysql`" -h 127.0.0.1 -P 3306 -u root --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 campus_trade < `"$root\seed.sql`""
cmd.exe /c "`"$mysql`" -h 127.0.0.1 -P 3306 -u root --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 campus_trade < `"$root\seed_more.sql`""
cmd.exe /c "`"$mysql`" -h 127.0.0.1 -P 3306 -u root --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 campus_trade < `"$root\views_and_routines.sql`""
cmd.exe /c "`"$mysql`" -h 127.0.0.1 -P 3306 -u root --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 campus_trade < `"$root\business_procedures.sql`""
cmd.exe /c "`"$mysql`" -h 127.0.0.1 -P 3306 -u root --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 campus_trade < `"$root\security.sql`""
cmd.exe /c "`"$mysql`" -h 127.0.0.1 -P 3306 -u root --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 campus_trade < `"$root\ops_events.sql`""
cmd.exe /c "`"$mysql`" -h 127.0.0.1 -P 3306 -u root --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 campus_trade < `"$root\verify.sql`""
cmd.exe /c "`"$mysql`" -h 127.0.0.1 -P 3306 -u root --protocol=TCP --default-character-set=utf8mb4 --binary-mode=1 campus_trade < `"$root\security_checks.sql`""

Remove-Item Env:\MYSQL_PWD
```

如果使用 MySQL Workbench，也可以按顺序打开这些 SQL 文件执行。

### 关键表

核心业务表包括：

- `users`：用户账号、用户名、角色、状态、信用分。
- `user_profiles`：公开主页资料。
- `user_verifications`：实名审核记录。
- `email_verification_codes`：学校邮箱验证码。
- `goods`：二手商品。
- `services`：校园服务。
- `errand_orders`：跑腿任务。
- `orders`：统一订单。
- `order_events`：订单时间线。
- `order_funds`：资金托管记录。
- `wallet_logs`：钱包流水。
- `refund_requests`：售后申请。
- `withdraw_requests`：提现申请。
- `conversations`、`messages`：聊天和证据链。
- `favorites`：收藏。
- `comments`：评价。
- `ai_audit_records`、`ai_rules`：AI 审核记录和规则。
- `admin_audit_logs`：管理员审计日志。
- `idempotency_keys`：幂等控制。
- `notifications`：通知。
- `stats_daily`：每日统计。

### 关键视图

常用视图包括：

- `v_goods_public_list`：首页二手闲置列表。
- `v_service_public_list`：校园服务列表。
- `v_errand_hall`：跑腿大厅。
- `v_admin_order_summary`：后台订单汇总。
- `v_order_trace`：订单追踪。
- `v_wallet_reconcile_source`：资金对账。
- `v_admin_refund_queue`：售后仲裁队列。
- `v_admin_pending_goods`：待审核商品。
- `v_chat_evidence_chain`：聊天证据链。
- `v_user_review_summary`：用户评价汇总。
- `v_user_public_profile`：公开用户主页。
- `v_user_wallet_summary`：钱包汇总。
- `v_user_notifications`：用户通知。

### 关键存储过程

业务事务过程包括：

- `sp_create_goods_order`：二手商品下单。
- `sp_pay_order`：订单支付和资金托管。
- `sp_ship_order`：发货或履约推进。
- `sp_confirm_receive`：确认收货和资金结算。
- `sp_apply_refund`：申请售后。
- `sp_arbitrate_refund`：售后仲裁。
- `sp_take_errand`：跑腿抢单，事务内控制并发。
- `sp_audit_withdraw`：提现审核。
- `sp_begin_idempotency`、`sp_finish_idempotency`：幂等请求控制。
- `sp_daily_stats`：每日统计。
- `sp_cancel_unpaid_orders`：超时未支付订单取消。

### 触发器与数据保护

数据库通过触发器限制关键证据数据被物理删除或随意修改：

- 钱包流水不可更新、不可删除。
- 管理员审计日志不可更新、不可删除。
- 订单事件不可更新、不可删除。
- 聊天消息不可删除，消息正文不可更新。

这部分可用于答辩时展示“交易证据链”和“审计可追溯”。

## 启动 Flask 管理后台

后台目录：[admin_web](admin_web)

后台连接 MySQL，用于处理：

- AI 判定为人工复核或疑似违规的商品内容。
- 售后、退款与纠纷仲裁。
- 校园实名认证人工审核。
- 用户封禁、解封与信用处理。
- AI 审核规则配置。
- 管理员审计日志查询与 CSV 导出。

### 安装依赖

```powershell
cd admin_web
python -m pip install -r requirements.txt
```

如需虚拟环境：

```powershell
cd admin_web
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

### 启动方式

方式一，双击或运行：

```text
admin_web\start-admin.bat
```

方式二，PowerShell：

```powershell
cd admin_web
.\start-admin.ps1
```

方式三，手动设置环境变量：

```powershell
cd admin_web
$env:ADMIN_DB_HOST="127.0.0.1"
$env:ADMIN_DB_USER="root"
$env:ADMIN_DB_PASSWORD="123456"
$env:ADMIN_DB_NAME="campus_trade"
$env:ADMIN_WEB_USERNAME="admin"
$env:ADMIN_WEB_PASSWORD="admin123"
$env:FLASK_PORT="5000"
python app.py
```

访问地址：

```text
http://127.0.0.1:5000
```

默认登录：

```text
admin / admin123
```

正式展示前建议用环境变量修改后台登录密码。

## 备份、恢复与健康检查

脚本目录：[database/mysql/scripts](database/mysql/scripts)

### 手动备份

```powershell
cd database\mysql
$env:MYSQL_PWD = '123456'
.\scripts\backup.ps1 -User root -RetentionDays 30
Remove-Item Env:\MYSQL_PWD
```

备份会输出到：

```text
database/mysql/backups/
```

每次备份会生成：

- `.sql` 全量备份文件。
- `.sha256` 校验文件。

### 恢复备份

恢复会覆盖数据库对象，只建议在测试库或演练环境执行：

```powershell
cd database\mysql
$env:MYSQL_PWD = '123456'
.\scripts\restore.ps1 -BackupFile .\backups\campus_trade-full-YYYYMMDD_HHMMSS.sql -User root -ConfirmRestore
Remove-Item Env:\MYSQL_PWD
```

### 健康检查

```powershell
cd database\mysql
$env:MYSQL_PWD = '123456'
.\scripts\healthcheck.ps1 -User root
Remove-Item Env:\MYSQL_PWD
```

检查内容包括：

- MySQL 版本。
- 表、视图、过程、触发器、Event 数量。
- 最新备份文件。
- 资金对账异常。
- 过期幂等锁。

### 定时备份

先预览：

```powershell
cd database\mysql
.\scripts\install_backup_task.ps1
```

确认后注册 Windows 计划任务：

```powershell
cd database\mysql
.\scripts\install_backup_task.ps1 -Register
```

默认创建每天 02:00 的全量备份计划任务。

## 安全设计

本项目包含多层安全控制，适合在答辩中重点展示。

### 用户与实名

- 登录后才可进入交易操作。
- 未实名不能发布、下单、预约、抢单、聊天。
- 学校邮箱必须为 `@cau.edu.cn`。
- 验证码真实发送到邮箱。
- 验证码有有效期和状态。
- 学号和姓名有格式校验。
- 后端再次校验学校邮箱、验证码、学号、姓名，避免只依赖前端。

### 内容安全

小程序和 mock API 都包含违禁词拦截，例如：

```text
违禁、违规、危险品、仿冒、代考、作弊、校园贷、网贷、烟草、酒精、管制刀具、毒品、枪支、诈骗、套现
```

覆盖场景：

- 二手商品发布。
- 校园服务发布。
- 跑腿任务发布。
- 聊天消息。
- 评价。
- 售后说明。
- 投诉说明。

AI 审核规则和人工复核队列可在管理后台展示和处理。

### 资金安全

- 支付后资金进入平台托管。
- 服务/跑腿未完成前可取消或售后。
- 确认完成后资金结算。
- 售后期间资金继续冻结。
- 仲裁通过数据库事务同步处理订单、资金、流水和审计日志。
- 钱包流水不可物理删除或修改。

### 并发与幂等

数据库设计中包含：

- `idempotency_keys` 表。
- `sp_begin_idempotency`、`sp_finish_idempotency`。
- 跑腿抢单过程 `sp_take_errand`。
- 订单支付、收货、退款过程均按事务设计。

用于解决：

- 重复点击支付。
- 重复提交订单。
- 多个骑手同时抢同一个跑腿任务。
- 网络重试导致的重复写入。

### 审计与追溯

后台关键操作写入 `admin_audit_logs`：

- 商品审核。
- 实名审核。
- 用户封禁/解封。
- 售后仲裁。
- 提现审核。
- AI 审核规则变更。

聊天记录、订单事件、钱包流水均保留证据链。

### 配置安全

- `.env` 不应提交或分享。
- `.env.key` 不应提交或分享。
- `.env.enc` 可保存，但没有密钥无法解密。
- 小程序端不保存数据库密码、SMTP 授权码、微信 AppSecret 或 AI Key。
- 生产环境应使用 HTTPS、正式域名和最小权限数据库账号。

## 演示路线建议

建议演示顺序：

1. 首页浏览二手闲置、校园服务、跑腿任务。
2. 进入商品详情，查看卖家主页、信誉分和评价。
3. 收藏商品，回到“我的”查看收藏。
4. 未实名尝试发布或下单，展示实名拦截。
5. 学校邮箱实名认证，展示错误邮箱、错误验证码和正确验证码。
6. 发布二手闲置，输入违禁词展示拒绝，再输入正常内容发布成功。
7. 下单商品，支付，查看订单详情和资金托管时间线。
8. 打开聊天列表，发送正常消息，再发送违禁词消息展示拦截。
9. 预约校园服务，查看服务者主页，支付后进入订单。
10. 发布跑腿任务，支付后进入跑腿大厅。
11. 切换或使用骑手角色抢单，查看订单进度变化。
12. 发起售后，输入过短说明或违禁词展示拦截，再提交正常售后。
13. 打开 Flask 管理后台，处理 AI 审核、售后仲裁、实名审核和用户状态。
14. 展示 MySQL 表、视图、存储过程、触发器和备份文件。
15. 运行备份或健康检查脚本，展示安全性和备份性。

## 错误输入验证清单

### 实名认证

- 邮箱填 `test@qq.com`：提示必须使用 `@cau.edu.cn`。
- 学号填 `abc123`：提示学号必须为数字。
- 学号填 `1234567`：提示长度不符合要求。
- 姓名填 `张三123`：提示姓名格式不正确。
- 验证码填 `123`：提示验证码应为 6 位数字。
- 验证码填错误 6 位数：后端提示验证码错误。

### 发布

- 不填标题、金额或描述：提示补全信息。
- 金额填 `0` 或负数：提示金额必须大于 0。
- 金额填 `10000`：提示金额过高。
- 二手闲置不填交易地点：提示填写交易地点。
- 跑腿任务不填取件或送达地点：提示补全地点。
- 标题或描述输入 `代考`、`校园贷`、`管制刀具`、`诈骗`：提示包含违禁词。

### 聊天、评价、售后

- 空聊天消息：提示请输入消息。
- 聊天输入 `校园贷`：提示消息包含违禁词。
- 空评价：提示请输入评价内容。
- 评价输入 `诈骗`：提示评价内容包含违禁词。
- 售后原因只填两个字：提示至少填写 6 个字说明。
- 投诉说明包含违禁词：提示投诉说明包含违禁词。

### 钱包与订单

- 充值 `0` 或负数：提示有效充值金额。
- 提现 `0` 或负数：提示有效提现金额。
- 余额不足时支付：提示余额不足。
- 已被抢单的跑腿任务重复抢单：提示状态异常或已被接单。

## 开发与检查命令

### 小程序脚本语法检查

```powershell
node --check miniprogram\utils\api.js
node --check miniprogram\pages\publish\publish.js
node --check miniprogram\pages\verify\verify.js
node --check miniprogram\pages\order-detail\order-detail.js
node --check miniprogram\pages\orders\orders.js
node --check miniprogram\pages\chat\chat.js
node --check miniprogram\pages\services\services.js
```

### 后端语法检查

```powershell
node --check backend\server.js
```

### 邮箱验证码接口检查

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3001/api/status
```

### 数据库验收

```powershell
cd database\mysql
$env:MYSQL_PWD = '123456'
$mysql = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe'
cmd.exe /c "`"$mysql`" -h 127.0.0.1 -P 3306 -u root --protocol=TCP --default-character-set=utf8mb4 campus_trade < verify.sql"
cmd.exe /c "`"$mysql`" -h 127.0.0.1 -P 3306 -u root --protocol=TCP --default-character-set=utf8mb4 campus_trade < security_checks.sql"
Remove-Item Env:\MYSQL_PWD
```

## 常见问题

### 小程序请求 `127.0.0.1:3001` 失败

现象：

```text
POST http://127.0.0.1:3001/api/user/email-code net::ERR_CONNECTION_REFUSED
```

处理：

1. 确认后端已启动。
2. 访问 `http://127.0.0.1:3001/api/status`。
3. 确认端口是 `3001`。
4. 微信开发者工具勾选“不校验合法域名、TLS 版本以及 HTTPS 证书”。

### 微信开发者工具提示合法域名问题

本地开发时使用 `http://127.0.0.1:3001`，不是 HTTPS 域名。开发者工具需要关闭域名校验。正式上线时应部署到 HTTPS 域名，并在小程序后台配置 request 合法域名。

### 收不到验证码邮件

检查：

- `backend/.env` 中 SMTP 配置是否完整。
- `SMTP_PASS` 是否是授权码，而不是邮箱登录密码。
- QQ 邮箱或 163 邮箱是否已开启 SMTP 服务。
- 邮件是否进入垃圾箱。
- `SMTP_FROM` 是否与 `SMTP_USER` 一致或被邮件服务允许。
- 后端状态接口中 `smtpConfigured` 是否为 `true`。

### MySQL 连接失败

检查：

- MySQL 服务是否启动。
- 端口是否为 `3306`。
- 用户名和密码是否正确。
- `campus_trade` 数据库是否已经初始化。
- `MYSQL_BIN` 路径是否正确。
- 如果用的是 `127.0.0.1`，确认对应账号允许从 `127.0.0.1` 登录。

### Flask 后台缺少模块

如果看到 `ModuleNotFoundError: No module named 'flask'` 或 `pymysql`，执行：

```powershell
cd admin_web
python -m pip install -r requirements.txt
```

### 双击 `.ps1` 变成选择应用

Windows 默认可能不会双击执行 PowerShell 脚本。建议打开 PowerShell 后运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\backend\start-backend.ps1
```

或：

```powershell
powershell -ExecutionPolicy Bypass -File .\admin_web\start-admin.ps1
```

### 小程序卡顿或跳转慢

建议：

- 重新编译小程序。
- 清除微信开发者工具缓存。
- 保持 `useMock: true` 进行课堂演示。
- 避免连续快速点击详情、主页、聊天等跳转按钮。
- 确认没有反复触发实名认证页面；只有发布、下单、预约、抢单、聊天等正式操作才需要实名。

## 交付文档

项目根目录包含课程交付材料：

- [需求文档.txt](需求文档.txt)
- [需求文档.docx](需求文档.docx)
- [概要设计.txt](概要设计.txt)
- [详细设计.txt](详细设计.txt)
- [数据设计.txt](数据设计.txt)
- [校园二手交易微信小程序平台_数据库设计说明书_规范版.docx](校园二手交易微信小程序平台_数据库设计说明书_规范版.docx)
- [校园二手交易平台_数据流图_黑白.drawio](校园二手交易平台_数据流图_黑白.drawio)
- [校园二手交易平台_标准ER图_Chen.drawio](校园二手交易平台_标准ER图_Chen.drawio)
- [演示清单.docx](演示清单.docx)
- [小程序演示.docx](小程序演示.docx)

图片资产位于：

- [数据流图ER图](数据流图ER图)
- [数据设计_规范版_assets](数据设计_规范版_assets)

## 分享与提交注意事项

可以分享：

- 小程序源码。
- 数据库 SQL。
- 管理后台源码。
- `backend/.env.example`。
- `backend/.env.enc`。
- 需求、设计、演示文档。

不要分享：

- `backend/.env`
- `backend/.env.key`
- 邮箱 SMTP 授权码。
- 数据库生产密码。
- 微信 AppSecret。
- 真实 AI Key。
- 真实用户隐私数据。

如果别人想完整体验邮箱验证码，应让对方自己配置 SMTP 授权码，或在安全场景下临时提供 `BACKEND_ENV_KEY`。不建议把自己的 `.env.key` 发给别人。

## 后续可扩展方向

如果继续完善为真实线上系统，建议按以下方向推进：

1. 将小程序 mock API 替换为完整 Node/Python/Java 后端业务 API。
2. 接入微信登录和服务端 session/token 校验。
3. 接入真实微信支付或校园内部支付沙箱。
4. 将学校邮箱验证升级为统一身份认证或学校 OAuth。
5. 接入真正的 AI 内容审核服务，并保留人工复核兜底。
6. 使用对象存储保存商品图片、售后凭证和头像。
7. 使用 HTTPS 域名，配置小程序 request 合法域名。
8. 用 Redis 或数据库实现验证码限流和接口限流。
9. 将管理后台账号改为数据库管理员表和密码哈希。
10. 将数据库备份上传到异地存储，并定期恢复演练。

## 项目状态

当前版本适合课程答辩和本地演示：

- 小程序主要交易流程已可演示。
- 邮箱验证码后端可真实发送验证码。
- MySQL 数据库对象、权限、安全、备份和健康检查已落地。
- Flask 管理后台可连接 MySQL 处理审核、售后、实名和用户治理。
- 数据流图、ER 图和数据库设计报告已生成。

正式上线前仍需完成完整服务端业务 API、生产级支付、线上域名 HTTPS、真实身份认证、日志监控和安全加固。
