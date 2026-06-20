const store = require('./utils/store')

App({
  globalData: {
    apiMode: 'remote',
    baseUrl: 'http://127.0.0.1:5000',
    verifyBaseUrl: 'http://127.0.0.1:5000',
    useMock: false,
    unreadCount: 0
  },

  onLaunch() {
    this.globalData.useMock = this.globalData.apiMode === 'mock'
    store.bootstrap()
  }
})
