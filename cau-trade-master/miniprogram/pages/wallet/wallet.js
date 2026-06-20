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
    Promise.all([
      api({ url: '/api/account/logs' }),
      api({ url: '/api/rider/earnings' })
    ]).then(([logsRes, earningsRes]) => {
      if (logsRes.code !== 200 || earningsRes.code !== 200) {
        this.setData({ errorText: (logsRes.msg || earningsRes.msg || '钱包数据加载失败') })
        return
      }
      const logs = (logsRes.data.list || []).map((item) => Object.assign({}, item, {
        amountText: `${Number(item.amount) >= 0 ? '+' : ''}${item.amount}`,
        amountClass: Number(item.amount) >= 0 ? 'income' : 'expense'
      }))
      const withdraws = ((earningsRes.data && earningsRes.data.withdraws) || []).map((item) => Object.assign({}, item, {
        statusText: this.getWithdrawStatus(item.status)
      }))
      this.setData({
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
      wx.showToast({ title: '提现已提交' })
      this.setData({ withdrawAmount: '' })
      this.loadWallet()
    })
  }
})
