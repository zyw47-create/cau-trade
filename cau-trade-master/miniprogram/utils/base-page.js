const store = require('./store')

function checkPageAccess(options) {
  if (options.requireAuth && !store.requireLogin()) return false
  if (options.requireVerified && !store.requireVerified()) return false
  if (options.requireRole) {
    const role = store.getState().role
    const roles = Array.isArray(options.requireRole) ? options.requireRole : [options.requireRole]
    if (roles.indexOf(role) < 0) {
      wx.showToast({ title: '暂无访问权限', icon: 'none' })
      return false
    }
  }
  return true
}

function BasePage(options) {
  const pageOptions = Object.assign({}, options)
  const originalOnLoad = pageOptions.onLoad
  const originalOnShow = pageOptions.onShow
  pageOptions.onLoad = function(query) {
    if (!checkPageAccess(pageOptions)) return
    if (originalOnLoad) originalOnLoad.call(this, query || {})
  }
  pageOptions.onShow = function() {
    if (!checkPageAccess(pageOptions)) return
    if (originalOnShow) originalOnShow.call(this)
  }
  return Page(pageOptions)
}

module.exports = {
  BasePage,
  checkPageAccess
}
