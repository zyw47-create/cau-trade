const BasePage = require("../../utils/base-page")
const { categories } = require("../../utils/mock-data")
const { saveDraft, getDraft, clearDraft } = require("../../utils/store")
const { ensureActionAccess, getStoredUserInfo } = require("../../utils/guards")
const request = require("../../utils/request")
const api = require("../../config/api")

const BIZ_CONFIG = {
  goods: {
    title: "发布商品",
    subtitle: "图片上传、AI 填写、草稿恢复",
    guide: "发布商品默认执行登录与实名认证检查，并按详细设计补齐图片、价格、类目和草稿校验。",
    imageLabel: "商品图片",
    nameLabel: "商品标题",
    namePlaceholder: "请输入商品标题（最多 30 字）",
    descLabel: "商品描述",
    descPlaceholder: "详细描述商品成色、配件、购买时间和交易方式...",
    categoryLabel: "商品分类",
    conditionLabel: "商品成色",
    priceLabel: "商品价格",
    aiButtonText: "AI 智能填写",
    submitText: "发布",
    successText: "发布成功",
    notices: [
      "1. 请至少上传 1 张真实商品图片，最多 9 张。",
      "2. 价格需在 0.01-99999.99 范围内的有效金额，最多两位小数。",
      "3. AI 功能不可用时不影响手动发布，草稿会自动保存在本地。"
    ],
    requireRole: ""
  },
  service: {
    title: "发布服务",
    subtitle: "服务说明、能力展示、草稿恢复",
    guide: "服务发布仅限已认证服务者，需补充擅长方向、服务时段和能力说明。",
    imageLabel: "服务展示图",
    nameLabel: "服务标题",
    namePlaceholder: "请输入服务标题（如：考研数学一对一辅导）",
    descLabel: "服务描述",
    descPlaceholder: "描述你的服务内容、服务方式、擅长方向和可预约时间...",
    categoryLabel: "服务分类",
    conditionLabel: "服务形式",
    priceLabel: "服务价格",
    aiButtonText: "AI 生成服务文案",
    submitText: "发布服务",
    successText: "服务发布成功",
    notices: [
      "1. 建议上传能体现能力的作品图或服务场景图，最多 9 张。",
      "2. 请清楚描述服务范围、响应时间和交付方式。",
      "3. 服务发布前需具备服务者角色与实名认证状态。"
    ],
    requireRole: "service"
  },
  task: {
    title: "发布跑腿任务",
    subtitle: "任务说明、赏金填写、草稿恢复",
    guide: "跑腿任务发布用于代取、代买和校园帮忙，提交前需完成实名认证。",
    imageLabel: "任务相关图片",
    nameLabel: "任务标题",
    namePlaceholder: "请输入任务标题（如：帮取菜鸟驿站快递）",
    descLabel: "任务说明",
    descPlaceholder: "描述取件地、送达地、时间要求和注意事项...",
    categoryLabel: "任务分类",
    conditionLabel: "任务紧急度",
    priceLabel: "赏金金额",
    aiButtonText: "AI 生成任务文案",
    submitText: "发布任务",
    successText: "任务发布成功",
    notices: [
      "1. 请准确填写任务地点、时间和联系方式，避免骑手误判。",
      "2. 赏金建议与距离、时效相匹配，最多两位小数。",
      "3. 跑腿任务发布前需完成实名认证，骑手接单需额外具备骑手角色。"
    ],
    requireRole: ""
  }
}

