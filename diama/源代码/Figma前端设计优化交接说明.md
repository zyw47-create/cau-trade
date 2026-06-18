# 校园二手交易微信小程序 Figma 设计优化交接说明

## 1. 设计目标

本说明用于把当前微信小程序前端页面交给 Figma 继续做视觉优化。优化范围限定为前端页面设计，不改变现有端口、接口地址、页面路由和业务流程。

需要保持不变的内容：

- 小程序运行入口：`源代码/miniprogram`
- 后端验证码端口：`http://127.0.0.1:3001`
- 小程序页面路径：保持 `app.json` 中原有路由
- 业务接口调用：保持 `utils/api.js`、`utils/mock.js`、`utils/store.js` 的现有逻辑
- 页面功能：发布、下单、聊天、订单、实名、钱包等流程不改变

Figma 设计优化重点：

- 统一品牌视觉风格
- 优化首页、发布、消息、订单、我的五个主 tab 页面
- 提升移动端卡片层级、信息密度和按钮可识别性
- 统一字体、颜色、圆角、阴影、表单控件和状态标签

## 2. 当前正式使用的前端目录

当前微信开发者工具应打开：

```text
E:\软件\diama\源代码
```

其中小程序根目录由 `project.config.json` 指向：

```text
源代码/miniprogram
```

核心入口文件：

| 文件 | 作用 |
| --- | --- |
| `源代码/miniprogram/app.json` | 页面路由、tabBar、窗口样式配置 |
| `源代码/miniprogram/app.wxss` | 全局样式、品牌色、按钮、卡片、表单基础样式 |
| `源代码/miniprogram/app.js` | 全局配置、接口地址、mock 开关 |
| `源代码/miniprogram/utils/api.js` | 小程序 API 封装与 mock 业务流程 |
| `源代码/miniprogram/utils/mock.js` | 演示数据 |
| `源代码/miniprogram/utils/store.js` | 登录态、实名态、当前用户状态 |

## 3. 当前主 tab 页面文件

以下是当前正在使用、需要优先交给 Figma 优化的五个主页面。

| 页面 | 路由 | WXML | WXSS | JS | JSON |
| --- | --- | --- | --- | --- | --- |
| 首页 | `pages/home/home` | `pages/home/home.wxml` | `pages/home/home.wxss` | `pages/home/home.js` | `pages/home/home.json` |
| 发布 | `pages/publish/publish` | `pages/publish/publish.wxml` | `pages/publish/publish.wxss` | `pages/publish/publish.js` | `pages/publish/publish.json` |
| 消息 | `pages/chat/chat` | `pages/chat/chat.wxml` | `pages/chat/chat.wxss` | `pages/chat/chat.js` | `pages/chat/chat.json` |
| 订单 | `pages/orders/orders` | `pages/orders/orders.wxml` | `pages/orders/orders.wxss` | `pages/orders/orders.js` | `pages/orders/orders.json` |
| 我的 | `pages/profile/profile` | `pages/profile/profile.wxml` | `pages/profile/profile.wxss` | `pages/profile/profile.js` | `pages/profile/profile.json` |

## 4. 其他业务页面文件

这些页面不在主 tab 中，但会从主流程跳转进入，Figma 设计时建议作为第二批页面统一。

| 页面 | 路由 | 功能 |
| --- | --- | --- |
| 商品详情 | `pages/detail/detail` | 商品信息、卖家入口、收藏、聊天、下单 |
| 用户主页 | `pages/user/user` | 用户信用、评价、在售商品、可预约服务 |
| 校园服务 | `pages/services/services` | 服务/跑腿大厅与发布入口 |
| 服务详情 | `pages/service-detail/service-detail` | 服务说明、服务者评价、预约/接单 |
| 订单详情 | `pages/order-detail/order-detail` | 订单时间线、资金托管、售后、评价 |
| 实名认证 | `pages/verify/verify` | 学校邮箱验证码实名 |
| 管理后台 | `pages/admin/admin` | 审核、仲裁、用户治理、统计审计 |

对应文件均在：

```text
源代码/miniprogram/pages/<页面名>/
```

## 5. 可参考的 ai-ui 设计文件

`ai-ui` 目录不是当前微信开发者工具运行入口，但可作为 Figma 视觉参考。

### 5.1 ai-ui 小程序原型

可参考目录：

```text
ai-ui/miniprogram
```

重点参考：

