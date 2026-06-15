function saveSearchHistory(keyword, type) {
  if (!keyword) return
  const key = "campus_search_history"
  const current = wx.getStorageSync(key) || []
  const next = [{ keyword, type }].concat(
    current.filter((item) => !(item.keyword === keyword && item.type === type))
  ).slice(0, 20)
  wx.setStorageSync(key, next)
}

function saveDraft(data) {
  wx.setStorageSync("campus_draft", data)
}

function getDraft() {
  return wx.getStorageSync("campus_draft") || null
}

function clearDraft() {
  wx.removeStorageSync("campus_draft")
}

module.exports = {
  saveSearchHistory,
  saveDraft,
  getDraft,
  clearDraft
}
