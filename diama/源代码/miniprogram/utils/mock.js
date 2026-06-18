const categories = ['教材资料', '数码产品', '生活用品', '运动用品', '校园服务', '其他']

const users = [
  { id: 1, nickname: '校园同学', username: 'campus_user', role: 'user', status: 'active', verified: true, creditScore: 100, college: '软件学院', campus: '北区宿舍', major: '软件工程', grade: '2023级', responseTime: '10分钟内', lastActive: '刚刚活跃', bio: '偏好当面验货和资金托管，常在北区、图书馆交易。', tradeTags: ['已实名', '回复快', '支持当面验货'] },
  { id: 2, nickname: '数院同学', username: 'math_chen', role: 'user', status: 'active', verified: true, creditScore: 96, college: '数学学院', campus: '北区宿舍', major: '数学与应用数学', grade: '2022级', responseTime: '15分钟内', lastActive: '今日活跃', bio: '长期出教材、讲义和复习资料，资料会按章节整理。', tradeTags: ['教材资料多', '准时交易', '描述清楚'] },
  { id: 3, nickname: '软件工程同学', username: 'se_luo', role: 'user', status: 'active', verified: true, creditScore: 91, college: '软件学院', campus: '东区宿舍', major: '软件工程', grade: '2022级', responseTime: '30分钟内', lastActive: '今日活跃', bio: '数码配件较多，支持现场试用，交易前会说明瑕疵。', tradeTags: ['支持验货', '数码配件', '售后配合'] },
  { id: 4, nickname: '南区同学', username: 'south_li', role: 'user', status: 'banned', verified: true, creditScore: 58, college: '管理学院', campus: '南区宿舍', major: '工商管理', grade: '2021级', responseTime: '较慢', lastActive: '已限制', bio: '账号因历史违规被限制展示，交易需谨慎。', tradeTags: ['风险账号', '平台限制'] },
  { id: 5, nickname: '文印小站', username: 'print_station', role: 'provider', status: 'active', verified: true, creditScore: 98, college: '文学院', campus: '教学楼A区', major: '校园服务', grade: '服务号', responseTime: '5分钟内', lastActive: '刚刚活跃', bio: '提供资料整理、打印、装订和晚自习后交付，支持服务完成后评价。', tradeTags: ['服务者认证', '交付稳定', '可预约'] },
  { id: 6, nickname: '跑腿同学', username: 'runner_zhao', role: 'rider', status: 'active', verified: true, creditScore: 97, college: '体育学院', campus: '东区操场', major: '体育教育', grade: '2022级', responseTime: '5分钟内', lastActive: '今日活跃', bio: '熟悉东区、北区和图书馆路线，接单后会在聊天中同步进度。', tradeTags: ['骑手认证', '配送及时', '过程留痕'] },
  { id: 7, nickname: '信工同学', username: 'info_wang', role: 'user', status: 'active', verified: true, creditScore: 98, college: '信息学院', campus: '东区宿舍', major: '计算机科学', grade: '2021级', responseTime: '20分钟内', lastActive: '今日活跃', bio: '提供学习资料和基础答疑，交易地点多在东区宿舍附近。', tradeTags: ['学习辅导', '好评多', '沟通耐心'] },
  { id: 8, nickname: '外语学院同学', username: 'english_lin', role: 'user', status: 'active', verified: true, creditScore: 95, college: '外国语学院', campus: '外语楼', major: '英语', grade: '2022级', responseTime: '20分钟内', lastActive: '今日活跃', bio: '常出四六级资料和考试耳机，支持现场测试频段。', tradeTags: ['考试用品', '支持测试', '描述准确'] },
  { id: 9, nickname: '北区服务号', username: 'north_helper', role: 'provider', status: 'active', verified: true, creditScore: 94, college: '信息学院', campus: '北区综合楼', major: '校园服务', grade: '服务号', responseTime: '10分钟内', lastActive: '今日活跃', bio: '提供简历排版、打印和基础材料整理，适合求职季快速处理。', tradeTags: ['服务者认证', '简历排版', '北区交付'] }
]

