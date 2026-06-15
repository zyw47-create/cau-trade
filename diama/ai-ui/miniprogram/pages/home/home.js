Page({
  data: {
    actions: [
      { label: "二手交易", desc: "浏览校园闲置", path: "/pages/category/index", tab: true },
      { label: "服务广场", desc: "技能与维修服务", path: "/pages/services/index", tab: false },
      { label: "跑腿大厅", desc: "发布与承接任务", path: "/pages/errand/index", tab: false }
    ]
  },
  onLoad: function () {
    const app = getApp()
    if (app.updateMessageBadge) {
      app.updateMessageBadge()
    }
  },
  openPage: function (event) {
    const item = this.data.actions[event.currentTarget.dataset.index]
    if (item.tab) {
      wx.switchTab({ url: item.path })
    } else {
      wx.navigateTo({ url: item.path })
    }
  },
  publish: function () {
    wx.navigateTo({ url: "/pages/publish/index" })
  }
})
