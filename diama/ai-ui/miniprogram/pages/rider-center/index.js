const api = require("../../config/api")
const request = require("../../utils/request")
const { ensureActionAccess } = require("../../utils/guards")

Page({
  data: {
    applied: false,
    activeArea: "东区、西区",
    activeTime: "工作日 18:00-22:00",
    tasks: [
      { id: "rt1", title: "菜鸟驿站取件", status: "accepted", statusText: "已接单", showFinish: true },
      { id: "rt2", title: "代买晚餐", status: "delivering", statusText: "配送中", showFinish: true }
    ]
  },
  onShow: function () {
    const userInfo = getApp().globalData.userInfo || {}
    this.setData({ applied: userInfo.role === "rider" })
  },
  apply: function () {
    if (!ensureActionAccess({ requireAuth: true, requireVerified: true })) {
      return
    }
    request.post(api.errand.riderApply, {
      area: this.data.activeArea,
      availableTime: this.data.activeTime
    }).then(() => {
      const app = getApp()
      const userInfo = Object.assign({}, app.globalData.userInfo, { role: "rider" })
      app.globalData.userInfo = userInfo
      wx.setStorageSync("campus_userinfo", userInfo)
      this.setData({ applied: true })
      wx.showToast({ title: "骑手认证已提交", icon: "success" })
    })
  },
  updateTask: function (event) {
    const id = event.currentTarget.dataset.id
    const tasks = this.data.tasks.map((item) => {
      if (item.id !== id) return item
      return Object.assign({}, item, { status: "completed", statusText: "已完成", showFinish: false })
    })
    this.setData({ tasks })
    request.post(api.errand.updateStatus, { id, status: "completed" })
  }
})
