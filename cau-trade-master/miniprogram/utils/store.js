const defaultUser = {
  id: 0,
  nickname: '',
  username: '',
  avatar: '',
  role: 'guest',
  status: '',
  verified: false,
  studentId: '',
  realName: '',
  college: '',
  phone: '',
  creditScore: 0,
  balance: 0
}

const state = {
  token: '',
  user: null
}

const STORAGE_KEYS = {
  token: 'campus_token',
  user: 'campus_userinfo',
  searchHistory: 'campus_search_history',
  browseHistory: 'campus_browse_history',
  chatRead: 'campus_chat_read',
  draft: 'campus_draft',
  version: 'campus_storage_version'
}

const LEGACY_KEYS = {
  token: 'token',
  user: 'user'
}

const HISTORY_LIMIT = 20

function bootstrap() {
  state.token = wx.getStorageSync(STORAGE_KEYS.token) || wx.getStorageSync(LEGACY_KEYS.token) || ''
  state.user = wx.getStorageSync(STORAGE_KEYS.user) || wx.getStorageSync(LEGACY_KEYS.user) || null
  if (state.token) wx.setStorageSync(STORAGE_KEYS.token, state.token)
  if (state.user) wx.setStorageSync(STORAGE_KEYS.user, state.user)
  wx.setStorageSync(STORAGE_KEYS.version, '1')
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

function setSession(token, user) {
  state.token = token || state.token
  state.user = Object.assign({}, defaultUser, user || {})
  wx.setStorageSync(STORAGE_KEYS.token, state.token)
  wx.setStorageSync(STORAGE_KEYS.user, state.user)
  return getState()
}

function logout() {
  state.token = ''
  state.user = null
  wx.removeStorageSync(STORAGE_KEYS.token)
  wx.removeStorageSync(STORAGE_KEYS.user)
  wx.removeStorageSync(LEGACY_KEYS.token)
  wx.removeStorageSync(LEGACY_KEYS.user)
}

function updateUser(patch) {
  state.user = Object.assign({}, state.user || defaultUser, patch)
  wx.setStorageSync(STORAGE_KEYS.user, state.user)
  return state.user
}

function setRole(role) {
  return updateUser({ role })
}

function setRoleCertification(role, payload) {
  const current = (state.user && state.user.roleCertifications) || {}
  const status = (payload && payload.status) || 'approved'
  const next = Object.assign({}, current, {
    [role]: Object.assign({
      role,
      status,
      appliedAt: Date.now()
    }, payload || {})
  })
  const patch = { roleCertifications: next }
  if (status === 'approved') patch.role = role
  return updateUser(patch)
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

function setPendingCategory(payload) {
  wx.setStorageSync('pendingCategory', payload || {})
}

function takePendingCategory() {
  const payload = wx.getStorageSync('pendingCategory') || null
  wx.removeStorageSync('pendingCategory')
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

function saveDraft(key, payload) {
  if (!key) return
  const drafts = wx.getStorageSync(STORAGE_KEYS.draft) || {}
  drafts[key] = payload || {}
  wx.setStorageSync(STORAGE_KEYS.draft, drafts)
  wx.setStorageSync(`draft:${key}`, payload || {})
}

function getDraft(key) {
  if (!key) return null
  const drafts = wx.getStorageSync(STORAGE_KEYS.draft) || {}
  return drafts[key] || wx.getStorageSync(`draft:${key}`) || null
}

function clearDraft(key) {
  if (!key) return
  const drafts = wx.getStorageSync(STORAGE_KEYS.draft) || {}
  delete drafts[key]
  wx.setStorageSync(STORAGE_KEYS.draft, drafts)
  wx.removeStorageSync(`draft:${key}`)
}

function normalizeHistoryItem(item) {
  if (!item) return null
  if (typeof item === 'string') return { keyword: item, time: Date.now() }
  return Object.assign({ time: Date.now() }, item)
}

function addUniqueHistory(storageKey, item, identity) {
  const normalized = normalizeHistoryItem(item)
  if (!normalized) return []
  const getId = identity || ((value) => value.keyword || value.id || value.title)
  const id = getId(normalized)
  const current = wx.getStorageSync(storageKey) || []
  const next = [normalized].concat(current.filter((value) => getId(value) !== id)).slice(0, HISTORY_LIMIT)
  wx.setStorageSync(storageKey, next)
  return next
}

function getSearchHistory() {
  return wx.getStorageSync(STORAGE_KEYS.searchHistory) || []
}

function addSearchHistory(keyword) {
  const text = String(keyword || '').trim()
  if (!text) return getSearchHistory()
  return addUniqueHistory(STORAGE_KEYS.searchHistory, { keyword: text, time: Date.now() }, (item) => item.keyword)
}

function clearSearchHistory() {
  wx.removeStorageSync(STORAGE_KEYS.searchHistory)
}

function getBrowseHistory() {
  return wx.getStorageSync(STORAGE_KEYS.browseHistory) || []
}

function addBrowseHistory(goods) {
  if (!goods || !goods.id) return getBrowseHistory()
  return addUniqueHistory(STORAGE_KEYS.browseHistory, {
    id: goods.id,
    type: goods.type || 'goods',
    title: goods.title,
    price: goods.price,
    category: goods.category,
    location: goods.location || goods.locationText,
    time: Date.now()
  }, (item) => `${item.type || 'goods'}:${item.id}`)
}

function clearBrowseHistory() {
  wx.removeStorageSync(STORAGE_KEYS.browseHistory)
}

function getChatReadMap() {
  return wx.getStorageSync(STORAGE_KEYS.chatRead) || {}
}

function getConversationReadId(conversationId) {
  const map = getChatReadMap()
  return conversationId ? map[conversationId] || '' : ''
}

function markConversationRead(conversationId, messageId) {
  if (!conversationId || !messageId) return
  const map = getChatReadMap()
  map[conversationId] = String(messageId)
  wx.setStorageSync(STORAGE_KEYS.chatRead, map)
}

module.exports = {
  bootstrap,
  getState,
  setSession,
  logout,
  updateUser,
  setRole,
  setRoleCertification,
  requireLogin,
  requireVerified,
  saveDraft,
  getDraft,
  clearDraft,
  getSearchHistory,
  addSearchHistory,
  clearSearchHistory,
  getBrowseHistory,
  addBrowseHistory,
  clearBrowseHistory,
  getConversationReadId,
  markConversationRead,
  setPendingCategory,
  takePendingCategory,
  setPendingChat,
  takePendingChat,
  setPendingUserPreview,
  takePendingUserPreview
}
