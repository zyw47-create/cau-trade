# -*- coding: utf-8 -*-
from __future__ import annotations

import hashlib
import json
import os
import sys
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path

try:
    import pymysql
except ImportError as exc:
    raise SystemExit("缺少 pymysql，请先在当前 Python 环境执行：pip install pymysql") from exc


ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / "admin_web" / ".env.local"
NOW = datetime(2026, 6, 24, 9, 0, 0)

ORDER_STATUSES = [
    "unpaid",
    "paid",
    "confirmed",
    "shipped",
    "completed",
    "refunding",
    "refunded",
    "cancelled",
    "disputed",
]
ITEM_TYPES = ["goods", "service", "errand"]

STATUS_CODE = {
    "unpaid": "UP",
    "paid": "PA",
    "confirmed": "CF",
    "shipped": "SH",
    "completed": "CO",
    "refunding": "RI",
    "refunded": "RO",
    "cancelled": "CA",
    "disputed": "DI",
}

TYPE_CODE = {"goods": "GD", "service": "SV", "errand": "ER"}

GOOD_STATUS_LABELS = {
    "pending": "待审核",
    "on_sale": "在售",
    "rejected": "审核未通过",
    "reserved": "已预留",
    "sold": "已售出",
    "removed": "已下架",
}

SERVICE_STATUS_LABELS = {
    "pending": "待审核",
    "on_sale": "可预约",
    "paused": "暂停预约",
    "removed": "已下架",
}

ERRAND_STATUS_LABELS = {
    "unpaid": "待支付",
    "waiting_accept": "待接单",
    "accepted": "已接单",
    "processing": "配送中",
    "completed": "待确认",
    "confirmed": "已完成",
    "cancelled": "已取消",
    "disputed": "处理中",
}

ORDER_STATUS_LABELS = {
    "unpaid": "待支付",
    "paid": "待确认",
    "confirmed": "已确认",
    "shipped": "进行中",
    "completed": "已完成",
    "refunding": "售后中",
    "refunded": "已退款",
    "cancelled": "已取消",
    "disputed": "投诉处理中",
}

GOODS_IMAGES = [
    "probability-notes.jpg",
    "math-book.jpg",
    "calculator.jpg",
    "cet-headset.jpg",
    "desk-lamp.jpg",
    "keyboard.jpg",
    "typec-hub.jpg",
    "storage-box.jpg",
    "bed-table.jpg",
    "clothes-rack.jpg",
    "badminton.jpg",
    "yoga-mat.jpg",
    "guitar.jpg",
    "postgrad-politics.jpg",
    "formula-sheet.jpg",
    "study-notes.jpg",
    "accessory-box.jpg",
    "battery-set.jpg",
]

GOODS_TITLES = [
    "概率论复习讲义",
    "高等数学同步习题册",
    "数据结构考研笔记",
    "卡西欧函数计算器",
    "英语四级听力耳机",
    "宿舍护眼台灯",
    "无线办公键盘",
    "静音蓝牙鼠标",
    "Type-C 扩展坞",
    "桌面收纳盒",
    "宿舍折叠桌",
    "阳台晾衣架",
    "羽毛球拍套装",
    "瑜伽垫",
    "入门民谣吉他",
    "考研政治资料",
    "线性代数公式卡",
    "专业课课堂笔记",
    "耳机收纳包",
    "相机备用电池",
]

SERVICE_TITLES = [
    "简历排版优化",
    "课程资料整理",
    "实验报告格式检查",
    "PPT 美化排版",
    "英文摘要润色",
    "高数答疑预约",
    "程序调试协助",
    "海报设计修改",
    "文献检索指导",
    "摄影后期修图",
    "社团推文排版",
    "面试模拟陪练",
    "竞赛资料归档",
    "学习计划制定",
    "四六级听力陪练",
    "课程表整理",
    "文档转格式",
    "论文引用检查",
    "问卷数据清洗",
    "课堂录音整理",
]

ERRAND_TITLES = [
    "图书馆取资料",
    "东区快递代取",
    "实验楼送文件",
    "食堂餐品代拿",
    "学院楼取盖章材料",
    "体育馆送球拍",
    "南门取打印件",
    "宿舍楼送钥匙",
    "校医院取报告",
    "北区送雨伞",
    "教学楼递交报名表",
    "快递柜取教材",
    "机房送硬盘",
    "活动中心取物资",
    "图书馆还书",
    "南区取洗衣袋",
    "东门拿文件袋",
    "信工楼送充电器",
    "校门口取证件",
    "西区送实验服",
]


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    if ENV_FILE.exists():
        for raw_line in ENV_FILE.read_text(encoding="utf-8-sig").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip('"').strip("'")
    for key, value in os.environ.items():
        env.setdefault(key, value)
    return env


def db_connect():
    env = load_env()
    return pymysql.connect(
        host=env.get("ADMIN_DB_HOST", "127.0.0.1"),
        port=int(env.get("ADMIN_DB_PORT", "3306")),
        user=env.get("ADMIN_DB_USER", "campus_app"),
        password=env.get("ADMIN_DB_PASSWORD", ""),
        database=env.get("ADMIN_DB_NAME", "campus_trade"),
        charset="utf8mb4",
        autocommit=False,
        cursorclass=pymysql.cursors.DictCursor,
    )


def dumps(value) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def image(name: str) -> str:
    return f"/uploads/goods/{name}"


def dt(minutes: int) -> datetime:
    return NOW + timedelta(minutes=minutes)


def one(cur, sql: str, params=()):
    cur.execute(sql, params)
    return cur.fetchone()


def execute(cur, sql: str, params=()):
    cur.execute(sql, params)


def ensure_categories(cur) -> None:
    required = {
        "goods": ["课程资料", "电子配件", "寝室用品", "运动乐器", "教材资料", "数码产品"],
        "service": ["学业辅导", "文档设计", "校园互助", "校园服务"],
        "errand": ["同城跑腿", "资料递送", "生活代办", "跑腿配送"],
    }
    found: dict[str, list[int]] = {"goods": [], "service": [], "errand": []}
    for category_type, names in required.items():
        cur.execute(
            """
            SELECT id
            FROM categories
            WHERE type=%s AND status='active'
              AND name IN ({})
            ORDER BY sort_order, id
            """.format(",".join(["%s"] * len(names))),
            (category_type, *names),
        )
        found[category_type] = [int(row["id"]) for row in cur.fetchall()]
    missing = [key for key, values in found.items() if not values]
    if missing:
        raise RuntimeError(f"缺少基础分类：{', '.join(missing)}。请先运行 reset-seed-data.bat 初始化基础数据。")
    return found


