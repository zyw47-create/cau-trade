const store = require('./utils/store')

App({
  globalData: {
    baseUrl: 'http://127.0.0.1:5000',
    verifyBaseUrl: 'http://127.0.0.1:5000',
    // Local-only fallback for classroom runs. Keep this openid aligned with
    // users.openid so the simulator can login even when wx.login code exchange
    // is unavailable.
    allowDevLogin: true,
    devOpenid: 'o3Jky3asyoEvXEGqoLKtJA2wK3LU',
    unreadCount: 0
  },

  onLaunch() {
    store.bootstrap()
  }
})

