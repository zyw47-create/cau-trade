const { getStoredUserInfo } = require("../../utils/guards")

const roleTextMap = {
  user: "普通用户",
  service: "服务者",
  rider: "校园骑手",
  admin: "管理员"
}

Page({
  data: {
    userInfo: {
      name: "张三",
      college: "计算机学院",
      grade: "2023 级",
      creditScore: 98,
      isVerified: true,
      role: "user"
    },
    stats: [
      { label: "发布", value: 12 },
      { label: "已售", value: 8 },
      { label: "关注", value: 156 },
      { label: "信用", value: 98 }
    ],
    roleOptions: [
      { label: "普通用户", value: "user" },
      { label: "服务者", value: "service" },
      { label: "校园骑手", value: "rider" }
    ],
    currentRoleIndex: 0,
    menus: [
      { name: "我的发布", url: "/pages/goods-detail/index?id=g101" },
      { name: "我的订单", url: "/pages/orders/index" },
      { name: "我的钱包", url: "/pages/wallet/index" },
      { name: "实名认证", url: "/pages/verification/index" },
      { name: "骑手中心", url: "/pages/rider-center/index" },
      { name: "服务广场", url: "/pages/services/index" }
    ]
  },
  onShow() {
    this.syncUserInfo()
  },
  syncUserInfo() {
    const app = getApp()
    const stored = getStoredUserInfo()
    const userInfo = Object.assign({}, this.data.userInfo, app.globalData.userInfo || {}, stored)
    const currentRoleIndex = this.data.roleOptions.findIndex((item) => item.value === userInfo.role)
    this.setData({
      userInfo,
      currentRoleIndex: currentRoleIndex >= 0 ? currentRoleIndex : 0
    })
  },
  switchRole(event) {
    const currentRoleIndex = Number(event.detail.value)
    const nextRole = this.data.roleOptions[currentRoleIndex].value
    const userInfo = Object.assign({}, this.data.userInfo, {
      role: nextRole,
      isVerified: true
    })
    wx.setStorageSync("campus_userinfo", userInfo)
    const app = getApp()
    app.globalData.userInfo = userInfo
    app.globalData.isVerified = true
    this.setData({
      userInfo,
      currentRoleIndex
    })
    wx.showToast({
      title: `已切换为${roleTextMap[nextRole]}`,
      icon: "none"
    })
  },
  goPublish() {
    wx.navigateTo({
      url: "/pages/publish/index"
    })
  },
  goPage(event) {
    wx.navigateTo({
      url: event.currentTarget.dataset.url
    })
  }
})