def ensure_user(cur, user_id: int, openid: str, username: str, nickname: str, role: str, balance: Decimal) -> None:
    execute(
        cur,
        """
        INSERT INTO users (
          id, openid, student_id_enc, real_name_enc, college, nickname, username, avatar_url,
          phone_enc, address, role, status, is_verified, credit_score, balance, frozen_balance,
          created_at, updated_at
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'active',1,%s,%s,0,%s,%s)
        ON DUPLICATE KEY UPDATE
          nickname=VALUES(nickname),
          avatar_url=VALUES(avatar_url),
          phone_enc=VALUES(phone_enc),
          address=VALUES(address),
          role=VALUES(role),
          status='active',
          is_verified=1,
          credit_score=VALUES(credit_score),
          balance=GREATEST(balance, VALUES(balance)),
          updated_at=VALUES(updated_at)
        """,
        (
            user_id,
            openid,
            f"sha256:student:{user_id}",
            f"sha256:name:{user_id}",
            "信息与电气工程学院",
            nickname,
            username,
            f"/uploads/avatar/{user_id}.png",
            f"sha256:phone:{user_id}",
            "中国农业大学东校区",
            role,
            92 + (user_id % 9),
            balance,
            dt(user_id),
            dt(user_id),
        ),
    )
    execute(
        cur,
        """
        INSERT INTO user_profiles (
          user_id, campus_area, major, grade_label, bio, response_time_minutes,
          last_active_at, trade_tags, completed_trade_count, good_rate_snapshot,
          created_at, updated_at
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON DUPLICATE KEY UPDATE
          campus_area=VALUES(campus_area),
          major=VALUES(major),
          grade_label=VALUES(grade_label),
          bio=VALUES(bio),
          response_time_minutes=VALUES(response_time_minutes),
          last_active_at=VALUES(last_active_at),
          trade_tags=VALUES(trade_tags),
          completed_trade_count=VALUES(completed_trade_count),
          good_rate_snapshot=VALUES(good_rate_snapshot),
          updated_at=VALUES(updated_at)
        """,
        (
            user_id,
            "东校区",
            "软件工程",
            "2023 级",
            "诚信交易，课余时间响应校园订单。",
            8 + (user_id % 12),
            dt(500 + user_id),
            dumps(["二手交易", "校园跑腿", "学习互助"]),
            18 + user_id % 17,
            Decimal("98.00"),
            dt(user_id),
            dt(700 + user_id),
        ),
    )


def find_current_user(cur) -> int:
    row = one(cur, "SELECT id FROM users WHERE id = 100 AND status <> 'removed' LIMIT 1")
    if row:
        return int(row["id"])
    row = one(
        cur,
        """
        SELECT id
        FROM users
        WHERE status <> 'removed'
          AND openid NOT LIKE 'mock-%'
          AND openid NOT LIKE 'codex-%'
        ORDER BY id DESC
        LIMIT 1
        """,
    )
    if row:
        return int(row["id"])
    return 1


def ensure_users(cur, current_user_id: int) -> None:
    seeded_users = [
        (1, "mock-openid-001", "campus_user", "校园同学", "user", Decimal("160.00")),
        (2, "mock-openid-002", "math_chen", "数院同学", "user", Decimal("130.00")),
        (3, "mock-openid-003", "se_luo", "软件工程同学", "user", Decimal("145.00")),
        (5, "mock-openid-005", "print_station", "文印小站", "provider", Decimal("260.00")),
        (6, "mock-openid-006", "runner_zhao", "跑腿同学", "rider", Decimal("210.00")),
        (7, "mock-openid-007", "info_wang", "信工同学", "provider", Decimal("188.00")),
        (8, "mock-openid-008", "english_lin", "外语学院同学", "user", Decimal("126.00")),
        (9, "mock-openid-009", "north_helper", "北区服务号", "provider", Decimal("310.00")),
        (10, "mock-openid-010", "bio_sun", "生院同学", "user", Decimal("118.00")),
        (99, "mock-openid-admin", "admin_ops", "平台管理员", "admin", Decimal("0.00")),
        (201, "seed-official-201", "xinyi_li", "信仪同学", "user", Decimal("96.00")),
        (202, "seed-official-202", "north_runner", "北区骑手", "rider", Decimal("172.00")),
        (203, "seed-official-203", "layout_liu", "排版同学", "provider", Decimal("238.00")),
        (204, "seed-official-204", "library_zhou", "图书馆同学", "user", Decimal("84.00")),
        (205, "seed-official-205", "sport_han", "体育馆同学", "user", Decimal("111.00")),
    ]
    for args in seeded_users:
        ensure_user(cur, *args)

    if current_user_id not in {1, 2, 3, 5, 6, 7, 8, 9, 10, 99, 201, 202, 203, 204, 205}:
        execute(
            cur,
            """
            UPDATE users
            SET nickname = COALESCE(NULLIF(nickname, ''), '大鱼'),
                avatar_url = COALESCE(avatar_url, '/uploads/avatar/100.png'),
                phone_enc = COALESCE(phone_enc, 'sha256:phone:current'),
                address = COALESCE(address, '中国农业大学东校区学生公寓'),
                role = 'rider',
                status = 'active',
                is_verified = 1,
                credit_score = GREATEST(credit_score, 98),
                balance = GREATEST(balance, 520.00),
                frozen_balance = GREATEST(frozen_balance, 0.00),
                updated_at = %s
            WHERE id = %s
            """,
            (dt(900), current_user_id),
        )
        execute(
            cur,
            """
            INSERT INTO user_profiles (
              user_id, campus_area, major, grade_label, bio, response_time_minutes,
              last_active_at, trade_tags, completed_trade_count, good_rate_snapshot,
              created_at, updated_at
            )
            VALUES (%s,'东校区','软件工程','2023 级','已完成校园认证，可发布商品、预约服务和承接跑腿。',6,%s,%s,36,99.00,%s,%s)
            ON DUPLICATE KEY UPDATE
              campus_area=VALUES(campus_area),
              major=VALUES(major),
              grade_label=VALUES(grade_label),
              bio=VALUES(bio),
              response_time_minutes=VALUES(response_time_minutes),
              last_active_at=VALUES(last_active_at),
              trade_tags=VALUES(trade_tags),
              completed_trade_count=VALUES(completed_trade_count),
              good_rate_snapshot=VALUES(good_rate_snapshot),
              updated_at=VALUES(updated_at)
            """,
            (
                current_user_id,
                dt(980),
                dumps(["教材资料", "跑腿接单", "诚信交易"]),
                dt(100),
                dt(980),
            ),
        )