const goods = [
  {
    id: 101,
    title: '九成新高数教材与习题册',
    category: '教材资料',
    price: 26,
    status: 'on_sale',
    sellerId: 2,
    sellerName: '数院同学',
    username: 'math_chen',
    image: '',
    desc: '教材保存完整，附带课堂笔记，适合期末复习。',
    location: '北区宿舍',
    condition: '九成新',
    favorite: false,
    favoriteCount: 8,
    auditNote: 'AI审核通过',
    comments: [
      { id: 1, user: '信工同学', score: 5, content: '教材保存很好，交易也准时。' }
    ]
  },
  {
    id: 102,
    title: '蓝牙键盘 低噪轻薄款',
    category: '数码产品',
    price: 58,
    status: 'on_sale',
    sellerId: 3,
    sellerName: '软件工程同学',
    username: 'se_luo',
    image: '',
    desc: '可连接平板和电脑，电量正常，支持现场验货。',
    location: '图书馆门口',
    condition: '八成新',
    favorite: true,
    favoriteCount: 15,
    auditNote: 'AI审核通过',
    comments: [
      { id: 2, user: '东区同学', score: 4, content: '键盘手感不错，描述准确。' }
    ]
  },
  {
    id: 103,
    title: '宿舍折叠收纳箱两只',
    category: '生活用品',
    price: 18,
    status: 'on_sale',
    sellerId: 4,
    sellerName: '南区同学',
    username: 'south_li',
    image: '',
    desc: '搬宿舍闲置，干净无破损。',
    location: '南区食堂',
    condition: '七成新',
    favorite: false,
    favoriteCount: 3,
    auditNote: 'AI审核通过',
    comments: []
  },
  {
    id: 105,
    title: '考研政治资料与网课讲义',
    category: '教材资料',
    price: 35,
    status: 'on_sale',
    sellerId: 2,
    sellerName: '数院同学',
    username: 'math_chen',
    image: '',
    desc: '资料按章节整理好，重点页有标注，适合暑假复习。',
    location: '图书馆二楼',
    condition: '八成新',
    favorite: true,
    favoriteCount: 11,
    auditNote: 'AI审核通过',
    comments: [
      { id: 3, user: '校园同学', score: 5, content: '资料分类很清楚，适合复习。' }
    ]
  },
  {
    id: 106,
    title: '宿舍小台灯 可调亮度',
    category: '生活用品',
    price: 22,
    status: 'on_sale',
    sellerId: 3,
    sellerName: '软件工程同学',
    username: 'se_luo',
    image: '',
    desc: '三档亮度，晚自习和宿舍桌面都能用，支持现场验货。',
    location: '东区操场',
    condition: '九成新',
    favorite: true,
    favoriteCount: 6,
    auditNote: 'AI审核通过',
    comments: []
  },
  {
    id: 104,
    title: '待复核商品',
    category: '生活用品',
    price: 12,
    status: 'pending',
    sellerId: 1,
    sellerName: '校园同学',
    username: 'campus_user',
    image: '',
    desc: '该商品命中风险词，需要管理员人工复核后才能上架。',
    location: '东区操场',
    condition: '八成新',
    favorite: false,
    favoriteCount: 0,
    auditNote: '命中人工复核规则',
    comments: []
  },
  {
    id: 107,
    title: '自用羽毛球拍 单拍带拍套',
    category: '运动用品',
    price: 45,
    status: 'on_sale',
    sellerId: 1,
    sellerName: '校园同学',
    username: 'campus_user',
    image: '',
    desc: '拍框无裂，线还有弹性，适合体育课和日常练习。',
    location: '体育馆门口',
    condition: '八成新',
    favorite: false,
    favoriteCount: 4,
    auditNote: 'AI审核通过',
    comments: []
  },
  {
    id: 108,
    title: '闲置计算器 考试可用款',
    category: '数码产品',
    price: 30,
    status: 'removed',
    sellerId: 1,
    sellerName: '校园同学',
    username: 'campus_user',
    image: '',
    desc: '功能正常，因暂不出售已下架。',
    location: '软件学院楼下',
    condition: '七成新',
    favorite: false,
    favoriteCount: 2,
    auditNote: '卖家主动下架',
    comments: []
  },
  {
    id: 109,
    title: '四六级听力耳机',
    category: '数码产品',
    price: 28,
    status: 'on_sale',
    sellerId: 8,
    sellerName: '外语学院同学',
    username: 'english_lin',
    image: '',
    desc: '学校考试频段可用，外壳有轻微使用痕迹。',
    location: '外语楼大厅',
    condition: '八成新',
    favorite: false,
    favoriteCount: 9,
    auditNote: 'AI审核通过',
    comments: []
  },
  {
    id: 110,
    title: '宿舍床上小书桌',
    category: '生活用品',
    price: 32,
    status: 'on_sale',
    sellerId: 7,
    sellerName: '信工同学',
    username: 'info_wang',
    image: '',
    desc: '桌腿稳定，可折叠，适合宿舍学习和放电脑。',
    location: '东区宿舍',
    condition: '九成新',
    favorite: false,
    favoriteCount: 5,
    auditNote: 'AI审核通过',
    comments: []
  }
]

