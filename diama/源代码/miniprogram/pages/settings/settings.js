const { api } = require('../../utils/api')
const store = require('../../utils/store')

const ROLE_ITEMS = [
  { value: 'provider', text: '服务者认证', desc: '发布可预约服务、承接服务订单' },
  { value: 'rider', text: '骑手认证', desc: '抢跑腿单、更新配送状态' }
]

const ADMIN_ROLE_ITEM = {
  value: 'admin',
  text: '后台权限',
  desc: '由系统在登录时分配，普通用户不能申请'
}

Page({
  data: {
    state: {},
    user: null,
    profileForm: {
      nickname: '',
      username: '',
      phone: '',
      address: ''
    },
    roles: ROLE_ITEMS,
    browseHistory: [],
    hasBrowseHistory: false,
    cacheText: '搜索历史、浏览记录、草稿'
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const state = store.getState()
    const rawUser = state.user || null
    const user = rawUser ? Object.assign({}, rawUser, {
      initial: (rawUser.nickname || '我').charAt(0)
    }) : null
    const roleCertifications = (user && user.roleCertifications) || {}
    const visibleRoles = state.role === 'admin' ? ROLE_ITEMS.concat([ADMIN_ROLE_ITEM]) : ROLE_ITEMS
    this.setData({
      state,
      user,
      roles: visibleRoles.map((item) => {
        const certified = Boolean(roleCertifications[item.value] && roleCertifications[item.value].status === 'approved')
        const current = state.role === item.value
        return Object.assign({}, item, {
          statusText: current ? '当前身份' : certified ? '已认证' : '未认证',
          statusType: current || certified ? 'ok' : 'warn',
          buttonText: item.value === 'admin'
            ? '进入后台'
            : certified
              ? (current ? '查看资料' : '切换身份')
              : '去申请'
        })
      }),
      browseHistory: store.getBrowseHistory().slice(0, 6),
      hasBrowseHistory: store.getBrowseHistory().length > 0,
      profileForm: {
        nickname: user ? (user.nickname || '') : '',
        username: user ? (user.username || '') : '',
        phone: user ? (user.phone || '') : '',
        address: user ? (user.address || '') : ''
      }
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

  onProfileInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`profileForm.${key}`]: e.detail.value })
  },

  saveProfile() {
    if (!store.requireLogin()) return
    api({ url: '/api/user/profile/update', method: 'POST', data: this.data.profileForm }).then(() => {
      wx.showToast({ title: '资料已保存' })
      this.refresh()
    })
  },

  goVerify() {
    wx.navigateTo({ url: '/pages/verify/verify' })
  },

  switchRole(e) {
    const role = e.currentTarget.dataset.role
    if (role === 'admin') {
      if (store.getState().role === 'admin') {
        this.goAdmin()
      } else {
        wx.showToast({ title: '后台权限由系统分配，不能申请', icon: 'none' })
      }
      return
    }
    if (!store.getState().isVerified) {
      wx.showToast({ title: '请先完成实名认证', icon: 'none' })
      wx.navigateTo({ url: '/pages/verify/verify' })
      return
    }
    if (role === 'rider' || role === 'provider') {
      wx.navigateTo({ url: `/pages/role-apply/role-apply?role=${role}` })
      return
    }
    api({ url: '/api/user/role', method: 'POST', data: { role } }).then(() => {
      wx.showToast({ title: '申请已提交' })
      this.refresh()
    })
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' })
  },

  openBrowseItem(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },

  clearLocalCache() {
    wx.showModal({
      title: '清理本地缓存',
      content: '将清理搜索历史、浏览记录和发布草稿，不影响账号登录与订单数据。',
      confirmText: '清理',
      success: (res) => {
        if (!res.confirm) return
        store.clearSearchHistory()
        store.clearBrowseHistory()
        ;['campus_draft', 'draft:publish'].forEach((key) => {
          wx.removeStorageSync(key)
        })
        wx.showToast({ title: '已清理' })
        this.refresh()
      }
    })
  }
})
