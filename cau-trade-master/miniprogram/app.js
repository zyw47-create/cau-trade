const store = require('./utils/store')

App({
  globalData: {
    baseUrl: 'http://127.0.0.1:5000',
    verifyBaseUrl: 'http://127.0.0.1:5000',
    // Local-only: set allowDevLogin to true with a seeded devOpenid when the
    // Flask backend has ALLOW_DEV_LOGIN=1 and real WeChat credentials are absent.
    allowDevLogin: false,
    devOpenid: '',
    unreadCount: 0
  },

  onLaunch() {
    store.bootstrap()
  }
})