def upsert_goods(cur, current_user_id: int, category_ids: dict[str, list[int]]) -> dict[tuple[str, int], int]:
    statuses = ["pending", "on_sale", "rejected", "reserved", "sold", "removed"]
    goods_by_status: dict[tuple[str, int], int] = {}
    sellers = [current_user_id, 2, 3, 7, 8]
    goods_category_ids = category_ids["goods"]
    idx = 0
    for status in statuses:
        for n in range(1, 6):
            goods_id = 9000 + idx + 1
            title = GOODS_TITLES[idx % len(GOODS_TITLES)]
            seller_id = sellers[(idx + n) % len(sellers)]
            img = image(GOODS_IMAGES[idx % len(GOODS_IMAGES)])
            execute(
                cur,
                """
                INSERT INTO goods (
                  id, seller_id, category_id, title, price, condition_level, description,
                  images, location, status, audit_note, is_ai_generated, favorite_count,
                  view_count, created_at, updated_at
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,0,%s,%s,%s,%s)
                ON DUPLICATE KEY UPDATE
                  seller_id=VALUES(seller_id),
                  category_id=VALUES(category_id),
                  title=VALUES(title),
                  price=VALUES(price),
                  condition_level=VALUES(condition_level),
                  description=VALUES(description),
                  images=VALUES(images),
                  location=VALUES(location),
                  status=VALUES(status),
                  audit_note=VALUES(audit_note),
                  favorite_count=VALUES(favorite_count),
                  view_count=VALUES(view_count),
                  updated_at=VALUES(updated_at)
                """,
                (
                    goods_id,
                    seller_id,
                    goods_category_ids[idx % len(goods_category_ids)],
                    title,
                    Decimal("12.00") + Decimal(idx % 11) * Decimal("3.50"),
                    ["九成新", "八成新", "全新未拆", "轻微使用"][idx % 4],
                    f"{title}，信息完整，适合校内当面确认后交易。当前商品状态：{GOOD_STATUS_LABELS[status]}。",
                    dumps([img]),
                    ["东校区图书馆", "信电楼大厅", "三号宿舍楼下", "奥运场馆门口"][idx % 4],
                    status,
                    "内容合规" if status != "rejected" else "图片不清晰，请重新提交",
                    4 + idx % 9,
                    38 + idx * 3,
                    dt(20 + idx),
                    dt(80 + idx),
                ),
            )
            goods_by_status[(status, n)] = goods_id
            idx += 1
    return goods_by_status


def upsert_services(cur, current_user_id: int, category_ids: dict[str, list[int]]) -> dict[tuple[str, int], int]:
    statuses = ["pending", "on_sale", "paused", "removed"]
    services_by_status: dict[tuple[str, int], int] = {}
    providers = [current_user_id, 5, 7, 9, 203]
    idx = 0
    for status in statuses:
        for n in range(1, 6):
            service_id = 9100 + idx + 1
            title = SERVICE_TITLES[idx % len(SERVICE_TITLES)]
            execute(
                cur,
                """
                INSERT INTO services (
                  id, provider_id, category_id, title, price, description, images,
                  status, avg_score, created_at, updated_at
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON DUPLICATE KEY UPDATE
                  provider_id=VALUES(provider_id),
                  category_id=VALUES(category_id),
                  title=VALUES(title),
                  price=VALUES(price),
                  description=VALUES(description),
                  images=VALUES(images),
                  status=VALUES(status),
                  avg_score=VALUES(avg_score),
                  updated_at=VALUES(updated_at)
                """,
                (
                    service_id,
                    providers[idx % len(providers)],
                    category_ids["service"][idx % len(category_ids["service"])],
                    title,
                    Decimal("8.00") + Decimal(idx % 8) * Decimal("4.00"),
                    f"{title}，预约后在站内沟通时间和交付范围。当前服务状态：{SERVICE_STATUS_LABELS[status]}。",
                    dumps([image(GOODS_IMAGES[(idx + 5) % len(GOODS_IMAGES)])]),
                    status,
                    Decimal("4.60") + Decimal(idx % 4) / Decimal("10"),
                    dt(120 + idx),
                    dt(180 + idx),
                ),
            )
            services_by_status[(status, n)] = service_id
            idx += 1
    return services_by_status


def upsert_errands(cur, current_user_id: int) -> dict[tuple[str, int], int]:
    statuses = ["unpaid", "waiting_accept", "accepted", "processing", "completed", "confirmed", "cancelled", "disputed"]
    errands_by_status: dict[tuple[str, int], int] = {}
    publishers = [current_user_id, 1, 2, 3, 204]
    riders = [current_user_id, 6, 202, 3, None]
    idx = 0
    for status in statuses:
        for n in range(1, 6):
            errand_id = 9200 + idx + 1
            rider_id = riders[(idx + 1) % len(riders)]
            if status in {"unpaid", "waiting_accept"}:
                rider_id = None if n in {1, 5} else rider_id
            title = ERRAND_TITLES[idx % len(ERRAND_TITLES)]
            execute(
                cur,
                """
                INSERT INTO errand_orders (
                  id, publisher_id, rider_id, title, description, pickup_location,
                  delivery_location, fee, status, accepted_at, completed_at, created_at, updated_at
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON DUPLICATE KEY UPDATE
                  publisher_id=VALUES(publisher_id),
                  rider_id=VALUES(rider_id),
                  title=VALUES(title),
                  description=VALUES(description),
                  pickup_location=VALUES(pickup_location),
                  delivery_location=VALUES(delivery_location),
                  fee=VALUES(fee),
                  status=VALUES(status),
                  accepted_at=VALUES(accepted_at),
                  completed_at=VALUES(completed_at),
                  updated_at=VALUES(updated_at)
                """,
                (
                    errand_id,
                    publishers[(idx + n) % len(publishers)],
                    rider_id,
                    title,
                    f"{title}，请按备注核对物品信息并在送达后拍照确认。当前跑腿状态：{ERRAND_STATUS_LABELS[status]}。",
                    ["东区快递站", "图书馆一层服务台", "信电楼 229", "南区食堂入口"][idx % 4],
                    ["三号宿舍楼下", "西区教学楼", "信息楼大厅", "北区宿舍门口"][idx % 4],
                    Decimal("5.00") + Decimal(idx % 7) * Decimal("1.50"),
                    status,
                    dt(260 + idx) if status not in {"unpaid", "waiting_accept"} else None,
                    dt(360 + idx) if status in {"completed", "confirmed"} else None,
                    dt(220 + idx),
                    dt(300 + idx),
                ),
            )
            errands_by_status[(status, n)] = errand_id
            idx += 1
    return errands_by_status