BasePage({
  data: {
    bizType: "goods",
    pageMeta: BIZ_CONFIG.goods,
    title: "",
    description: "",
    price: "",
    categoryIndex: 0,
    categories: categories.filter((item) => item.id !== "all"),
    conditionOptions: ["全新", "几乎全新", "正常使用", "明显使用"],
    conditionIndex: 1,
    images: [],
    submitting: false
  },
  onLoad(options) {
    const bizType = options.bizType && BIZ_CONFIG[options.bizType] ? options.bizType : "goods"
    const pageMeta = BIZ_CONFIG[bizType]
    const conditionOptions = bizType === "task"
      ? ["普通", "较急", "加急", "限时"]
      : bizType === "service"
        ? ["线上", "线下", "上门", "长期"]
        : ["全新", "几乎全新", "正常使用", "明显使用"]

    this.setData({
      bizType,
      pageMeta,
      conditionOptions
    })

    if (pageMeta.requireRole) {
      const userInfo = getStoredUserInfo()
      if (userInfo.role !== pageMeta.requireRole) {
        wx.showModal({
          title: "暂无权限",
          content: "当前身份不支持该发布类型，请先切换到对应角色。",
          confirmText: "知道了",
          showCancel: false
        })
        return
      }
    }

    const draft = getDraft()
    if (draft && (!draft.bizType || draft.bizType === bizType)) {
      this.setData(draft)
    }
  },
  onUnload() {
    this.persistDraft()
  },
  persistDraft() {
    saveDraft({
      bizType: this.data.bizType,
      title: this.data.title,
      description: this.data.description,
      price: this.data.price,
      categoryIndex: this.data.categoryIndex,
      conditionIndex: this.data.conditionIndex,
      images: this.data.images
    })
  },
  handleInput(event) {
    const key = event.currentTarget.dataset.key
    this.setData({ [key]: event.detail.value })
    this.persistDraft()
  },
  pickCategory(event) {
    this.setData({ categoryIndex: Number(event.detail.value) })
    this.persistDraft()
  },
  pickCondition(event) {
    this.setData({ conditionIndex: Number(event.detail.value) })
    this.persistDraft()
  },
  aiFill() {
    request.post(api.ai.generate, {
      bizType: this.data.bizType,
      title: this.data.title,
      description: this.data.description
    }).catch(() => null)
    if (this.data.bizType === "service") {
      this.setData({
        title: "考研数学一对一辅导",
        description: "可提供高数、线代、概率论系统辅导，支持线上答疑和线下讲题，适合考研冲刺阶段同学预约。",
        price: "100",
        categoryIndex: 0,
        conditionIndex: 0
      })
    } else if (this.data.bizType === "task") {
      this.setData({
        title: "帮取菜鸟驿站快递",
        description: "下午六点前从东区菜鸟驿站代取快递并送到西区 3 号楼，体积不大，拿到后可电话联系。",
        price: "5",
        categoryIndex: 2,
        conditionIndex: 1
      })
    } else {
      this.setData({
        title: "Apple MacBook Air M2 16G 512G 深空灰",
        description: "九成新，日常只在图书馆使用，电池健康优秀，包装盒和原装充电器都在。可现场验机，支持校内当面交易。",
        price: "6888",
        categoryIndex: 0,
        conditionIndex: 1
      })
    }
    this.persistDraft()
  },
  addImage() {
    const remain = 9 - this.data.images.length
    if (remain <= 0) {
      wx.showToast({
        title: "最多上传 9 张图片",
        icon: "none"
      })
      return
    }

    wx.chooseMedia({
      count: remain,
      mediaType: ["image"],
      sizeType: ["compressed"],
      success: (res) => {
        const files = (res.tempFiles || []).map((file) => ({
          id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          label: this.data.pageMeta.imageLabel,
          status: file.size > 5 * 1024 * 1024 ? "error" : "done",
          tempFilePath: file.tempFilePath,
          size: file.size
        }))
        this.setData({
          images: this.data.images.concat(files)
        })
        this.persistDraft()
      }
    })
  },
  retryImage(event) {
    const next = this.data.images.map((item) => {
      if (item.id === event.detail.id) {
        return Object.assign({}, item, { status: "done" })
      }
      return item
    })
    this.setData({ images: next })
    this.persistDraft()
  },
  removeImage(event) {
    this.setData({
      images: this.data.images.filter((item) => item.id !== event.detail.id)
    })
    this.persistDraft()
  },
  openPage(event) {
    wx.navigateTo({
      url: event.currentTarget.dataset.url
    })
  },
  submit() {
    if (this.data.submitting) {
      return
    }

    const accessConfig = {
      requireAuth: true,
      requireVerified: true
    }
    if (this.data.pageMeta.requireRole) {
      accessConfig.requireRole = this.data.pageMeta.requireRole
      accessConfig.roleMessage = "当前身份不支持该发布类型，请先切换到对应角色。"
    }

    if (!ensureActionAccess(accessConfig)) {
      return
    }

    const title = this.data.title.trim()
    const description = this.data.description.trim()
    const price = this.data.price.trim()
    const validImages = this.data.images.filter((item) => item.status === "done")
    const hasBadImage = this.data.images.some((item) => item.status === "error")

    if (!validImages.length) {
      wx.showToast({ title: `请至少上传 1 张${this.data.pageMeta.imageLabel}`, icon: "none" })
      return
    }

    if (hasBadImage) {
      wx.showToast({ title: "请处理上传失败或过大的图片", icon: "none" })
      return
    }

    if (!title || title.length < 4) {
      wx.showToast({ title: `${this.data.pageMeta.nameLabel}不少于 4 个字`, icon: "none" })
      return
    }

    if (!description || description.length < 10) {
      wx.showToast({ title: `请完善${this.data.pageMeta.descLabel}`, icon: "none" })
      return
    }

    if (!/^\d+(\.\d{1,2})?$/.test(price)) {
      wx.showToast({ title: "请输入合法金额", icon: "none" })
      return
    }

    const amount = Number(price)
    if (amount <= 0 || amount > 99999.99) {
      wx.showToast({ title: "金额需在 0.01 到 99999.99 之间", icon: "none" })
      return
    }

    this.setData({ submitting: true })
    const endpointMap = {
      goods: api.goods.publish,
      service: api.service.publish,
      task: api.errand.publish
    }
    const uploadTasks = validImages.map((item) => {
      if (item.remoteUrl) return Promise.resolve(item.remoteUrl)
      return request.upload(api.goods.uploadCredential, item.tempFilePath, {
        bizType: this.data.bizType
      }).then((result) => result.data.url)
    })

    Promise.all(uploadTasks).then((imageUrls) => request.post(endpointMap[this.data.bizType], {
      bizType: this.data.bizType,
      title,
      description,
      price: amount,
      categoryId: this.data.categories[this.data.categoryIndex].id,
      conditionLabel: this.data.conditionOptions[this.data.conditionIndex],
      images: imageUrls
    })).then(() => {
      clearDraft()
      wx.showToast({
        title: this.data.pageMeta.successText,
        icon: "success"
      })
      setTimeout(() => {
        wx.switchTab({
          url: "/pages/profile/index"
        })
      }, 500)
    }).finally(() => {
      this.setData({ submitting: false })
    })
  }
}, {
  requireAuth: true,
  requireVerified: true
})