const services = [
  {
    id: 201,
    type: 'service',
    title: '资料整理与打印代办',
    price: 6,
    provider: '文印小站',
    username: 'print_station',
    status: 'on_sale',
    desc: '支持资料整理、打印、装订，可约晚自习后交付。',
    earnings: 0
  },
  {
    id: 202,
    type: 'errand',
    title: '南区到北区文件配送',
    price: 5,
    provider: '待接单',
    username: 'campus_user',
    status: 'waiting_accept',
    desc: '取件地点南区宿舍，送到北区实验楼。',
    earnings: 0
  },
  {
    id: 203,
    type: 'service',
    title: '期末 C 语言答疑半小时',
    price: 15,
    provider: '信工同学',
    username: 'info_wang',
    status: 'on_sale',
    desc: '可在图书馆或线上答疑，适合考前查漏补缺。',
    earnings: 0
  },
  {
    id: 204,
    type: 'service',
    title: '简历排版与打印',
    price: 10,
    provider: '北区服务号',
    username: 'north_helper',
    status: 'on_sale',
    desc: '提供简历格式整理、黑白打印和装订。',
    earnings: 0
  },
  {
    id: 205,
    type: 'errand',
    title: '帮取北门外卖送到实验楼',
    price: 4,
    provider: '待接单',
    username: 'se_luo',
    status: 'waiting_accept',
    desc: '北门外卖架取餐，送到软件学院实验楼一层。',
    earnings: 0
  },
  {
    id: 206,
    type: 'errand',
    title: '图书馆还书跑腿',
    price: 6,
    provider: '跑腿同学',
    username: 'runner_zhao',
    status: 'accepted',
    desc: '从东区宿舍取两本书，还到图书馆自助还书机。',
    earnings: 6
  }
]

