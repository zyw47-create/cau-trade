const store = require('./utils/store')

App({
  globalData: {
    apiMode: 'mock',
    baseUrl: 'http://127.0.0.1:3001',
    verifyBaseUrl: 'http://127.0.0.1:3001',
    useMock: true,
    unreadCount: 0
  },

  onLaunch() {
    this.globalData.useMock = this.globalData.apiMode !== 'remote'
    store.bootstrap()
  }
})
