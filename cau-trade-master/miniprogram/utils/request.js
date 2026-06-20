const { api } = require('./api')
const store = require('./store')

function request(options) {
  const state = store.getState()
  const headers = Object.assign({}, options.header || {})
  if (state.token) headers.Authorization = `Bearer ${state.token}`
  return api(Object.assign({}, options, { header: headers })).then((res) => {
    if (res && res.code === 401) {
      wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
      wx.switchTab({ url: '/pages/profile/profile' })
    }
    return res
  })
}

function get(url, data, options) {
  return request(Object.assign({}, options || {}, { url, data, method: 'GET' }))
}

function post(url, data, options) {
  return request(Object.assign({}, options || {}, { url, data, method: 'POST' }))
}

module.exports = {
  request,
  get,
  post
}