const orders = [
  {
    orderSn: 'CT202606120001',
    itemId: 101,
    itemType: 'goods',
    title: '九成新高数教材与习题册',
    amount: 26,
    status: 'paid',
    role: 'buyer',
    sellerName: '数院同学',
    sellerUsername: 'math_chen',
    counterpartyName: '数院同学',
    counterpartyUsername: 'math_chen',
    counterpartyLabel: '卖家',
    fundStatus: 'frozen',
    createdAt: '06-12 09:48',
    paidAt: '06-12 09:50',
    remark: '今晚北区宿舍楼下交易',
    progressText: '资金托管中，等待卖家按约定交付',
    events: ['创建订单', '买家支付，资金托管'],
    timeline: [
      { title: '创建订单', desc: '买家提交高数教材订单，等待支付。', time: '06-12 09:48', done: true },
      { title: '资金托管', desc: '买家已支付，资金冻结在平台托管账户。', time: '06-12 09:50', done: true },
      { title: '等待交付', desc: '卖家需按约定在北区宿舍楼下交付教材。', time: '待完成', done: false }
    ]
  },
  {
    orderSn: 'CT202606120002',
    itemId: 102,
    itemType: 'goods',
    title: '蓝牙键盘 低噪轻薄款',
    amount: 58,
    status: 'refunding',
    role: 'buyer',
    sellerName: '软件工程同学',
    sellerUsername: 'se_luo',
    counterpartyName: '软件工程同学',
    counterpartyUsername: 'se_luo',
    counterpartyLabel: '卖家',
    fundStatus: 'frozen',
    createdAt: '06-12 09:58',
    paidAt: '06-12 10:00',
    remark: '描述与实物不符，申请售后',
    progressText: '售后仲裁中，资金继续托管',
    events: ['创建订单', '买家支付，资金托管', '买家发起售后：描述与实物不符'],
    timeline: [
      { title: '创建订单', desc: '买家提交蓝牙键盘订单。', time: '06-12 09:58', done: true },
      { title: '资金托管', desc: '买家支付成功，资金进入托管。', time: '06-12 10:00', done: true },
      { title: '提交售后', desc: '买家反馈空格键回弹异常，申请平台介入。', time: '06-12 10:40', done: true },
      { title: '平台核验', desc: '系统汇总聊天记录、交易凭证和卖家回复，等待仲裁。', time: '进行中', done: false }
    ],
    refund: {
      status: 'arbitrating',
      statusText: '平台介入中',
      reason: '描述与实物不符，空格键回弹异常，和发布页“按键正常”不一致。',
      sellerReply: '卖家表示可现场复验，平台正在核对聊天证据。',
      evidence: ['聊天记录哈希 SHA256-0102', '现场验货照片 keyboard-issue.jpg'],
      progress: [
        { title: '买家提交售后', desc: '上传问题说明和现场照片，资金保持冻结。', time: '06-12 10:40', done: true },
        { title: '卖家已回复', desc: '卖家表示可现场复验，暂未达成一致。', time: '06-12 10:45', done: true },
        { title: '平台仲裁中', desc: '管理员将结合聊天证据链和凭证处理。', time: '进行中', done: false }
      ]
    }
  },
  {
    orderSn: 'SV202606120001',
    itemId: 201,
    itemType: 'service',
    title: '资料整理与打印代办',
    amount: 6,
    status: 'paid',
    role: 'buyer',
    sellerName: '文印小站',
    sellerUsername: 'print_station',
    counterpartyName: '文印小站',
    counterpartyUsername: 'print_station',
    counterpartyLabel: '服务者',
    fundStatus: 'frozen',
    createdAt: '06-12 09:08',
    paidAt: '06-12 09:10',
    remark: '晚自习后交付',
    progressText: '服务费已托管，等待服务者履约',
    events: ['预约服务', '服务费托管'],
    timeline: [
      { title: '预约服务', desc: '买家预约资料整理与打印代办。', time: '06-12 09:08', done: true },
      { title: '服务费托管', desc: '服务费已冻结，服务完成后结算给服务者。', time: '06-12 09:10', done: true },
      { title: '等待交付', desc: '服务者晚自习后交付打印资料。', time: '待完成', done: false }
    ]
  },
  {
    orderSn: 'ER202606110001',
    itemId: 203,
    itemType: 'errand',
    title: '东区到图书馆资料代取',
    amount: 12,
    status: 'completed',
    role: 'buyer',
    sellerName: '跑腿同学',
    sellerUsername: 'runner_zhao',
    counterpartyName: '跑腿同学',
    counterpartyUsername: 'runner_zhao',
    counterpartyLabel: '骑手',
    fundStatus: 'settled',
    createdAt: '06-11 18:50',
    paidAt: '06-11 18:50',
    completedAt: '06-11 20:00',
    remark: '跑腿任务完成',
    progressText: '发布者已确认完成，收益已结算',
    events: ['跑腿费托管', '骑手接单', '开始配送', '发布者确认完成，收益结算'],
    timeline: [
      { title: '跑腿费托管', desc: '发布者预付跑腿费，平台冻结托管。', time: '06-11 18:50', done: true },
      { title: '骑手接单', desc: '跑腿同学接单成功。', time: '06-11 19:00', done: true },
      { title: '开始配送', desc: '骑手从东区打印店取件，送往图书馆二楼。', time: '06-11 19:12', done: true },
      { title: '确认完成', desc: '发布者确认资料送达，跑腿收益结算。', time: '06-11 20:00', done: true }
    ]
  },
  {
    orderSn: 'CT202606120003',
    itemId: 105,
    itemType: 'goods',
    title: '考研政治资料与网课讲义',
    amount: 35,
    status: 'completed',
    role: 'buyer',
    sellerName: '数院同学',
    sellerUsername: 'math_chen',
    counterpartyName: '数院同学',
    counterpartyUsername: 'math_chen',
    counterpartyLabel: '卖家',
    fundStatus: 'settled',
    createdAt: '06-12 14:28',
    paidAt: '06-12 14:30',
    completedAt: '06-12 15:00',
    remark: '资料当面验收完成',
    progressText: '订单已完成，可查看交易评价',
    events: ['创建订单', '买家支付，资金托管', '买家确认收货，资金结算', '买家发表评价'],
    timeline: [
      { title: '创建订单', desc: '买家提交考研政治资料订单。', time: '06-12 14:28', done: true },
      { title: '资金托管', desc: '买家支付成功，资金进入平台托管。', time: '06-12 14:30', done: true },
      { title: '确认完成', desc: '买家当面验收资料并确认收货。', time: '06-12 15:00', done: true },
      { title: '评价完成', desc: '买家对卖家进行信用评价。', time: '06-12 15:02', done: true }
    ]
  }
]