| 文件/目录 | 可借鉴内容 |
| --- | --- |
| `ai-ui/miniprogram/app.wxss` | 粉色主题、卡片、按钮、字体、渐变、阴影 |
| `ai-ui/miniprogram/pages/home/home.wxss` | 首页 hero、圆角卡片、柔和背景 |
| `ai-ui/miniprogram/pages/publish/index.wxss` | 发布页胶囊切换、表单布局 |
| `ai-ui/miniprogram/pages/messages/index.wxss` | 消息列表样式 |
| `ai-ui/miniprogram/pages/orders/index.wxss` | 订单卡片样式 |
| `ai-ui/miniprogram/pages/profile/index.wxss` | 我的页渐变用户头图 |
| `ai-ui/miniprogram/components/*` | 自定义组件拆分方式 |

### 5.2 ai-ui Next.js 原型

可参考目录：

```text
ai-ui/app
ai-ui/components
ai-ui/lib/mock-campus-data.ts
```

重点参考：

| 文件/目录 | 可借鉴内容 |
| --- | --- |
| `ai-ui/app/page.tsx` | 首页布局、搜索、商品瀑布流、服务入口 |
| `ai-ui/app/publish/page.tsx` | 发布页分区与上传组件 |
| `ai-ui/app/messages/page.tsx` | 消息状态、会话列表 |
| `ai-ui/app/orders/page.tsx` | 订单状态卡片 |
| `ai-ui/app/profile/page.tsx` | 我的页资料卡、菜单入口 |
| `ai-ui/components/campus/*` | 商品卡、搜索栏、瀑布流、上传组件 |
| `ai-ui/components/BottomNav.tsx` | 底部导航视觉参考 |

注意：Next.js 页面不能直接用于微信小程序，只能转译视觉设计语言。

## 6. 当前已迁移到正式小程序的视觉基础

当前 `源代码/miniprogram` 已经初步迁移了一部分 `ai-ui` 风格。

| 设计项 | 当前值 |
| --- | --- |
| 页面背景 | `#FFF8FB` 到 `#FFFFFF` 的浅粉白渐变 |
| 品牌主色 | `#E91E63` |
| 辅助渐变 | `#E91E63` 到 `#FF6B6B` |
| 强调橙色 | `#FFB74D` |
| 价格色 | `#C2185B` |
| 正文色 | `#2A2528` |
| 次级文字 | `#8A7D85` |
| 卡片背景 | `rgba(255,255,255,0.96)` |
| 卡片圆角 | `30rpx` 到 `36rpx` |
| 按钮圆角 | `999rpx` 胶囊按钮 |
| 输入框圆角 | `26rpx` |
| 阴影 | 粉色低透明阴影 |
| 字体 | `PingFang SC`, `Microsoft YaHei`, 系统无衬线 |

## 7. 建议 Figma 画板规格

建议按照微信小程序移动端设计稿制作。

| 项目 | 建议 |
| --- | --- |
| 画板宽度 | 375px |
| 画板高度 | 812px 或 844px |
| 安全区 | 顶部保留微信导航栏区域，底部保留 tabBar 和 iPhone Home Indicator |
| 设计单位 | Figma 使用 px；落地到小程序时换算到 rpx |
| 页面数量 | 先做 5 个主 tab 页面，再补详情、订单详情、实名页 |
| 命名方式 | `01-首页`、`02-发布`、`03-消息`、`04-订单`、`05-我的` |

## 8. 页面设计优化要求

### 8.1 首页

对应文件：

```text
源代码/miniprogram/pages/home/home.wxml
源代码/miniprogram/pages/home/home.wxss
源代码/miniprogram/pages/home/home.js
```

当前功能：

- 展示平台 hero 区
- 搜索商品、服务和跑腿任务
- 三个业务 Tab：二手闲置、校园服务、跑腿任务
- 商品分类横向滚动
- 商品瀑布流
- 服务/跑腿列表
- 支持聊天、下单、预约、抢单

Figma 优化方向：

- hero 区增加校园可信交易氛围，但不要做大面积营销海报
- 搜索框与业务 Tab 形成一个独立搜索控制区
- 商品卡片保留双列瀑布流，但增强标题、价格、地点、卖家信用的层级
- 服务和跑腿卡片使用单列列表，突出状态、报酬和行动按钮
- 保持信息密度，避免过度空洞

### 8.2 发布

对应文件：

```text
源代码/miniprogram/pages/publish/publish.wxml
源代码/miniprogram/pages/publish/publish.wxss
源代码/miniprogram/pages/publish/publish.js
```

当前功能：

- 发布二手闲置
- 发布校园服务
- 发布跑腿任务
- AI 辅助生成描述
- 实名与违禁词校验
- 金额、地点、描述校验

Figma 优化方向：

