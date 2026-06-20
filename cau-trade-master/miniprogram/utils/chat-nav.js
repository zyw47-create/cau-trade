function encode(value) {
  return encodeURIComponent(value === undefined || value === null ? '' : String(value))
}

function openChatRoom(payload) {
  const data = Object.assign({ standalone: '1' }, payload || {})
  const query = Object.keys(data)
    .filter((key) => data[key] !== undefined && data[key] !== null && data[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encode(data[key])}`)
    .join('&')
  wx.navigateTo({ url: `/pages/chat-room/chat-room?${query}` })
}

module.exports = {
  openChatRoom
}
