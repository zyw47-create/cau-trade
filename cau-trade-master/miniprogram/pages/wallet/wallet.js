const { request: api } = require('../../utils/request')
const store = require('../../utils/store')
const { BasePage } = require('../../utils/base-page')

BasePage({
  requireAuth: true,
  data: {
    user: null,
    logs: [],
    withdraws: [],
    rechargeAmount: '',
    withdrawAmount: '',
    canWithdraw: false,
    noLogs: true,
    noWithdraws: true,
    loading: true,
    errorText: ''
  },

  onShow() {
    this.loadWallet()
  },

  loadWallet() {
    if (!store.requireLogin()) return
    const state = store.getState()
    const user = state.user || {}
    this.setData({
      user,
      canWithdraw: user.role === 'rider' || user.role === 'provider',
      loading: true,
      errorText: ''
    })
    const canWithdraw = user.role === 'rider' || user.role === 'provider'
    Promise.all([
      api({ url: '/api/user/profile' }),
      api({ url: '/api/account/logs' }),
      canWithdraw ? api({ url: '/api/rider/earnings' }) : Promise.resolve({ code: 200, data: { withdraws: [] } })
    ]).then(([profileRes, logsRes, earningsRes]) => {
      if (profileRes.code !== 200 || logsRes.code !== 200 || earningsRes.code !== 200) {
        this.setData({ errorText: (logsRes.msg || earningsRes.msg || '钱包数据加载失败') })
        return
      }
      const latestUser = store.updateUser(profileRes.data || {})
      const logs = (logsRes.data.list || []).map((item) => Object.assign({}, item, {
        amountText: `${item.direction === 'out' ? '-' : '+'}${item.amount}`,
        amountClass: item.direction === 'out' ? 'expense' : 'income',
        balanceAfter: item.balanceAfter || item.balance_after || '0.00',
        time: item.createdAt || item.created_at || item.time || ''
      }))
      const withdraws = ((earningsRes.data && earningsRes.data.withdraws) || []).map((item) => Object.assign({}, item, {
        statusText: this.getWithdrawStatus(item.status),
        time: item.createdAt || item.created_at || '',
        reviewedText: item.reviewedAt || item.reviewed_at || ''
      }))
      this.setData({
        user: latestUser,
        logs,
        withdraws,
        noLogs: logs.length === 0,
        noWithdraws: withdraws.length === 0
      })
    }).catch(() => {
      this.setData({ errorText: '网络异常，钱包数据加载失败' })
    }).finally(() => {
      this.setData({ loading: false })
    })
  },

  getWithdrawStatus(status) {
    const map = {
      pending: '待审核',
      approved: '已通过',
      rejected: '已驳回',
      cancelled: '已取消'
    }
    return map[status] || status
  },

  onRechargeInput(e) {
    this.setData({ rechargeAmount: e.detail.value })
  },

  onWithdrawInput(e) {
    this.setData({ withdrawAmount: e.detail.value })
  },

  syncUserBalance(balance) {
    if (balance === undefined || balance === null || balance === '') return
    const user = store.updateUser({ balance })
    this.setData({ user })
  },

  recharge() {
    api({
      url: '/api/account/recharge',
      method: 'POST',
      data: { amount: this.data.rechargeAmount }
    }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      wx.showToast({ title: '充值成功' })
      this.syncUserBalance(res.data && res.data.balance)
      this.setData({ rechargeAmount: '' })
      this.loadWallet()
    })
  },

  withdraw() {
    api({
      url: '/api/rider/withdraw',
      method: 'POST',
      data: { amount: this.data.withdrawAmount, reason: '钱包提现' }
    }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      const amount = this.data.withdrawAmount
      wx.showToast({ title: `提现¥${amount}待审核`, icon: 'none' })
      this.setData({ withdrawAmount: '' })
      this.loadWallet()
    })
  }
})