const walletLogs = [
  { id: 4, type: 'pay', title: '预约服务 SV202606120001', amount: -6, balanceAfter: 38.6, time: '06-12 09:10' },
  { id: 3, type: 'pay', title: '支付订单 CT202606120002', amount: -58, balanceAfter: 44.6, time: '06-12 10:00' },
  { id: 2, type: 'pay', title: '支付订单 CT202606120001', amount: -26, balanceAfter: 102.6, time: '06-12 09:50' },
  { id: 1, type: 'recharge', title: '账户充值', amount: 128.6, balanceAfter: 128.6, time: '06-12 09:00' }
]

const userReviews = [
  { id: 1, toUserId: 2, fromName: '信工同学', fromUsername: 'info_wang', score: 5, content: '教材保存很好，交易准时，沟通也清楚。', time: '06-10 20:30' },
  { id: 2, toUserId: 3, fromName: '校园同学', fromUsername: 'campus_user', score: 4, content: '键盘描述基本准确，现场验货流程顺利。', time: '06-12 10:45' },
  { id: 3, toUserId: 1, fromName: '软件工程同学', fromUsername: 'se_luo', score: 5, content: '羽毛球拍当面交易很爽快，商品状态和描述一致。', time: '06-12 19:25' },
  { id: 4, toUserId: 5, fromName: '校园同学', fromUsername: 'campus_user', score: 5, content: '打印装订速度快，交付时间准确。', time: '06-12 16:10' },
  { id: 5, toUserId: 9, fromName: '校园同学', fromUsername: 'campus_user', score: 5, content: '简历排版规范，黑白打印清晰。', time: '06-12 19:30' }
]