def order_status_to_errand(status: str) -> str:
    return {
        "unpaid": "unpaid",
        "paid": "waiting_accept",
        "confirmed": "accepted",
        "shipped": "processing",
        "completed": "confirmed",
        "refunding": "disputed",
        "refunded": "disputed",
        "cancelled": "cancelled",
        "disputed": "disputed",
    }[status]


def fund_status(status: str) -> str:
    return {
        "unpaid": "none",
        "paid": "frozen",
        "confirmed": "frozen",
        "shipped": "frozen",
        "completed": "settled",
        "refunding": "refunding",
        "refunded": "refunded",
        "cancelled": "refunded",
        "disputed": "frozen",
    }[status]


def event_path(status: str) -> list[tuple[str | None, str, str, str]]:
    paths = {
        "unpaid": [(None, "unpaid", "create", "订单已创建，等待支付。")],
        "paid": [(None, "unpaid", "create", "订单已创建。"), ("unpaid", "paid", "pay", "买家已支付，资金进入平台托管。")],
        "confirmed": [
            (None, "unpaid", "create", "订单已创建。"),
            ("unpaid", "paid", "pay", "买家已支付。"),
            ("paid", "confirmed", "confirm", "卖家已确认订单。"),
        ],
        "shipped": [
            (None, "unpaid", "create", "订单已创建。"),
            ("unpaid", "paid", "pay", "买家已支付。"),
            ("paid", "confirmed", "confirm", "卖家已确认。"),
            ("confirmed", "shipped", "ship", "卖家已发货或服务已开始。"),
        ],
        "completed": [
            (None, "unpaid", "create", "订单已创建。"),
            ("unpaid", "paid", "pay", "买家已支付。"),
            ("paid", "confirmed", "confirm", "订单已确认。"),
            ("confirmed", "shipped", "ship", "履约中。"),
            ("shipped", "completed", "complete", "买家已确认完成，资金结算。"),
        ],
        "refunding": [
            (None, "unpaid", "create", "订单已创建。"),
            ("unpaid", "paid", "pay", "买家已支付。"),
            ("paid", "refunding", "refund_apply", "买家提交售后申请。"),
        ],
        "refunded": [
            (None, "unpaid", "create", "订单已创建。"),
            ("unpaid", "paid", "pay", "买家已支付。"),
            ("paid", "refunding", "refund_apply", "买家提交售后申请。"),
            ("refunding", "refunded", "refund_finish", "售后完成，款项退回。"),
        ],
        "cancelled": [
            (None, "unpaid", "create", "订单已创建。"),
            ("unpaid", "cancelled", "cancel", "订单已取消。"),
        ],
        "disputed": [
            (None, "unpaid", "create", "订单已创建。"),
            ("unpaid", "paid", "pay", "买家已支付。"),
            ("paid", "disputed", "complaint", "投诉已提交，等待管理员处理。"),
        ],
    }
    return paths[status]


def item_snapshot(item_type: str, item_id: int, title: str, price: Decimal, status: str, img_name: str) -> str:
    if item_type == "errand":
        return dumps(
            {
                "title": title,
                "type": "跑腿订单",
                "statusLabel": ORDER_STATUS_LABELS[status],
                "pickupLocation": "东区快递站",
                "deliveryLocation": "三号宿舍楼下",
                "fee": str(price),
                "description": "包含取件地点、送达地点、联系方式和完成确认要求。",
            }
        )
    return dumps(
        {
            "title": title,
            "type": "二手商品" if item_type == "goods" else "校园服务",
            "statusLabel": ORDER_STATUS_LABELS[status],
            "price": str(price),
            "image": image(img_name),
            "description": "包含交易范围、交付方式和售后说明。",
        }
    )


def upsert_orders(cur, current_user_id: int, goods_map, services_map, errands_map) -> list[dict]:
    order_rows: list[dict] = []
    other_buyers = [1, 2, 3, 8, 10, 201, 204, 205]
    other_sellers = [2, 3, 5, 7, 9, 202, 203]

    for item_type in ITEM_TYPES:
        for status_index, status in enumerate(ORDER_STATUSES):
            for n in range(1, 6):
                order_sn = f"DX-{TYPE_CODE[item_type]}-{STATUS_CODE[status]}-{n:02d}"
                idx = ITEM_TYPES.index(item_type) * 100 + status_index * 5 + n
                amount = Decimal("9.00") + Decimal((status_index + n) % 9) * Decimal("3.00")
                if item_type == "goods":
                    item_id = goods_map[(["pending", "on_sale", "rejected", "reserved", "sold", "removed"][status_index % 6], n)]
                    title = GOODS_TITLES[(status_index * 5 + n - 1) % len(GOODS_TITLES)]
                    img_name = GOODS_IMAGES[(status_index * 5 + n - 1) % len(GOODS_IMAGES)]
                    buyer_id = current_user_id if n in {1, 2} else other_buyers[(idx + n) % len(other_buyers)]
                    seller_id = current_user_id if n == 3 else other_sellers[(idx + 2 * n) % len(other_sellers)]
                elif item_type == "service":
                    item_id = services_map[(["pending", "on_sale", "paused", "removed"][status_index % 4], n)]
                    title = SERVICE_TITLES[(status_index * 5 + n - 1) % len(SERVICE_TITLES)]
                    img_name = GOODS_IMAGES[(status_index * 3 + n) % len(GOODS_IMAGES)]
                    buyer_id = current_user_id if n in {1, 2} else other_buyers[(idx + n) % len(other_buyers)]
                    seller_id = current_user_id if n == 3 else other_sellers[(idx + 2 * n) % len(other_sellers)]
                else:
                    errand_status = order_status_to_errand(status)
                    item_id = errands_map[(errand_status, n)]
                    title = ERRAND_TITLES[(status_index * 5 + n - 1) % len(ERRAND_TITLES)]
                    img_name = GOODS_IMAGES[(status_index + n) % len(GOODS_IMAGES)]
                    buyer_id = current_user_id if n in {1, 2} else other_buyers[(idx + n) % len(other_buyers)]
                    seller_id = current_user_id if n in {3, 4} else other_sellers[(idx + 2 * n) % len(other_sellers)]

                paid_at = dt(420 + idx) if status != "unpaid" else None
                completed_at = dt(520 + idx) if status in {"completed", "refunded", "cancelled"} else None
                execute(
                    cur,
                    """
                    INSERT INTO orders (
                      order_sn, buyer_id, seller_id, item_type, item_id, item_snapshot,
                      amount, status, remark, paid_at, completed_at, lock_version, created_at, updated_at
                    )
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,0,%s,%s)
                    ON DUPLICATE KEY UPDATE
                      buyer_id=VALUES(buyer_id),
                      seller_id=VALUES(seller_id),
                      item_type=VALUES(item_type),
                      item_id=VALUES(item_id),
                      item_snapshot=VALUES(item_snapshot),
                      amount=VALUES(amount),
                      status=VALUES(status),
                      remark=VALUES(remark),
                      paid_at=VALUES(paid_at),
                      completed_at=VALUES(completed_at),
                      updated_at=VALUES(updated_at)
                    """,
                    (
                        order_sn,
                        buyer_id,
                        seller_id,
                        item_type,
                        item_id,
                        item_snapshot(item_type, item_id, title, amount, status, img_name),
                        amount,
                        status,
                        f"{ORDER_STATUS_LABELS[status]}流程数据，包含订单节点、资金状态和沟通记录。",
                        paid_at,
                        completed_at,
                        dt(380 + idx),
                        dt(610 + idx),
                    ),
                )
                execute(
                    cur,
                    """
                    INSERT INTO order_funds (order_sn, amount, status, frozen_at, settled_at, refunded_at, created_at, updated_at)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                    ON DUPLICATE KEY UPDATE
                      amount=VALUES(amount),
                      status=VALUES(status),
                      frozen_at=VALUES(frozen_at),
                      settled_at=VALUES(settled_at),
                      refunded_at=VALUES(refunded_at),
                      updated_at=VALUES(updated_at)
                    """,
                    (
                        order_sn,
                        amount,
                        fund_status(status),
                        paid_at if fund_status(status) in {"frozen", "refunding", "settled", "refunded"} else None,
                        completed_at if fund_status(status) == "settled" else None,
                        completed_at if fund_status(status) == "refunded" else None,
                        dt(390 + idx),
                        dt(615 + idx),
                    ),
                )
                order_rows.append(
                    {
                        "sn": order_sn,
                        "type": item_type,
                        "status": status,
                        "buyer": buyer_id,
                        "seller": seller_id,
                        "item_id": item_id,
                        "amount": amount,
                        "title": title,
                    }
                )

    add_order_events(cur, order_rows)
    return order_rows


