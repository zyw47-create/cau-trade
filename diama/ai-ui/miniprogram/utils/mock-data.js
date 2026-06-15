const categories = [
  { id: "all", name: "全部", count: 68 },
  { id: "digital", name: "数码", count: 16 },
  { id: "books", name: "图书", count: 11 },
  { id: "daily", name: "生活", count: 8 },
  { id: "sports", name: "运动", count: 7 },
  { id: "clothes", name: "服饰", count: 9 },
  { id: "beauty", name: "美妆", count: 5 },
  { id: "other", name: "其他", count: 12 }
]

const goodsList = [
  {
    id: "g101",
    title: "iPad Pro 11 英寸 M2 256G 国行",
    summary: "九成新，含原装笔和磁吸壳，支持当面验机。",
    images: ["https://dummyimage.com/640x480/f8bbd0/ffffff&text=iPad+Pro"],
    categoryId: "digital",
    categoryName: "数码",
    price: 4999,
    originalPrice: 6999,
    conditionLabel: "几乎全新",
    location: "东区图书馆",
    sellerName: "林同学",
    sellerCollege: "信息学院",
    creditScore: 98,
    likes: 45,
    views: 328,
    comments: 12,
    isAiAudit: true,
    isFav: true
  },
  {
    id: "g102",
    title: "考研数学全套教材与笔记",
    summary: "张宇、李林、真题册齐全，适合 26 考研。",
    images: ["https://dummyimage.com/640x480/ffd6e5/ffffff&text=Books"],
    categoryId: "books",
    categoryName: "图书",
    price: 128,
    originalPrice: 356,
    conditionLabel: "轻微使用",
    location: "西区宿舍",
    sellerName: "周学姐",
    sellerCollege: "理学院",
    creditScore: 95,
    likes: 31,
    views: 210,
    comments: 9,
    isAiAudit: false,
    isFav: false
  },
  {
    id: "g103",
    title: "小米 14 Pro 12+256 全新未拆",
    summary: "抽奖中签转让，可现场查序列号。",
    images: ["https://dummyimage.com/640x480/d8f3ff/ffffff&text=Xiaomi+14+Pro"],
    categoryId: "digital",
    categoryName: "数码",
    price: 4299,
    originalPrice: 4999,
    conditionLabel: "全新",
    location: "南门快递点",
    sellerName: "陈同学",
    sellerCollege: "工学院",
    creditScore: 92,
    likes: 56,
    views: 412,
    comments: 21,
    isAiAudit: true,
    isFav: false
  },
  {
    id: "g104",
    title: "捷安特 ATX860 山地车",
    summary: "刚做完保养，适合校园通勤，送车锁和夜灯。",
    images: ["https://dummyimage.com/640x480/ffe0b2/ffffff&text=ATX860"],
    categoryId: "daily",
    categoryName: "生活",
    price: 860,
    originalPrice: 1599,
    conditionLabel: "几乎全新",
    location: "操场北门",
    sellerName: "赵同学",
    sellerCollege: "农学院",
    creditScore: 89,
    likes: 23,
    views: 182,
    comments: 6,
    isAiAudit: false,
    isFav: false
  },
  {
    id: "g105",
    title: "Sony WH-1000XM5 降噪耳机",
    summary: "盒说齐全，白色，支持试听。",
    images: ["https://dummyimage.com/640x480/e1f5fe/ffffff&text=XM5"],
    categoryId: "digital",
    categoryName: "数码",
    price: 1799,
    originalPrice: 2899,
    conditionLabel: "几乎全新",
    location: "教学楼 A 区",
    sellerName: "许同学",
    sellerCollege: "人文学院",
    creditScore: 97,
    likes: 51,
    views: 266,
    comments: 14,
    isAiAudit: true,
    isFav: false
  },
  {
    id: "g106",
    title: "Lululemon 瑜伽垫 5mm",
    summary: "买重复了，全新未拆，校内自提。",
    images: ["https://dummyimage.com/640x480/fce4ec/ffffff&text=Yoga+Mat"],
    categoryId: "sports",
    categoryName: "运动",
    price: 299,
    originalPrice: 580,
    conditionLabel: "全新",
    location: "体育馆前台",
    sellerName: "沈同学",
    sellerCollege: "体育学院",
    creditScore: 94,
    likes: 18,
    views: 143,
    comments: 4,
    isAiAudit: false,
    isFav: false
  },
  {
    id: "g107",
    title: "联想小新 Pro 14 轻薄本",
    summary: "课程设计办公都顺手，带电脑包和扩展坞。",
    images: ["https://dummyimage.com/640x480/f3e5f5/ffffff&text=Lenovo+Pro14"],
    categoryId: "digital",
    categoryName: "数码",
    price: 3680,
    originalPrice: 5799,
    conditionLabel: "正常使用",
    location: "东区 5 号宿舍楼",
    sellerName: "吴同学",
    sellerCollege: "软件学院",
    creditScore: 91,
    likes: 22,
    views: 199,
    comments: 7,
    isAiAudit: true,
    isFav: false
  },
  {
    id: "g108",
    title: "高等代数教材合集",
    summary: "含课堂笔记和往年题，适合理科低年级复习。",
    images: ["https://dummyimage.com/640x480/fff3e0/ffffff&text=Algebra"],
    categoryId: "books",
    categoryName: "图书",
    price: 66,
    originalPrice: 158,
    conditionLabel: "轻微使用",
    location: "西区图书馆",
    sellerName: "冯同学",
    sellerCollege: "数学学院",
    creditScore: 90,
    likes: 14,
    views: 88,
    comments: 5,
    isAiAudit: false,
    isFav: false
  }
]

