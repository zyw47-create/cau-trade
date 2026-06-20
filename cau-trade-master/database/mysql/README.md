# 校园二手交易平台 MySQL 数据库

本目录把小程序需求落到 MySQL 8.0，可作为后端 API 的真实持久层。小程序端不要直连 MySQL，仍然通过 `/api/...` 请求后端；数据库账号、微信 AppSecret、AI Key 等密钥只放在服务端配置或环境变量里。

## 文件说明

- `schema.sql`：建库、建表、主键、外键、索引、枚举约束；用户表包含唯一 `username`，用于小程序展示 `@用户名`。
- `seed.sql`：基础业务数据，覆盖用户、商品、服务、跑腿、订单、资金、聊天、审核、提现和统计。
- `seed_more.sql`：补充业务数据，增加收藏、个人发布、完成订单、评价、聊天和资金流水，可重复执行。
- `views_and_routines.sql`：前后台常用视图、资金/证据链保护触发器、统计与超时取消过程。
- `business_procedures.sql`：幂等键、下单、支付、发货、收货、退款仲裁、跑腿接单、提现审核等事务过程。
- `security.sql`：MySQL 角色、最小权限账号和安全初始化审计日志。
- `ops_events.sql`：每日统计、超时订单取消的 MySQL Event，默认创建为 `DISABLED`。
- `security_checks.sql`：账号、权限、触发器、资金对账和待处理敏感事项检查。
- `verify.sql`：基础对象和验收数据校验查询。
- `scripts/backup.ps1`：全量备份脚本，生成 `.sql` 和 `.sha256`。
- `scripts/restore.ps1`：备份恢复脚本，必须显式加 `-ConfirmRestore`。
- `scripts/healthcheck.ps1`：数据库对象、异常对账和最新备份检查。
- `scripts/install_backup_task.ps1`：Windows 每日备份计划任务安装脚本，默认只预览。
- `backups/`：本地备份输出目录，已通过 `.gitignore` 排除备份文件。

## 初始化顺序

在 Windows PowerShell 里，`<` 重定向不直接适用于外部程序。建议使用 `cmd.exe /c` 或直接在 MySQL Workbench 中依次执行。

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

反复重置业务数据时也按这个顺序执行。`seed.sql` 会先移除不可变流水/证据链触发器，最后通过 `views_and_routines.sql` 重新启用。

## 安全账号

`security.sql` 会创建本地验收账号和角色，每个账号都包含 `localhost` 和 `127.0.0.1` 两种本机连接来源：

- `campus_app`：后端应用账号，可读视图/表、写业务输入表、执行交易过程；无建表、删库、改表权限。
- `campus_readonly`：只读验收、统计看板、教师检查账号。
- `campus_backup`：备份账号，可读数据、视图、触发器和事件。
- `campus_ops`：运维账号，可执行健康检查、每日统计和超时取消过程。
- `campus_migration`：迁移账号，权限较宽但只限 `campus_trade` 库。

本地初始密码在 `security.sql` 中以 `ChangeMe` 标注，正式环境必须执行 `ALTER USER ... IDENTIFIED BY ...` 轮换；生产库禁止使用 `root` 作为应用连接账号。

## 备份与恢复

手动全量备份：

```powershell
$env:MYSQL_PWD = '123456'
.\scripts\backup.ps1 -User root -RetentionDays 30
Remove-Item Env:\MYSQL_PWD
```

备份文件输出到 `database/mysql/backups`，同时生成 SHA-256 校验文件。脚本使用 `--single-transaction` 和 `--no-tablespaces`，既避免锁表影响业务，也避免给备份账号授予过大的 `PROCESS` 权限。脚本会拒绝 0 字节备份文件，默认保留 30 天，符合需求文档“每日全量备份保留 30 天”。

恢复演练前先确认备份文件，再显式加确认参数：

```powershell
$env:MYSQL_PWD = '123456'
.\scripts\restore.ps1 -BackupFile .\backups\campus_trade-full-YYYYMMDD_HHMMSS.sql -User root -ConfirmRestore
Remove-Item Env:\MYSQL_PWD
```

