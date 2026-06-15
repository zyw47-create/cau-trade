function getStoredToken() {
  return wx.getStorageSync("campus_token") || ""
}

function getStoredUserInfo() {
  return wx.getStorageSync("campus_userinfo") || {}
}

function syncGlobalUserInfo(userInfo = {}) {
  const app = getApp()
  if (!app.globalData) app.globalData = {}
  app.globalData.userInfo = userInfo
  app.globalData.isLoggedIn = !!getStoredToken()
  app.globalData.isVerified = !!userInfo.isVerified
}

function showGuardModal(title, content) {
  wx.showModal({ title, content, confirmText: "知道了", showCancel: false })
}

function checkAuth(config = {}) {
  const token = getStoredToken()
  const userInfo = getStoredUserInfo()
  syncGlobalUserInfo(userInfo)

  if (config.requireAuth && !token) {
    showGuardModal("请先登录", config.authMessage || "该功能需要登录后使用。")
    return false
  }
  if (config.requireVerified && !userInfo.isVerified) {
    wx.showModal({
      title: "需要实名认证",
      content: config.verifiedMessage || "发布、下单与接单前需完成校园实名认证。",
      confirmText: "去认证",
      success(result) {
        if (result.confirm) wx.navigateTo({ url: "/pages/verification/index" })
      }
    })
    return false
  }
  if (config.requireRole && (userInfo.role || "user") !== config.requireRole) {
    const roleTextMap = { service: "服务者", rider: "校园骑手", admin: "管理员" }
    showGuardModal("暂无权限", config.roleMessage || `该功能仅限${roleTextMap[config.requireRole] || config.requireRole}使用。`)
    return false
  }
  return true
}

module.exports = {
  getStoredToken,
  getStoredUserInfo,
  syncGlobalUserInfo,
  checkAuth,
  checkPageAccess: checkAuth,
  ensureActionAccess: checkAuth
}