const conversations = [
  { id: "c1", name: "林同学", avatar: "林", lastMessage: "可以，明天下午三点图书馆门口交易。", time: "刚刚", unread: 2, online: true, sessionType: "goods", messageStatus: "delivered" },
  { id: "c2", name: "维修服务", avatar: "修", lastMessage: "电脑清灰今天晚上还能排一个号。", time: "10 分钟前", unread: 1, online: true, sessionType: "service", messageStatus: "read" },
  { id: "c3", name: "跑腿订单", avatar: "跑", lastMessage: "奶茶已经送到宿舍楼下。", time: "1 小时前", unread: 0, online: false, sessionType: "errand", messageStatus: "read" },
  { id: "c4", name: "系统通知", avatar: "系", lastMessage: "你的商品“MacBook Air”已通过 AI 审核。", time: "2 小时前", unread: 0, online: false, sessionType: "system", messageStatus: "sent" }
]

const serviceList = [
  { id: "s1", title: "考研数学一对一辅导", description: "研究生学长在线答疑，可按章节或真题训练。", category: "家教辅导", price: 100, unit: "小时", provider: "王学长", rating: 4.9, completedOrders: 48, tags: ["考研", "高数", "线代"] },
  { id: "s2", title: "电脑重装与清灰", description: "系统重装、数据迁移、风扇清灰都可以做。", category: "维修服务", price: 59, unit: "次", provider: "李同学", rating: 4.8, completedOrders: 126, tags: ["电脑", "上门", "当天"] },
  { id: "s3", title: "PPT 美化与海报设计", description: "答辩 PPT、社团海报、活动主视觉都可以接。", category: "设计服务", price: 88, unit: "份", provider: "陈同学", rating: 4.7, completedOrders: 67, tags: ["PPT", "海报", "Logo"] }
]

const errandList = [
  { id: "e1", title: "帮取菜鸟驿站快递", type: "delivery", reward: 5, from: "东区菜鸟驿站", to: "西区 3 号楼", deadline: "今天 18:00 前", status: "waiting_accept", publisher: "张同学" },
  { id: "e2", title: "代买东区食堂午饭", type: "purchase", reward: 8, from: "东区第一食堂", to: "图书馆北门", deadline: "今天 12:00 前", status: "waiting_accept", publisher: "李同学" },
  { id: "e3", title: "帮打印论文初稿", type: "help", reward: 10, from: "一教打印店", to: "西区 2 号楼", deadline: "今天 20:00 前", status: "accepted", publisher: "周同学" }
]

const orderList = [
  { id: "o1", orderSn: "ORD20260611001", role: "buy", goodsId: "g101", goodsTitle: "iPad Pro 11 英寸 M2 256G 国行", price: 4999, otherParty: "林同学", statusLabel: "待发货", createdAt: "2026-06-11 20:30" },
  { id: "o2", orderSn: "ORD20260610012", role: "buy", goodsId: "g102", goodsTitle: "考研数学全套教材与笔记", price: 128, otherParty: "周学姐", statusLabel: "待收货", createdAt: "2026-06-10 19:00" },
  { id: "o3", orderSn: "ORD20260609006", role: "sell", goodsId: "g105", goodsTitle: "Sony WH-1000XM5 降噪耳机", price: 1799, otherParty: "吴同学", statusLabel: "已完成", createdAt: "2026-06-09 17:10" }
]

const walletRecords = [
  { id: "w1", title: "iPad Pro 交易收入", amount: 4999, time: "2026-06-11 21:00", status: "已完成" },
  { id: "w2", title: "购买考研教材", amount: -128, time: "2026-06-10 19:05", status: "已完成" },
  { id: "w3", title: "账户充值", amount: 300, time: "2026-06-10 10:00", status: "已完成" },
  { id: "w4", title: "交易资金冻结", amount: -100, time: "2026-06-09 14:30", status: "冻结中" }
]

module.exports = {
  categories,
  goodsList,
  conversations,
  serviceList,
  errandList,
  orderList,
  walletRecords
}
