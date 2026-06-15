export type Category = {
  id: string
  name: string
  count: number
}

export type GoodsItem = {
  id: string
  title: string
  summary: string
  categoryId: string
  categoryName: string
  price: number
  originalPrice?: number
  condition: "new" | "like_new" | "normal" | "old"
  conditionLabel: string
  location: string
  seller: {
    id: string
    name: string
    college: string
    creditScore: number
    verified: boolean
  }
  images: string[]
  likes: number
  views: number
  comments: number
  isAiAudit: boolean
  isFav?: boolean
  createdAt: string
}

export type Conversation = {
  id: string
  name: string
  avatar: string
  lastMessage: string
  time: string
  unread: number
  online: boolean
  sessionType: "goods" | "service" | "errand" | "system"
  messageStatus?: "sending" | "sent" | "delivered" | "read" | "failed"
}

export type ServiceItem = {
  id: string
  title: string
  description: string
  category: string
  price: number
  unit: string
  provider: string
  rating: number
  completedOrders: number
  tags: string[]
}

export type ErrandItem = {
  id: string
  title: string
  type: "delivery" | "purchase" | "help"
  reward: number
  from?: string
  to: string
  deadline: string
  status: "waiting_accept" | "accepted" | "completed"
  publisher: string
}

export type WalletRecord = {
  id: string
  title: string
  amount: number
  time: string
  type: "income" | "pay" | "recharge" | "refund" | "withdraw" | "frozen"
  status: "completed" | "frozen"
}

export type OrderItem = {
  id: string
  orderSn: string
  role: "buy" | "sell"
  goodsId: string
  goodsTitle: string
  image: string
  price: number
  otherParty: string
  status: "paid" | "shipped" | "completed" | "refunding"
  statusLabel: string
  createdAt: string
}

export const categories: Category[] = [
  { id: "all", name: "全部", count: 68 },
  { id: "digital", name: "数码", count: 16 },
  { id: "books", name: "图书", count: 11 },
  { id: "daily", name: "生活", count: 8 },
  { id: "sports", name: "运动", count: 7 },
  { id: "clothes", name: "服饰", count: 9 },
  { id: "beauty", name: "美妆", count: 5 },
  { id: "other", name: "其他", count: 12 },
]

