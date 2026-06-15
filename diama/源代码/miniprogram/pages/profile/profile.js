const { api } = require('../../utils/api')
const store = require('../../utils/store')

const GOODS_STATUS_TEXT = {
  pending: '审核中',
  on_sale: '在售',
  rejected: '审核驳回',
  reserved: '已预订',
  sold: '已售出',
  removed: '已下架'
}

const WITHDRAW_STATUS_TEXT = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  cancelled: '已取消'
}

Page({
  data: {
    state: {},
    user: null,
    credit: null,
    walletLogs: [],
    favorites: [],
    myGoods: [],
    noFavorites: true,
    noMyGoods: true,
    rechargeAmount: '',
    profileForm: {
      nickname: '',
      username: '',
      phone: '',
      address: ''
    },
    sections: {
      profile: false,
      wallet: false,
      favorites: false,
      published: false,
      earnings: false,
      settings: false
    },
    roles: [
      { value: 'provider', text: '申请服务者认证' },
      { value: 'rider', text: '申请骑手认证' },
      { value: 'admin', text: '后台权限验证' }
    ],
    earnings: { amount: 0, acceptedCount: 0, withdraws: [] },
    withdrawAmount: '',
    canShowWithdraw: false
  },

  onShow() {
    const now = Date.now()
    if (this.lastRefreshAt && now - this.lastRefreshAt < 1200) return
    this.refresh()
  },

  refresh() {
    if (this.refreshing) return
    this.refreshing = true
    this.lastRefreshAt = Date.now()
    const state = store.getState()
    const roleNames = {
      user: '普通用户',
      rider: '骑手',
      provider: '服务者',
      admin: '管理员'
    }
    const statusNames = {
      active: '正常',
      pending_verify: '待实名',
      banned: '已限制',
      removed: '已注销'
    }
    const user = state.user ? Object.assign({}, state.user, {
      verifyText: state.user.verified ? '已实名' : '未实名',
      verifyClass: state.user.verified ? 'ok' : 'warn',
      verifyButtonText: state.user.verified ? '查看实名' : '去实名认证',
      isAdmin: state.user.role === 'admin',
      canWithdraw: state.user.role === 'rider' || state.user.role === 'provider',
      roleText: roleNames[state.user.role] || state.user.role,
      statusText: statusNames[state.user.status] || state.user.status,
      initial: (state.user.nickname || '我').charAt(0)
    }) : null
    const nextData = { state, user, canShowWithdraw: Boolean(user && user.canWithdraw) }
    if (user) {
      nextData.profileForm = {
        nickname: user.nickname || '',
        username: user.username || '',
        phone: user.phone || '',
        address: user.address || ''
      }
    }
    this.setData(nextData)
    if (!state.isLogin) {
      this.refreshing = false
      return
    }
    Promise.all([
      api({ url: '/api/user/credit' }),
      api({ url: '/api/account/logs' }),
      api({ url: '/api/goods/favorites' }),
      api({ url: '/api/rider/earnings' }),
      api({ url: '/api/goods/mine' })
    ]).then(([creditRes, logsRes, favoritesRes, earningsRes, mineRes]) => {
      const walletLogs = (logsRes.data.list || []).slice(0, 8).map((item) => Object.assign({}, item, {
        amountText: `${item.amount >= 0 ? '+' : ''}${item.amount}`,
        amountClass: item.amount >= 0 ? 'income' : 'expense'
      }))
      const favorites = (favoritesRes.data.list || []).map((item) => Object.assign({}, item, {
        statusLabel: GOODS_STATUS_TEXT[item.status] || item.status
      }))
      const earningsData = earningsRes.data || {}
      const withdraws = (earningsData.withdraws || []).map((item) => Object.assign({}, item, {
        statusLabel: WITHDRAW_STATUS_TEXT[item.status] || item.status
      }))
      const myGoods = (mineRes.data.list || []).map((item) => Object.assign({}, item, {
        statusLabel: GOODS_STATUS_TEXT[item.status] || item.status,
        canRemove: item.status === 'on_sale' || item.status === 'pending' || item.status === 'reserved',
        canRelist: item.status === 'removed' || item.status === 'rejected'
      }))
      this.setData({
        credit: creditRes.data,
        walletLogs,
        favorites,
        noFavorites: favorites.length === 0,
        earnings: Object.assign({}, earningsData, { withdraws }),
        myGoods,
        noMyGoods: myGoods.length === 0
      })
    }).finally(() => {
      this.refreshing = false
    })
  },

  login() {
    api({ url: '/api/auth/login', method: 'POST' }).then(() => {
      wx.showToast({ title: '登录成功' })
      this.refresh()
    })
  },

  logout() {
    api({ url: '/api/auth/logout', method: 'POST' }).then(() => {
      wx.showToast({ title: '已退出' })
      this.refresh()
    })
  },

  goVerify() {
    wx.navigateTo({ url: '/pages/verify/verify' })
  },

  openOrders() {
    wx.switchTab({ url: '/pages/orders/orders' })
  },

  toggleSection(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`sections.${key}`]: !this.data.sections[key] })
  },

  onRechargeInput(e) {
    this.setData({ rechargeAmount: e.detail.value })
  },

  onProfileInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`profileForm.${key}`]: e.detail.value })
  },

  saveProfile() {
    api({ url: '/api/user/profile/update', method: 'POST', data: this.data.profileForm }).then(() => {
      wx.showToast({ title: '资料已保存' })
      this.refresh()
    })
  },

  recharge() {
    if (!store.requireLogin()) return
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
      this.refresh()
    })
  },

  openFavorite(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },

  openGoods(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },

  removeGoods(e) {
    api({ url: '/api/goods/remove', method: 'POST', data: { id: e.currentTarget.dataset.id } }).then(() => {
      wx.showToast({ title: '已下架' })
      this.refresh()
    })
  },

  relistGoods(e) {
    api({ url: '/api/goods/relist', method: 'POST', data: { id: e.currentTarget.dataset.id } }).then(() => {
      wx.showToast({ title: '已提交复核' })
      this.refresh()
    })
  },

  openChatList() {
    wx.switchTab({ url: '/pages/chat/chat' })
  },

  switchRole(e) {
    const role = e.currentTarget.dataset.role
    if (role !== 'admin' && !store.getState().isVerified) {
      wx.showToast({ title: '请先完成实名认证', icon: 'none' })
      wx.navigateTo({ url: '/pages/verify/verify' })
      return
    }
    api({ url: '/api/user/role', method: 'POST', data: { role } }).then(() => {
      wx.showToast({ title: role === 'admin' ? '后台权限已验证' : '申请已提交' })
      this.refresh()
    })
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' })
  },

  onWithdrawInput(e) {
    this.setData({ withdrawAmount: e.detail.value })
  },

  withdraw() {
    api({
      url: '/api/rider/withdraw',
      method: 'POST',
      data: { amount: this.data.withdrawAmount, reason: '收益提现' }
    }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      wx.showToast({ title: '提现已提交' })
      this.setData({ withdrawAmount: '' })
      this.refresh()
    })
  }
})