const conversations = [
  {
    id: 'goods-101',
    title: '九成新高数教材与习题册',
    peer: '数院同学',
    peerUsername: 'math_chen',
    businessType: 'goods',
    businessId: 101,
    messages: [
      {
        id: 1,
        from: 'seller',
        senderName: '数院同学',
        senderUsername: 'math_chen',
        content: '教材还在，可以今天晚上北区宿舍楼下交易。',
        time: '20:10',
        hash: 'SHA256-0001'
      },
      {
        id: 2,
        from: 'me',
        senderName: '校园同学',
        senderUsername: 'campus_user',
        content: '好的，我下单后过去拿。',
        time: '20:12',
        hash: 'SHA256-0002'
      }
    ]
  },
  {
    id: 'goods-102',
    title: '蓝牙键盘 低噪轻薄款',
    peer: '软件工程同学',
    peerUsername: 'se_luo',
    businessType: 'goods',
    businessId: 102,
    messages: [
      {
        id: 3,
        from: 'seller',
        senderName: '软件工程同学',
        senderUsername: 'se_luo',
        content: '键盘可以连接平板，按键都正常。',
        time: '19:30',
        hash: 'SHA256-0101'
      },
      {
        id: 4,
        from: 'me',
        senderName: '校园同学',
        senderUsername: 'campus_user',
        content: '可以在图书馆门口验货吗？',
        time: '19:33',
        hash: 'SHA256-0102'
      }
    ]
  },
  {
    id: 'goods-105',
    title: '考研政治资料与网课讲义',
    peer: '数院同学',
    peerUsername: 'math_chen',
    businessType: 'goods',
    businessId: 105,
    messages: [
      {
        id: 5,
        from: 'seller',
        senderName: '数院同学',
        senderUsername: 'math_chen',
        content: '资料是今年最新版，讲义和错题都在。',
        time: '18:20',
        hash: 'SHA256-0201'
      }
    ]
  }
]

const withdraws = [
  {
    id: 301,
    applicant: '校园同学',
    role: 'rider',
    amount: 12,
    status: 'pending',
    reason: '跑腿收益提现'
  }
]

const auditLogs = [
  { id: 1, action: 'AI审核通过', target: '九成新高数教材与习题册', operator: 'system', time: '06-12 09:20' },
  { id: 2, action: '售后申请进入仲裁池', target: 'CT202606120002', operator: 'system', time: '06-12 10:40' }
]

const stats = {
  users: 128,
  goodsOnSale: 36,
  pendingGoods: 1,
  refundingOrders: 1,
  todayAmount: 326.5,
  abnormalOrders: 0
}

const opsHealth = {
  status: 'healthy',
  mysqlVersion: '8.0.46',
  baseTableCount: 25,
  viewCount: 11,
  procedureCount: 12,
  triggerCount: 8,
  eventCount: 2,
  abnormalWalletOrders: 0,
  staleIdempotencyLocks: 0,
  latestBackup: {
    fileName: 'campus_trade-full-20260612_142146.sql',
    sizeBytes: 89732,
    sha256: '8260C4287457C1D3D08A221518730BEA9216DA870CF6F5742C0AA6E81B96262D',
    time: '06-12 14:21'
  },
  events: [
    { name: 'ev_campus_daily_stats', status: 'DISABLED', schedule: '每天', lastExecuted: '-' },
    { name: 'ev_campus_cancel_unpaid_orders', status: 'DISABLED', schedule: '每10分钟', lastExecuted: '-' }
  ],
  checkedAt: '06-12 14:22'
}

const securityChecks = [
  { id: 1, name: '应用账号无DDL权限', status: 'pass', value: '0项违规' },
  { id: 2, name: '不可变证据触发器', status: 'pass', value: '8/8' },
  { id: 3, name: '资金对账异常', status: 'pass', value: '0笔' },
  { id: 4, name: '过期幂等锁', status: 'pass', value: '0个' },
  { id: 5, name: '待处理敏感事项', status: 'warn', value: '售后1 / 提现1 / 商品1' }
]

const aiRules = {
  textAudit: true,
  imageAudit: true,
  manualRiskLevel: 'manual',
  keywords: '违规,仿冒,危险品',
  updatedAt: '06-12 09:00'
}

const emailCodes = {}

module.exports = {
  categories,
  users,
  goods,
  services,
  orders,
  walletLogs,
  userReviews,
  conversations,
  withdraws,
  auditLogs,
  stats,
  opsHealth,
  securityChecks,
  aiRules,
  emailCodes
}