export const goodsList: GoodsItem[] = [
  {
    id: "g-101",
    title: "iPad Pro 11 英寸 M2 256G 国行",
    summary: "九成新，含原装笔和磁吸壳，支持当面验机。",
    categoryId: "digital",
    categoryName: "数码",
    price: 4999,
    originalPrice: 6999,
    condition: "like_new",
    conditionLabel: "几乎全新",
    location: "东区图书馆",
    seller: { id: "u-01", name: "林同学", college: "信息学院", creditScore: 98, verified: true },
    images: ["/placeholder.jpg"],
    likes: 45,
    views: 328,
    comments: 12,
    isAiAudit: true,
    isFav: true,
    createdAt: "2026-06-11 20:10",
  },
  {
    id: "g-102",
    title: "考研数学全套教材与笔记",
    summary: "张宇、李林、真题册齐全，适合 26 考研。",
    categoryId: "books",
    categoryName: "图书",
    price: 128,
    originalPrice: 356,
    condition: "normal",
    conditionLabel: "轻微使用",
    location: "西区宿舍",
    seller: { id: "u-02", name: "周学姐", college: "理学院", creditScore: 95, verified: true },
    images: ["/placeholder.jpg"],
    likes: 31,
    views: 210,
    comments: 9,
    isAiAudit: false,
    createdAt: "2026-06-11 18:40",
  },
  {
    id: "g-103",
    title: "小米 14 Pro 12+256 全新未拆",
    summary: "抽奖中签转让，可现场查序列号。",
    categoryId: "digital",
    categoryName: "数码",
    price: 4299,
    originalPrice: 4999,
    condition: "new",
    conditionLabel: "全新",
    location: "南门快递点",
    seller: { id: "u-03", name: "陈同学", college: "工学院", creditScore: 92, verified: true },
    images: ["/placeholder.jpg"],
    likes: 56,
    views: 412,
    comments: 21,
    isAiAudit: true,
    createdAt: "2026-06-11 15:20",
  },
  {
    id: "g-104",
    title: "捷安特 ATX860 山地车",
    summary: "刚做完保养，适合校园通勤，送车锁和夜灯。",
    categoryId: "daily",
    categoryName: "生活",
    price: 860,
    originalPrice: 1599,
    condition: "like_new",
    conditionLabel: "几乎全新",
    location: "操场北门",
    seller: { id: "u-04", name: "赵同学", college: "农学院", creditScore: 89, verified: true },
    images: ["/placeholder.jpg"],
    likes: 23,
    views: 182,
    comments: 6,
    isAiAudit: false,
    createdAt: "2026-06-10 19:10",
  },
  {
    id: "g-105",
    title: "Sony WH-1000XM5 降噪耳机",
    summary: "盒说齐全，白色，支持试听。",
    categoryId: "digital",
    categoryName: "数码",
    price: 1799,
    originalPrice: 2899,
    condition: "like_new",
    conditionLabel: "几乎全新",
    location: "教学楼 A 区",
    seller: { id: "u-05", name: "许同学", college: "人文学院", creditScore: 97, verified: true },
    images: ["/placeholder.jpg"],
    likes: 51,
    views: 266,
    comments: 14,
    isAiAudit: true,
    createdAt: "2026-06-10 14:05",
  },
  {
    id: "g-106",
    title: "Lululemon 瑜伽垫 5mm",
    summary: "买重复了，全新未拆，校内自提。",
    categoryId: "sports",
    categoryName: "运动",
    price: 299,
    originalPrice: 580,
    condition: "new",
    conditionLabel: "全新",
    location: "体育馆前台",
    seller: { id: "u-06", name: "沈同学", college: "体育学院", creditScore: 94, verified: true },
    images: ["/placeholder.jpg"],
    likes: 18,
    views: 143,
    comments: 4,
    isAiAudit: false,
    createdAt: "2026-06-10 09:30",
  },
  {
    id: "g-107",
    title: "MacBook Air M2 16G 512G 深空灰",
    summary: "电池循环 39 次，带 AppleCare+ 到明年。",
    categoryId: "digital",
    categoryName: "数码",
    price: 6888,
    originalPrice: 9499,
    condition: "like_new",
    conditionLabel: "几乎全新",
    location: "创新中心",
    seller: { id: "u-07", name: "何学长", college: "计算机学院", creditScore: 99, verified: true },
    images: ["/placeholder.jpg"],
    likes: 77,
    views: 509,
    comments: 26,
    isAiAudit: true,
    createdAt: "2026-06-09 22:10",
  },
  {
    id: "g-108",
    title: "Air Force 1 白色 42 码",
    summary: "只穿过两次，鞋盒还在。",
    categoryId: "clothes",
    categoryName: "服饰",
    price: 398,
    originalPrice: 799,
    condition: "like_new",
    conditionLabel: "几乎全新",
    location: "西食堂门口",
    seller: { id: "u-08", name: "吴同学", college: "外国语学院", creditScore: 91, verified: true },
    images: ["/placeholder.jpg"],
    likes: 29,
    views: 194,
    comments: 8,
    isAiAudit: false,
    createdAt: "2026-06-09 16:50",
  },
]

export const conversations: Conversation[] = [
  { id: "c-1", name: "林同学", avatar: "林", lastMessage: "可以，明天下午三点图书馆门口交易。", time: "刚刚", unread: 2, online: true, sessionType: "goods", messageStatus: "delivered" },
  { id: "c-2", name: "维修服务群聊", avatar: "修", lastMessage: "电脑清灰今天晚上还能排一个号。", time: "10 分钟前", unread: 1, online: true, sessionType: "service", messageStatus: "read" },
  { id: "c-3", name: "跑腿订单 #ER202", avatar: "跑", lastMessage: "奶茶已经送到宿舍楼下。", time: "1 小时前", unread: 0, online: false, sessionType: "errand", messageStatus: "read" },
  { id: "c-4", name: "系统通知", avatar: "系", lastMessage: "你的商品“MacBook Air”已通过 AI 审核。", time: "2 小时前", unread: 0, online: false, sessionType: "system" },
]

