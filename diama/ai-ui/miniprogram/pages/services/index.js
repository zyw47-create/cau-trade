const BasePage = require("../../utils/base-page")
const { serviceList } = require("../../utils/mock-data")
const { ensureActionAccess } = require("../../utils/guards")

BasePage({
  data: {
    keyword: "",
    rawServiceList: serviceList,
    serviceList,
    categories: [
      { name: "全部", active: true },
      { name: "家教辅导", active: false },
      { name: "维修服务", active: false },
      { name: "设计服务", active: false }
    ],
    activeCategory: "全部",
    authInfo: {
      badge: "服务者认证",
      title: "发布服务前需完成实名认证与服务能力说明",
      items: [
        "实名认证通过后展示已认证服务者标识",
        "首次发布需填写擅长方向、服务时段与作品说明",
        "评分过低或投诉过多时将限制服务曝光"
      ]
    }
  },
  onSearchInput(event) {
    this.setData({
      keyword: event.detail.value
    })
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.filterList(), 300)
  },
  onSearch(event) {
    this.setData({
      keyword: event.detail.value.trim()
    })
    this.filterList()
  },
  onSearchCancel() {
    this.setData({
      keyword: ""
    })
    this.filterList()
  },
  chooseCategory(event) {
    const activeCategory = event.currentTarget.dataset.name
    this.setData({
      activeCategory,
      categories: this.data.categories.map((item) => Object.assign({}, item, {
        active: item.name === activeCategory
      }))
    })
    this.filterList()
  },
  filterList() {
    const keyword = this.data.keyword.trim()
    const activeCategory = this.data.activeCategory
    const nextList = this.data.rawServiceList.filter((item) => {
      const matchCategory = activeCategory === "全部" || item.category === activeCategory
      const matchKeyword = !keyword || item.title.includes(keyword) || item.description.includes(keyword) || item.tags.join(" ").includes(keyword)
      return matchCategory && matchKeyword
    })
    this.setData({
      serviceList: nextList
    })
  },
  openErrand() {
    wx.navigateTo({
      url: "/pages/errand/index"
    })
  },
  openProfile() {
    wx.switchTab({
      url: "/pages/profile/index"
    })
  },
  openPublish() {
    if (!ensureActionAccess({
      requireAuth: true,
      requireVerified: true,
      requireRole: "service",
      roleMessage: "请先在个人中心切换为服务者并完成认证"
    })) {
      return
    }

    wx.navigateTo({
      url: "/pages/publish/index?bizType=service"
    })
  },
  consult() {
    if (!ensureActionAccess({ requireAuth: true })) {
      return
    }
    wx.showToast({ title: "已创建服务咨询会话", icon: "none" })
  }
})