def add_order_events(cur, order_rows: list[dict]) -> None:
    event_id = 700000
    for order_index, order in enumerate(order_rows):
        for path_index, (from_status, to_status, event_type, note) in enumerate(event_path(order["status"])):
            event_id += 1
            execute(
                cur,
                """
                INSERT IGNORE INTO order_events
                  (id, order_sn, from_status, to_status, operator_id, event_type, note, created_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    event_id,
                    order["sn"],
                    from_status,
                    to_status,
                    order["buyer"] if event_type in {"create", "pay", "refund_apply", "complaint", "cancel"} else order["seller"],
                    event_type,
                    note,
                    dt(700 + order_index * 3 + path_index),
                ),
            )


def add_refunds_and_withdrawals(cur, current_user_id: int, order_rows: list[dict]) -> None:
    refund_statuses = ["pending", "seller_agreed", "seller_rejected", "arbitrating", "buyer_win", "seller_win", "cancelled"]
    refund_orders = [o for o in order_rows if o["status"] in {"refunding", "refunded", "disputed", "cancelled"}]
    for idx, status in enumerate(refund_statuses):
        order = refund_orders[idx % len(refund_orders)]
        execute(
            cur,
            """
            INSERT INTO refund_requests (
              id, order_sn, applicant_id, seller_id, reason, evidence_urls, status,
              seller_reply, admin_id, arbitrate_result, resolved_at, created_at, updated_at
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,99,%s,%s,%s,%s)
            ON DUPLICATE KEY UPDATE
              order_sn=VALUES(order_sn),
              applicant_id=VALUES(applicant_id),
              seller_id=VALUES(seller_id),
              reason=VALUES(reason),
              evidence_urls=VALUES(evidence_urls),
              status=VALUES(status),
              seller_reply=VALUES(seller_reply),
              admin_id=VALUES(admin_id),
              arbitrate_result=VALUES(arbitrate_result),
              resolved_at=VALUES(resolved_at),
              updated_at=VALUES(updated_at)
            """,
            (
                720001 + idx,
                order["sn"],
                order["buyer"],
                order["seller"],
                ["商品与描述不一致", "服务交付时间需调整", "跑腿送达凭证需核对", "买卖双方申请平台介入"][idx % 4],
                dumps([image("manual-review.jpg")]),
                status,
                "已收到申请，正在核对沟通记录。" if status not in {"pending", "cancelled"} else None,
                "buyer_win" if status == "buyer_win" else ("seller_win" if status == "seller_win" else None),
                dt(1050 + idx) if status in {"buyer_win", "seller_win", "cancelled"} else None,
                dt(990 + idx),
                dt(1040 + idx),
            ),
        )

    withdraws = [
        (730001, current_user_id, Decimal("20.00"), "跑腿收入提现", "pending", None, None),
        (730002, current_user_id, Decimal("35.00"), "服务收入提现", "approved", 99, "信息核验通过，已提交转账。"),
        (730003, 6, Decimal("28.00"), "跑腿结算提现", "rejected", 99, "收款信息不完整，请补充。"),
        (730004, 203, Decimal("42.00"), "文档服务提现", "cancelled", 99, "用户主动取消申请。"),
        (730005, 202, Decimal("18.00"), "跑腿收入提现", "approved", 99, "提现已处理。"),
    ]
    for row in withdraws:
        execute(
            cur,
            """
            INSERT INTO withdraw_requests
              (id, user_id, amount, reason, status, reviewer_id, review_note, reviewed_at, created_at, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON DUPLICATE KEY UPDATE
              user_id=VALUES(user_id),
              amount=VALUES(amount),
              reason=VALUES(reason),
              status=VALUES(status),
              reviewer_id=VALUES(reviewer_id),
              review_note=VALUES(review_note),
              reviewed_at=VALUES(reviewed_at),
              updated_at=VALUES(updated_at)
            """,
            (*row, dt(1110 + row[0] % 10) if row[4] != "pending" else None, dt(1090 + row[0] % 10), dt(1140 + row[0] % 10)),
        )


def add_wallet_logs(cur, current_user_id: int, order_rows: list[dict]) -> None:
    balance = Decimal("300.00")
    wallet_specs = [
        ("recharge", "in", Decimal("50.00"), "校园钱包充值", "用于后续下单支付"),
        ("recharge", "in", Decimal("30.00"), "校园钱包充值", "微信支付到账"),
        ("pay", "out", Decimal("12.00"), "购买学习资料", "平台托管付款"),
        ("pay", "out", Decimal("18.00"), "预约校园服务", "平台托管付款"),
        ("income", "in", Decimal("9.00"), "跑腿订单收入", "买家确认后结算"),
        ("income", "in", Decimal("16.00"), "二手交易收入", "订单完成结算"),
        ("refund", "in", Decimal("12.00"), "售后退款入账", "管理员处理完成"),
        ("withdraw", "out", Decimal("20.00"), "提现申请", "提现申请已提交"),
        ("adjust", "in", Decimal("3.00"), "平台调账", "活动补贴入账"),
        ("income", "in", Decimal("11.00"), "服务订单收入", "预约服务完成"),
        ("pay", "out", Decimal("7.00"), "跑腿任务支付", "任务进入待接单"),
        ("refund", "in", Decimal("6.00"), "订单取消退款", "取消后原路退回钱包"),
    ]
    linked_orders = order_rows[:]
    for idx, (log_type, direction, amount, title, note) in enumerate(wallet_specs):
        balance = balance + amount if direction == "in" else balance - amount
        order_sn = linked_orders[idx % len(linked_orders)]["sn"] if idx % 2 == 0 else None
        execute(
            cur,
            """
            INSERT IGNORE INTO wallet_logs
              (id, user_id, order_sn, type, direction, amount, balance_after, title, note, created_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (740001 + idx, current_user_id, order_sn, log_type, direction, amount, balance, title, note, dt(1160 + idx)),
        )


def message_hash(previous_hash: str | None, content: str, sender_id: int, created_at: datetime) -> str:
    raw = f"{previous_hash or ''}|{sender_id}|{created_at.isoformat()}|{content}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def ensure_conversation(cur, session_type: str, business_type: str, business_id: int, user_a: int, user_b: int, created_at: datetime) -> int:
    a, b = sorted([user_a, user_b])
    execute(
        cur,
        """
        INSERT INTO conversations
          (session_type, business_type, business_id, user_a_id, user_b_id, last_message_at, created_at)
        VALUES (%s,%s,%s,%s,%s,%s,%s)
        ON DUPLICATE KEY UPDATE
          session_type=VALUES(session_type),
          last_message_at=VALUES(last_message_at)
        """,
        (session_type, business_type, business_id, a, b, created_at + timedelta(minutes=4), created_at),
    )
    row = one(
        cur,
        "SELECT id FROM conversations WHERE business_type=%s AND business_id=%s AND user_a_id=%s AND user_b_id=%s",
        (business_type, business_id, a, b),
    )
    return int(row["id"])


def add_chats(cur, current_user_id: int, order_rows: list[dict]) -> None:
    samples = [
        ("goods_chat", "goods", 9002, current_user_id, 2, ["这本讲义还有重点标注吗？", "有，概率分布和大数定律部分都整理好了。", "今晚信电楼门口方便交易吗？"]),
        ("goods_chat", "goods", 9007, current_user_id, 3, ["键盘电池续航怎么样？", "正常使用两周没问题，按键也都灵敏。", "我下单后明天中午取。"]),
        ("service_chat", "service", 9107, current_user_id, 203, ["程序调试可以看 Flask 接口吗？", "可以，最好把报错截图和接口路径一起发我。", "那我预约今晚八点。"]),
        ("service_chat", "service", 9112, current_user_id, 7, ["面试模拟需要提前准备什么？", "带一份简历，我会按项目经历提问。", "好的，我先上传简历。"]),
        ("task_chat", "errand", 9212, current_user_id, 6, ["快递取件码已经发你了。", "收到，我到快递站后拍照确认。", "送到三号宿舍楼门口即可。"]),
        ("task_chat", "errand", 9220, current_user_id, 202, ["实验服在信工楼 312。", "我十分钟后到，取到后送西区。", "辛苦，送达后我确认完成。"]),
    ]
    msg_id = 750000
    for index, (session_type, business_type, business_id, user_a, user_b, messages) in enumerate(samples):
        created = dt(1220 + index * 10)
        conv_id = ensure_conversation(cur, session_type, business_type, business_id, user_a, user_b, created)
        previous = None
        for message_index, content in enumerate(messages):
            msg_id += 1
            sender = user_a if message_index % 2 == 0 else user_b
            receiver = user_b if sender == user_a else user_a
            created_at = created + timedelta(minutes=message_index + 1)
            digest = message_hash(previous, content, sender, created_at)
            execute(
                cur,
                """
                INSERT IGNORE INTO messages
                  (id, conversation_id, sender_id, receiver_id, message_type, content, content_hash, previous_hash, status, created_at)
                VALUES (%s,%s,%s,%s,'text',%s,%s,%s,'normal',%s)
                """,
                (msg_id, conv_id, sender, receiver, content, digest, previous, created_at),
            )
            previous = digest


def add_favorites_and_comments(cur, current_user_id: int, order_rows: list[dict]) -> None:
    favorite_targets = [
        ("goods", 9002),
        ("goods", 9006),
        ("goods", 9010),
        ("goods", 9013),
        ("goods", 9018),
        ("service", 9102),
        ("service", 9106),
        ("service", 9109),
        ("service", 9114),
        ("service", 9118),
    ]
    for idx, (target_type, target_id) in enumerate(favorite_targets):
        execute(
            cur,
            """
            INSERT IGNORE INTO favorites (id, user_id, target_type, target_id, created_at)
            VALUES (%s,%s,%s,%s,%s)
            """,
            (760001 + idx, current_user_id, target_type, target_id, dt(1300 + idx)),
        )

    completed_orders = [o for o in order_rows if o["status"] == "completed"][:12]
    comments = [
        "沟通清楚，交付准时。",
        "物品与描述一致，当面验收顺利。",
        "服务交付完整，修改也很及时。",
        "跑腿送达很快，凭证清晰。",
        "整体体验很好，后续还会合作。",
        "处理过程规范，确认节点完整。",
        "资料整理得很细，便于复习。",
        "包装完整，交接地点明确。",
        "响应速度快，态度认真。",
        "订单闭环清楚，售后说明到位。",
    ]
    for idx, order in enumerate(completed_orders[:10]):
        evaluator = current_user_id if idx % 2 == 0 else order["buyer"]
        if evaluator == order["seller"]:
            evaluator = order["buyer"]
        target_user = order["seller"] if evaluator == order["buyer"] else order["buyer"]
        execute(
            cur,
            """
            INSERT INTO comments
              (id, order_sn, evaluator_id, target_user_id, target_type, target_id, score, content, status, created_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,'normal',%s)
            ON DUPLICATE KEY UPDATE
              target_user_id=VALUES(target_user_id),
              target_type=VALUES(target_type),
              target_id=VALUES(target_id),
              score=VALUES(score),
              content=VALUES(content),
              status='normal'
            """,
            (
                770001 + idx,
                order["sn"],
                evaluator,
                target_user,
                order["type"],
                order["item_id"],
                5 if idx % 4 else 4,
                comments[idx % len(comments)],
                dt(1350 + idx),
            ),
        )


def normalize_trade_participants(cur, current_user_id: int, order_rows: list[dict]) -> None:
    participant_ids = {current_user_id}
    for order in order_rows:
        participant_ids.add(int(order["buyer"]))
        participant_ids.add(int(order["seller"]))
    participant_ids.update([1, 2, 3, 5, 6, 7, 8, 9, 10, 201, 202, 203, 204, 205])
    for idx, user_id in enumerate(sorted(participant_ids)):
        if user_id == 99:
            continue
        role = "rider" if user_id in {6, 202} else "provider" if user_id in {5, 7, 9, 203} else "user"
        execute(
            cur,
            """
            UPDATE users
            SET status='active',
                is_verified=1,
                role=CASE WHEN role IN ('admin','provider','rider') THEN role ELSE %s END,
                college=COALESCE(NULLIF(college, ''), '信息与电气工程学院'),
                student_id_enc=COALESCE(student_id_enc, %s),
                real_name_enc=COALESCE(real_name_enc, %s),
                phone_enc=COALESCE(phone_enc, %s),
                address=COALESCE(address, '中国农业大学东校区学生公寓'),
                avatar_url=COALESCE(avatar_url, %s),
                credit_score=GREATEST(credit_score, 96),
                updated_at=%s
            WHERE id=%s
            """,
            (
                role,
                f"sha256:student:{user_id}",
                f"sha256:name:{user_id}",
                f"sha256:phone:{user_id}",
                f"/uploads/avatar/{user_id}.png",
                dt(1500 + idx),
                user_id,
            ),
        )
        execute(
            cur,
            """
            INSERT INTO user_verifications (
              id, user_id, student_id_enc, real_name_enc, college, school_email,
              email_verified_at, student_card_image_url, ocr_match_score, status,
              reviewer_id, review_note, reviewed_at, created_at
            )
            VALUES (%s,%s,%s,%s,'信息与电气工程学院',%s,%s,%s,98.00,'approved',99,'校园身份信息已核验',%s,%s)
            ON DUPLICATE KEY UPDATE
              status='approved',
              reviewer_id=99,
              review_note=VALUES(review_note),
              reviewed_at=VALUES(reviewed_at)
            """,
            (
                800000 + user_id,
                user_id,
                f"sha256:student:{user_id}",
                f"sha256:name:{user_id}",
                f"2023{user_id:09d}@cau.edu.cn"[:120],
                dt(1510 + idx),
                "/uploads/goods/manual-review.jpg",
                dt(1520 + idx),
                dt(1505 + idx),
            ),
        )
        execute(
            cur,
            """
            INSERT INTO user_profiles (
              user_id, campus_area, major, grade_label, bio, response_time_minutes,
              last_active_at, trade_tags, completed_trade_count, good_rate_snapshot,
              created_at, updated_at
            )
            VALUES (%s,'东校区','软件工程','2023 级',%s,%s,%s,%s,%s,98.00,%s,%s)
            ON DUPLICATE KEY UPDATE
              campus_area=VALUES(campus_area),
              major=VALUES(major),
              grade_label=VALUES(grade_label),
              bio=VALUES(bio),
              response_time_minutes=VALUES(response_time_minutes),
              last_active_at=VALUES(last_active_at),
              trade_tags=VALUES(trade_tags),
              completed_trade_count=GREATEST(completed_trade_count, VALUES(completed_trade_count)),
              good_rate_snapshot=VALUES(good_rate_snapshot),
              updated_at=VALUES(updated_at)
            """,
            (
                user_id,
                "已完成校园身份认证，交易记录完整，支持站内沟通和售后闭环。",
                6 + idx % 10,
                dt(1540 + idx),
                dumps(["已实名", "信用良好", "响应及时"]),
                12 + idx % 18,
                dt(1505 + idx),
                dt(1545 + idx),
            ),
        )


def add_public_profile_assets(cur, current_user_id: int, category_ids: dict[str, list[int]], order_rows: list[dict]) -> None:
    profile_users = [1, 2, 3, 5, 6, 7, 8, 9, 10, 201, 202, 203, 204, 205, current_user_id]
    goods_category = category_ids["goods"][0]
    service_category = category_ids["service"][0]
    for idx, user_id in enumerate(dict.fromkeys(profile_users)):
        goods_id = 9300 + idx
        service_id = 9400 + idx
        execute(
            cur,
            """
            INSERT INTO goods (
              id, seller_id, category_id, title, price, condition_level, description,
              images, location, status, audit_note, is_ai_generated, favorite_count,
              view_count, created_at, updated_at
            )
            VALUES (%s,%s,%s,%s,%s,'九成新',%s,%s,'东校区图书馆','on_sale','内容合规',0,%s,%s,%s,%s)
            ON DUPLICATE KEY UPDATE
              seller_id=VALUES(seller_id),
              category_id=VALUES(category_id),
              title=VALUES(title),
              price=VALUES(price),
              description=VALUES(description),
              images=VALUES(images),
              status='on_sale',
              audit_note='内容合规',
              updated_at=VALUES(updated_at)
            """,
            (
                goods_id,
                user_id,
                goods_category,
                GOODS_TITLES[idx % len(GOODS_TITLES)],
                Decimal("18.00") + Decimal(idx % 9) * Decimal("2.00"),
                "个人主页展示的在售物品，支持当面验货和站内沟通。",
                dumps([image(GOODS_IMAGES[idx % len(GOODS_IMAGES)])]),
                3 + idx % 7,
                40 + idx * 4,
                dt(1560 + idx),
                dt(1580 + idx),
            ),
        )
        execute(
            cur,
            """
            INSERT INTO services (
              id, provider_id, category_id, title, price, description, images,
              status, avg_score, created_at, updated_at
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,'on_sale',4.90,%s,%s)
            ON DUPLICATE KEY UPDATE
              provider_id=VALUES(provider_id),
              category_id=VALUES(category_id),
              title=VALUES(title),
              price=VALUES(price),
              description=VALUES(description),
              images=VALUES(images),
              status='on_sale',
              avg_score=VALUES(avg_score),
              updated_at=VALUES(updated_at)
            """,
            (
                service_id,
                user_id,
                service_category,
                SERVICE_TITLES[idx % len(SERVICE_TITLES)],
                Decimal("12.00") + Decimal(idx % 6) * Decimal("3.00"),
                "个人主页展示的可预约服务，预约后按约定时间交付。",
                dumps([image(GOODS_IMAGES[(idx + 3) % len(GOODS_IMAGES)])]),
                dt(1590 + idx),
                dt(1600 + idx),
            ),
        )

    target_users = [uid for uid in dict.fromkeys(profile_users) if uid != current_user_id]
    completed_orders = [o for o in order_rows if o["status"] == "completed"]
    for idx, user_id in enumerate(target_users[:20]):
        order = completed_orders[idx % len(completed_orders)]
        evaluator = current_user_id if current_user_id != user_id else order["buyer"]
        execute(
            cur,
            """
            INSERT IGNORE INTO comments
              (id, order_sn, evaluator_id, target_user_id, target_type, target_id, score, content, status, created_at)
            VALUES (%s,%s,%s,%s,%s,%s,5,%s,'normal',%s)
            """,
            (
                771001 + idx,
                order["sn"],
                evaluator,
                user_id,
                order["type"],
                order["item_id"],
                "沟通顺畅，履约及时，交易体验稳定。",
                dt(1620 + idx),
            ),
        )
        execute(
            cur,
            """
            INSERT IGNORE INTO credit_logs
              (id, user_id, change_value, reason_type, reason_detail, related_type, related_id, operator_id, score_after, created_at)
            VALUES (%s,%s,%s,'trade_comment',%s,'order',%s,%s,%s,%s)
            """,
            (
                772001 + idx,
                user_id,
                1 if idx % 3 == 0 else 0,
                "收到交易好评，信用分增加或保持。",
                order["sn"],
                evaluator,
                99 + (idx % 2),
                dt(1640 + idx),
            ),
        )


def add_ai_admin_data(cur) -> None:
    ai_rows = [
        (780001, "goods", 9001, "text_audit", "deepseek", "pass", "内容合规，允许进入人工审核队列。"),
        (780002, "goods", 9003, "image_audit", "deepseek", "manual", "图片清晰度较低，建议管理员复核。"),
        (780003, "service", 9102, "text_audit", "deepseek", "pass", "服务描述完整。"),
        (780004, "message", 750001, "text_audit", "deepseek", "pass", "聊天内容无风险。"),
        (780005, "draft", 9004, "recommend_tags", "deepseek", "pass", "推荐标签已生成。"),
    ]
    for row in ai_rows:
        execute(
            cur,
            """
            INSERT IGNORE INTO ai_audit_records
              (id, target_type, target_id, audit_type, provider, request_id, risk_level, reason, raw_result, created_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                row[0],
                row[1],
                row[2],
                row[3],
                row[4],
                f"local-{row[0]}",
                row[5],
                row[6],
                dumps({"source": "local_seed", "score": 0.96}),
                dt(1400 + row[0] % 10),
            ),
        )

    admin_rows = [
        (790001, 99, "goods_review_approve", "goods", "9001", "商品信息完整，允许上架。"),
        (790002, 99, "goods_review_reject", "goods", "9003", "图片不清晰，退回修改。"),
        (790003, 99, "service_review_approve", "service", "9102", "服务内容合规。"),
        (790004, 99, "refund_arbitrate", "refund", "720004", "根据聊天证据链进入仲裁。"),
        (790005, 99, "complaint_resolve", "order", "DX-ER-DI-01", "投诉处理结果已反馈双方。"),
    ]
    for row in admin_rows:
        execute(
            cur,
            """
            INSERT IGNORE INTO admin_audit_logs
              (id, admin_id, action, target_type, target_id, before_data, after_data, reason, ip_address, created_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,'127.0.0.1',%s)
            """,
            (row[0], row[1], row[2], row[3], row[4], dumps({}), dumps({"result": "recorded"}), row[5], dt(1450 + row[0] % 10)),
        )


def print_summary(cur, current_user_id: int) -> None:
    print("\n已完成追加，当前账号与数据覆盖如下：")
    row = one(cur, "SELECT id, nickname, username, role, is_verified, balance FROM users WHERE id=%s", (current_user_id,))
    if row:
        print(f"- 当前账号：#{row['id']} {row['nickname']} / {row['username']}，role={row['role']}，verified={row['is_verified']}，balance={row['balance']}")

    cur.execute("SELECT item_type, status, COUNT(*) AS c FROM orders GROUP BY item_type, status ORDER BY item_type, status")
    for row in cur.fetchall():
        print(f"- 订单覆盖：{row['item_type']} / {row['status']} = {row['c']} 条")

    cur.execute("SELECT status, COUNT(*) AS c FROM errand_orders GROUP BY status ORDER BY status")
    for row in cur.fetchall():
        print(f"- 跑腿覆盖：{row['status']} = {row['c']} 条")

    cur.execute("SELECT status, COUNT(*) AS c FROM refund_requests GROUP BY status ORDER BY status")
    refund_summary = ", ".join(f"{r['status']}:{r['c']}" for r in cur.fetchall())
    print(f"- 售后覆盖：{refund_summary}")

    cur.execute("SELECT status, COUNT(*) AS c FROM withdraw_requests GROUP BY status ORDER BY status")
    withdraw_summary = ", ".join(f"{r['status']}:{r['c']}" for r in cur.fetchall())
    print(f"- 提现覆盖：{withdraw_summary}")


def main() -> int:
    check_only = "--check" in sys.argv
    print(f"项目目录：{ROOT}")
    print(f"配置文件：{ENV_FILE}")
    if check_only:
        print("当前为校验模式：会执行完整写入流程，结束后回滚。")
    conn = db_connect()
    try:
        with conn.cursor() as cur:
            current_user_id = find_current_user(cur)
            category_ids = ensure_categories(cur)
            ensure_users(cur, current_user_id)
            goods_map = upsert_goods(cur, current_user_id, category_ids)
            services_map = upsert_services(cur, current_user_id, category_ids)
            errands_map = upsert_errands(cur, current_user_id)
            order_rows = upsert_orders(cur, current_user_id, goods_map, services_map, errands_map)
            normalize_trade_participants(cur, current_user_id, order_rows)
            add_public_profile_assets(cur, current_user_id, category_ids, order_rows)
            add_refunds_and_withdrawals(cur, current_user_id, order_rows)
            add_wallet_logs(cur, current_user_id, order_rows)
            add_chats(cur, current_user_id, order_rows)
            add_favorites_and_comments(cur, current_user_id, order_rows)
            add_ai_admin_data(cur)
            print_summary(cur, current_user_id)
            if check_only:
                conn.rollback()
                print("\n校验通过，已回滚，没有改变数据库。")
            else:
                conn.commit()
        print("\n完成。认证后运行这个脚本，就可以补齐完整业务数据。")
        return 0
    except Exception as exc:
        conn.rollback()
        print("\n追加失败，已回滚，没有写入半截数据。")
        print(f"错误：{exc}")
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