export const serviceList: ServiceItem[] = [
  { id: "s-1", title: "考研数学一对一辅导", description: "研究生学长在线答疑，可按章节或真题训练。", category: "家教辅导", price: 100, unit: "小时", provider: "王学长", rating: 4.9, completedOrders: 48, tags: ["考研", "高数", "线代"] },
  { id: "s-2", title: "电脑重装与清灰", description: "系统重装、数据迁移、风扇清灰都可以做。", category: "维修服务", price: 59, unit: "次", provider: "李同学", rating: 4.8, completedOrders: 126, tags: ["电脑", "上门", "当天"] },
  { id: "s-3", title: "PPT 美化与海报设计", description: "答辩 PPT、社团海报、活动主视觉都可以接。", category: "设计服务", price: 88, unit: "份", provider: "陈同学", rating: 4.7, completedOrders: 67, tags: ["PPT", "海报", "Logo"] },
]

export const errandList: ErrandItem[] = [
  { id: "e-1", title: "帮取菜鸟驿站快递", type: "delivery", reward: 5, from: "东区菜鸟驿站", to: "西区 3 号楼", deadline: "今天 18:00 前", status: "waiting_accept", publisher: "张同学" },
  { id: "e-2", title: "代买东区食堂午饭", type: "purchase", reward: 8, to: "图书馆北门", deadline: "今天 12:00 前", status: "waiting_accept", publisher: "李同学" },
  { id: "e-3", title: "帮打印论文初稿", type: "help", reward: 10, to: "西区 2 号楼", deadline: "今天 20:00 前", status: "accepted", publisher: "周同学" },
]

export const orderList: OrderItem[] = [
  { id: "o-1", orderSn: "ORD20260611001", role: "buy", goodsId: "g-101", goodsTitle: "iPad Pro 11 英寸 M2 256G 国行", image: "/placeholder.jpg", price: 4999, otherParty: "林同学", status: "paid", statusLabel: "待发货", createdAt: "2026-06-11 20:30" },
  { id: "o-2", orderSn: "ORD20260610012", role: "buy", goodsId: "g-102", goodsTitle: "考研数学全套教材与笔记", image: "/placeholder.jpg", price: 128, otherParty: "周学姐", status: "shipped", statusLabel: "待收货", createdAt: "2026-06-10 19:00" },
  { id: "o-3", orderSn: "ORD20260609006", role: "sell", goodsId: "g-108", goodsTitle: "Air Force 1 白色 42 码", image: "/placeholder.jpg", price: 398, otherParty: "吴同学", status: "completed", statusLabel: "已完成", createdAt: "2026-06-09 17:10" },
]

export const walletRecords: WalletRecord[] = [
  { id: "w-1", title: "iPad Pro 交易收入", amount: 4999, time: "2026-06-11 21:00", type: "income", status: "completed" },
  { id: "w-2", title: "购买考研教材", amount: -128, time: "2026-06-10 19:05", type: "pay", status: "completed" },
  { id: "w-3", title: "账户充值", amount: 300, time: "2026-06-10 10:00", type: "recharge", status: "completed" },
  { id: "w-4", title: "交易资金冻结", amount: -100, time: "2026-06-09 14:30", type: "frozen", status: "frozen" },
]

export const profile = {
  name: "张三",
  grade: "计算机学院 · 2023 级",
  badge: "优质卖家",
  creditScore: 98,
  stats: [
    { label: "发布", value: 12 },
    { label: "已售", value: 8 },
    { label: "关注", value: 156 },
    { label: "粉丝", value: 89 },
  ],
}