- 顶部明确“发布类型”三段式选择
- 表单采用分组布局：基础信息、价格/地点、描述、审核提示
- AI 辅助描述按钮视觉上作为次级功能，不要喧宾夺主
- 提交按钮固定在表单底部，强化主操作
- 错误提示、审核提示、实名提示用统一状态卡片样式

### 8.3 消息

对应文件：

```text
源代码/miniprogram/pages/chat/chat.wxml
源代码/miniprogram/pages/chat/chat.wxss
源代码/miniprogram/pages/chat/chat.js
```

当前功能：

- 会话列表
- 会话详情
- 展示交易对象和业务类型
- 消息证据哈希
- 消息发送
- 违禁词拦截

Figma 优化方向：

- 会话列表突出未读/消息数量、交易对象、最后一条消息
- “哈希留痕”作为可信交易标签
- 聊天页区分己方/对方气泡颜色
- 底部输入栏保持固定，适配安全区
- 证据哈希信息弱化显示，避免干扰主消息阅读

### 8.4 订单

对应文件：

```text
源代码/miniprogram/pages/orders/orders.wxml
源代码/miniprogram/pages/orders/orders.wxss
源代码/miniprogram/pages/orders/orders.js
```

当前功能：

- 二手、服务、跑腿订单统一列表
- 展示订单号、订单状态、进度、金额、交易对象
- 支付、取消、履约、售后、投诉、聊天、确认完成、评价

Figma 优化方向：

- 订单卡片顶部放标题、订单状态和订单号
- 中部用进度模块展示当前节点
- 售后状态独立使用警告色卡片
- 底部操作按钮按主次分层，主按钮只保留一个视觉焦点
- 列表页避免按钮过多导致拥挤，可考虑更多操作折叠为二级入口

### 8.5 我的

对应文件：

```text
源代码/miniprogram/pages/profile/profile.wxml
源代码/miniprogram/pages/profile/profile.wxss
源代码/miniprogram/pages/profile/profile.js
```

当前功能：

- 登录/退出
- 展示昵称、用户名、角色、状态、信用分、余额、收藏
- 快捷入口：消息、实名、订单、后台
- 账号资料编辑
- 钱包充值与流水
- 我的收藏
- 我的发布
- 收益提现
- 账号设置与角色申请

Figma 优化方向：

- 顶部用户卡片使用渐变背景，突出身份、信用分和余额
- 快捷入口使用 4 宫格图标按钮
- 折叠区域统一为卡片组，降低页面杂乱感
- 钱包、收藏、发布、收益提现保持信息密度，但增强分组标题
- 危险操作“退出登录”使用独立警示样式

## 9. 设计系统建议

### 9.1 色彩

| Token | 色值 | 用途 |
| --- | --- | --- |
| `Brand/Primary` | `#E91E63` | 主按钮、tabBar 选中、关键状态 |
| `Brand/GradientStart` | `#E91E63` | 渐变起点 |
| `Brand/GradientEnd` | `#FF6B6B` | 渐变终点 |
| `Brand/WarmAccent` | `#FFB74D` | 用户卡片辅助色 |
| `Text/Primary` | `#2A2528` | 标题和正文 |
| `Text/Secondary` | `#8A7D85` | 辅助说明 |
| `Surface/Page` | `#FFF8FB` | 页面背景 |
| `Surface/Card` | `#FFFFFF` | 卡片背景 |
| `Surface/Soft` | `#FFF1F6` | 标签、弱按钮背景 |
| `Status/Success` | `#027A48` | 已实名、成功状态 |
| `Status/Warning` | `#9C6A00` | 待审核、售后提示 |
| `Status/Danger` | `#EF4444` | 退出、拒绝、错误 |

### 9.2 字体

| 层级 | 建议尺寸 | 字重 | 用途 |
| --- | --- | --- | --- |
| 页面标题 | 20px / 40rpx | 800 | 页面主标题 |
| 卡片标题 | 16px / 32rpx | 800 | 商品、订单、分区标题 |
| 正文 | 14px / 28rpx | 400-600 | 描述文本 |
| 辅助文本 | 12px / 24rpx | 400 | 时间、地点、说明 |
| 标签文本 | 11px / 22rpx | 700 | 状态标签 |

### 9.3 组件

建议在 Figma 中建立以下组件：

| 组件 | 变体 |
| --- | --- |
| Button | Primary、Secondary、Danger、Disabled、Small |
| Input | Default、Focused、Error |
| Textarea | Default、Focused、Error |
| Tag | Brand、Success、Warning、Neutral |
| Card | Basic、Elevated、Warning |
| Tab Pill | Active、Inactive |
| Product Card | Goods、Service、Errand |
| Order Card | Pending、Paid、Processing、Refunding、Completed |
| User Header Card | Login、Guest |
| Bottom Tab Item | Active、Inactive |

