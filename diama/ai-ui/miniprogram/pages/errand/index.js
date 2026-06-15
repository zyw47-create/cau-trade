const BasePage = require("../../utils/base-page")
const { errandList } = require("../../utils/mock-data")
const { ensureActionAccess } = require("../../utils/guards")

const typeMap = {
  delivery: "取送件",
  purchase: "代购",
  help: "帮忙"
}

const statusMap = {
  waiting_accept: "待接单",
  accepted: "进行中",
  completed: "已完成"
}

BasePage({
  data: {
    keyword: "",
    rawErrandList: errandList.map((item) => Object.assign({}, item, {
      typeLabel: typeMap[item.type] || "任务",
      statusLabel: statusMap[item.status] || item.status
    })),
    errandList: [],
    filters: [
      { name: "全部", active: true },
      { name: "取送件", active: false },
      { name: "代购", active: false },
      { name: "帮忙", active: false }
    ],
    activeFilter: "全部",
    riderInfo: {
      badge: "骑手认证与接单规则",
      title: "接跑腿任务前需完成骑手认证、信用校验与接单培训",
      items: [
        "实名认证通过后可申请“校园骑手”身份",
        "接单前需填写常驻区域、联系方式和配送时段",
        "信用分低于 90 或超时率过高会限制接单"
      ]
    }
  },
  onLoad() {
    this.setData({
      errandList: this.data.rawErrandList
    })
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
  chooseFilter(event) {
    const activeFilter = event.currentTarget.dataset.name
    this.setData({
      activeFilter,
      filters: this.data.filters.map((item) => Object.assign({}, item, {
        active: item.name === activeFilter
      }))
    })
    this.filterList()
  },
  filterList() {
    const keyword = this.data.keyword.trim()
    const activeFilter = this.data.activeFilter
    const nextList = this.data.rawErrandList.filter((item) => {
      const matchType = activeFilter === "全部" || item.typeLabel === activeFilter
      const matchKeyword = !keyword || item.title.includes(keyword) || (item.from || "").includes(keyword) || (item.to || "").includes(keyword) || item.publisher.includes(keyword)
      return matchType && matchKeyword
    })
    this.setData({
      errandList: nextList
    })
  },
  openServices() {
    wx.navigateTo({
      url: "/pages/services/index"
    })
  },
  openPublish() {
    if (!ensureActionAccess({
      requireAuth: true,
      requireVerified: true
    })) {
      return
    }

    wx.navigateTo({
      url: "/pages/publish/index?bizType=task"
    })
  },
  openProfile() {
    wx.navigateTo({
      url: "/pages/rider-center/index"
    })
  },
  acceptTask() {
    if (!ensureActionAccess({
      requireAuth: true,
      requireVerified: true,
      requireRole: "rider",
      roleMessage: "请先在个人中心完成校园骑手认证"
    })) {
      return
    }

    wx.showToast({
      title: "接单成功",
      icon: "success"
    })
  }
})
