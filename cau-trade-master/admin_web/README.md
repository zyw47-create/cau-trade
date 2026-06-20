# 校园交易管理后台（Flask）

这个后台直接连接 `campus_trade` MySQL 数据库，用于处理：

- AI 判定为人工复核或疑似违规的商品内容；
- 售后、退款与纠纷仲裁；
- 校园实名认证人工审核；
- 用户封禁、解封与信用处理；
- AI 审核规则配置；
- 管理员审计日志查询与 CSV 导出。

## 启动

推荐直接双击或运行批处理脚本：

```text
D:\大三下\软件工程\admin_web\start-admin.bat
```

如果要在 PowerShell 里运行，也可以使用：

```powershell
cd D:\大三下\软件工程\admin_web
.\start-admin.ps1
```

也可以手动启动：

```powershell
cd D:\大三下\软件工程\admin_web
$env:ADMIN_DB_HOST="127.0.0.1"
$env:ADMIN_DB_USER="root"
$env:ADMIN_DB_PASSWORD="123456"
$env:ADMIN_DB_NAME="campus_trade"
$env:ADMIN_WEB_USERNAME="admin"
$env:ADMIN_WEB_PASSWORD="admin123"
python app.py
```

浏览器访问：

```text
http://127.0.0.1:5000
```

默认登录账号是 `admin / admin123`，正式展示前建议用环境变量改成自己的密码。

## 数据库事务说明

售后仲裁按钮会调用 `sp_arbitrate_refund` 存储过程，由数据库在同一事务里处理订单状态、托管资金、资金流水、订单事件和管理员审计日志。商品审核、实名审核、用户治理、AI 规则变更也会写入 `admin_audit_logs`，方便答辩时展示“操作可追溯”。
