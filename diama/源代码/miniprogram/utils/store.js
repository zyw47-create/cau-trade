const defaultUser = {
  id: 1,
  nickname: '校园同学',
  username: 'campus_user',
  avatar: '',
  role: 'user',
  status: 'active',
  verified: false,
  studentId: '',
  realName: '',
  college: '',
  phone: '',
  creditScore: 100,
  balance: 128.6
}

const state = {
  token: '',
  user: null
}

function bootstrap() {
  state.token = wx.getStorageSync('token') || ''
  state.user = wx.getStorageSync('user') || null
  if (state.user && !state.user.username) {
    state.user.username = 'campus_user'
    wx.setStorageSync('user', state.user)
  }
}

function getState() {
  return {
    token: state.token,
    user: state.user,
    isLogin: Boolean(state.token && state.user),
    isVerified: Boolean(state.user && state.user.verified),
    role: state.user ? state.user.role : 'guest'
  }
}

function login() {
  state.token = 'mock-jwt-token'
  state.user = Object.assign({}, defaultUser)
  wx.setStorageSync('token', state.token)
  wx.setStorageSync('user', state.user)
  return getState()
}

function logout() {
  state.token = ''
  state.user = null
  wx.removeStorageSync('token')
  wx.removeStorageSync('user')
}

function updateUser(patch) {
  state.user = Object.assign({}, state.user || defaultUser, patch)
  wx.setStorageSync('user', state.user)
  return state.user
}

function setRole(role) {
  return updateUser({ role })
}

function addBalance(amount) {
  const current = Number((state.user && state.user.balance) || 0)
  return updateUser({ balance: Number((current + Number(amount)).toFixed(2)) })
}

function reduceBalance(amount) {
  const current = Number((state.user && state.user.balance) || 0)
  const next = current - Number(amount)
  if (next < 0) return null
  return updateUser({ balance: Number(next.toFixed(2)) })
}

function requireLogin() {
  if (!getState().isLogin) {
    wx.showToast({ title: '请先登录', icon: 'none' })
    wx.switchTab({ url: '/pages/profile/profile' })
    return false
  }
  return true
}

function requireVerified() {
  if (!requireLogin()) return false
  if (!getState().isVerified) {
    wx.showToast({ title: '请先完成实名认证', icon: 'none' })
    wx.navigateTo({ url: '/pages/verify/verify' })
    return false
  }
  return true
}

function setPendingChat(payload) {
  wx.setStorageSync('pendingChat', payload || {})
}

function takePendingChat() {
  const payload = wx.getStorageSync('pendingChat') || null
  wx.removeStorageSync('pendingChat')
  return payload
}

function setPendingUserPreview(payload) {
  wx.setStorageSync('pendingUserPreview', payload || {})
}

function takePendingUserPreview() {
  const payload = wx.getStorageSync('pendingUserPreview') || null
  wx.removeStorageSync('pendingUserPreview')
  return payload
}

module.exports = {
  bootstrap,
  getState,
  login,
  logout,
  updateUser,
  setRole,
  addBalance,
  reduceBalance,
  requireLogin,
  requireVerified,
  setPendingChat,
  takePendingChat,
  setPendingUserPreview,
  takePendingUserPreview
}