恢复会覆盖数据库对象，只建议在测试库或演练环境执行。正式生产恢复应先停应用写入、保留当前故障现场备份，再恢复。

## 定时备份

推荐先用 `mysql_config_editor` 保存备份账号凭据，避免计划任务命令里出现明文密码：

```powershell
mysql_config_editor set --login-path=campus_backup --host=127.0.0.1 --user=campus_backup --password
.\scripts\install_backup_task.ps1
.\scripts\install_backup_task.ps1 -Register
```

脚本默认创建每天 02:00 的 Windows 计划任务，对应需求文档里的每日自动全量备份。

## 健康检查

```powershell
$env:MYSQL_PWD = '123456'
.\scripts\healthcheck.ps1 -User root
Remove-Item Env:\MYSQL_PWD
```

检查内容包括 MySQL 版本、表/视图/过程/触发器/Event 数量、资金对账异常、过期幂等锁和最新备份文件。安全专项可执行：

```powershell
cmd.exe /c "`"$mysql`" -h 127.0.0.1 -P 3306 -u root --protocol=TCP --default-character-set=utf8mb4 campus_trade < `"$root\security_checks.sql`""
```

## 维护事件

`ops_events.sql` 创建两个禁用事件：

- `ev_campus_daily_stats`：每天生成昨日统计。
- `ev_campus_cancel_unpaid_orders`：每 10 分钟取消 30 分钟前未支付订单。

确认上线后再启用：

```sql
SET GLOBAL event_scheduler = ON;
ALTER EVENT ev_campus_daily_stats ENABLE;
ALTER EVENT ev_campus_cancel_unpaid_orders ENABLE;
```

## 后端接入映射

- `/api/goods/list` -> `v_goods_public_list`，首页“二手闲置”
- `/api/service/list` -> `v_service_public_list` + `v_errand_hall`，首页“校园服务/跑腿任务”
- `/api/user/public` -> `v_user_public_profile` + `comments` + 用户在售商品/服务，用于个人主页
- `/api/order/list` -> `v_admin_order_summary` 按买家或卖家过滤
- `/api/admin/orders/refunding` -> `v_admin_refund_queue`
- `/api/account/logs` -> `wallet_logs`
- `/api/chat/messages` -> `conversations` + `messages`
- `/api/admin/stats` -> `stats_daily` 或 `CALL sp_daily_stats(?)`
- `/api/admin/reconcile` 或运维任务 -> `CALL sp_wallet_reconcile(?)`
- `/api/notifications` -> `v_user_notifications`

核心写接口建议调用事务过程：

- 幂等开始：`CALL sp_begin_idempotency(?, ?, ?, ?, ?, @state, @code, @body)`
- 幂等结束：`CALL sp_finish_idempotency(?, ?, ?, ?, ?)`
- 下单：`CALL sp_create_goods_order(?, ?, ?, ?)`
- 支付：`CALL sp_pay_order(?, ?)`
- 发货：`CALL sp_ship_order(?, ?)`
- 确认收货：`CALL sp_confirm_receive(?, ?)`
- 申请售后：`CALL sp_apply_refund(?, ?, ?, ?)`
- 仲裁：`CALL sp_arbitrate_refund(?, ?, ?, ?)`
- 跑腿接单：`CALL sp_take_errand(?, ?)`，事务内完成行级锁抢单、跑腿状态更新、复用已支付托管订单；若历史数据缺少订单，则兜底生成订单、资金托管记录与订单事件
- 提现审核：`CALL sp_audit_withdraw(?, ?, ?, ?)`

## 合规说明

- 敏感字段 `student_id_enc`、`real_name_enc`、`phone_enc` 在本地验收数据中是占位值，生产环境应由后端用 AES-256-GCM 等算法加密后入库，展示时只返回脱敏 DTO。
- 密码、Token、微信 AppSecret、AI Key 不进入小程序代码和 SQL 文件，不进入日志。
- 资金流水、聊天证据链、订单事件、管理员审计日志通过触发器限制物理删除和关键内容更新。
- 小程序公开详情只返回昵称、头像、信用分等非敏感信息，实名信息只在审核/仲裁授权场景下通过后台接口读取。