## 10. Figma 画板拆分建议

建议在 Figma 文件中创建以下页面：

| Figma 页面 | 内容 |
| --- | --- |
| `00-Design System` | 颜色、字体、间距、圆角、阴影、组件 |
| `01-Home` | 首页完整页面 |
| `02-Publish` | 发布页三种发布类型状态 |
| `03-Messages` | 消息列表、聊天会话 |
| `04-Orders` | 订单列表、不同状态卡片 |
| `05-Profile` | 未登录、已登录、钱包/收藏展开状态 |
| `06-Detail Pages` | 商品详情、服务详情、订单详情 |
| `07-Auth Admin` | 实名认证、管理后台 |

## 11. 给 Figma 的直接生成提示词

可以把下面这段直接复制给 Figma 设计助手或设计师：

```text
请基于微信小程序“校园二手交易平台”现有源码进行移动端页面设计优化，不改变页面路由、接口、端口和业务流程。正式源码位于“源代码/miniprogram”，请优先设计五个主 tab 页面：首页、发布、消息、订单、我的。

设计风格参考 ai-ui/miniprogram 和 ai-ui/app：浅粉白背景、品牌主色 #E91E63、辅助渐变 #E91E63 到 #FF6B6B、卡片大圆角、低透明粉色阴影、胶囊按钮、柔和表单输入框。页面尺寸按微信小程序移动端 375x812 设计，底部保留 tabBar 和安全区。

需要输出：
1. 设计系统：颜色、字体、按钮、输入框、标签、卡片、底部导航、商品卡、订单卡、用户信息卡。
2. 首页：hero、搜索、业务 Tab、分类横滑、商品瀑布流、服务/跑腿列表。
3. 发布：发布类型切换、基础信息表单、价格/地点、描述、AI辅助描述、审核提示、提交按钮。
4. 消息：会话列表、交易对象、最后消息、哈希留痕标签、聊天气泡、底部输入栏。
5. 订单：订单状态卡、进度卡、售后提示、金额、操作按钮。
6. 我的：用户渐变卡、信用分、余额、收藏数、快捷入口、资料、钱包、收藏、发布、提现、设置。

注意：设计应保持本科软件工程项目演示风格，页面要清晰、可信、适合答辩展示；不要做纯营销页面，不要牺牲信息密度。
```

## 12. 落地规则

Figma 设计完成后，落地到小程序时建议遵循：

- 优先修改 `.wxss`，不要轻易改 `.js` 业务逻辑
- 如需调整结构，优先小范围修改 `.wxml`
- 不新增第三方小程序组件库，除非明确决定引入
- 不改变 `app.js` 中端口、接口地址和 `useMock` 设置
- 不改变 `app.json` 页面路径
- 修改后在微信开发者工具中重新编译并清缓存验证

## 13. 风险分析

| 风险 | 影响 | 建议 |
| --- | --- | --- |
| Figma 设计过度偏 Web/Next.js | 小程序落地困难 | 保持微信小程序 375px 移动端画板，避免 Web 大屏布局 |
| 页面结构大改 | 可能影响跳转和事件绑定 | 优先只改样式，必要时局部调整 WXML |
| 组件过度复杂 | 答辩演示和维护成本上升 | 保持原生组件和少量自定义样式 |
| 品牌色与旧页面混用 | 视觉不统一 | 全部主流程统一使用 `#E91E63` 体系 |
| 按钮过多导致拥挤 | 订单页可读性下降 | 主操作突出，次操作弱化或折叠 |

## 14. 最终推荐方案

推荐采用“正式小程序源码 + ai-ui 视觉语言 + Figma 设计系统”的方案：

| 方案 | 原理 | 优势 | 劣势 | 适用场景 |
| --- | --- | --- | --- | --- |
| 只改 `源代码/miniprogram` 样式 | 保持业务代码，优化 WXSS | 风险低、端口不变、可快速验证 | 设计自由度有限 | 当前最推荐 |
| 完整迁移 `ai-ui/miniprogram` | 用另一套小程序替换正式源码 | 视觉更统一 | 业务流程可能缺失，风险高 | 原型展示 |
| 用 Next.js 页面替代小程序 | Web 前端重做 | 设计表现强 | 不适用于微信小程序端 | Web 管理端或官网 |

最终建议：先在 Figma 完成五个主 tab 的统一设计，再按设计稿回填 `源代码/miniprogram` 的 WXSS 和少量 WXML。这样端口、路由、接口和业务逻辑最稳定。

结论置信度：高。
