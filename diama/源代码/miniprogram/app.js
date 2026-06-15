const store = require('./utils/store')

App({
  globalData: {
    baseUrl: 'https://api.campus-trade.com/v1',
    verifyBaseUrl: 'http://127.0.0.1:3001',
    useMock: true
  },

  onLaunch() {
    store.bootstrap()
  }
})
