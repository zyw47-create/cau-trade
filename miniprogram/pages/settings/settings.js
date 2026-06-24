const { request: api } = require('../../utils/request')
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
    if (store.getState().isLogin) {
      api({ url: '/api/user/profile' }).finally(() => this.refresh())
      return
    }
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
    api({ url: '/api/auth/login', method: 'POST' }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg || '登录失败', icon: 'none' })
        return
      }
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

  chooseAvatar() {
    if (!store.requireLogin()) return
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        this.uploadAvatarFile(file && file.tempFilePath)
      },
      fail: () => {}
    })
  },

  onProfileInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`profileForm.${key}`]: e.detail.value })
  },

  uploadAvatarFile(filePath) {
    if (!filePath || this.avatarUploading) return
    this.avatarUploading = true
    wx.showLoading({ title: '\u4e0a\u4f20\u4e2d', mask: true })
    api({ url: '/api/files/upload-credential', method: 'POST', data: { scene: 'avatars' } }).then((res) => {
      if (res.code !== 200) throw new Error(res.msg || '\u83b7\u53d6\u4e0a\u4f20\u51ed\u8bc1\u5931\u8d25')
      const credential = res.data || {}
      const baseUrl = (getApp().globalData && getApp().globalData.baseUrl) || ''
      const relativeUploadUrl = credential.uploadUrl || '/api/files/upload'
      return new Promise((resolve, reject) => wx.uploadFile({
        url: /^https?:/i.test(relativeUploadUrl) ? relativeUploadUrl : baseUrl + relativeUploadUrl,
        filePath,
        name: 'file',
        formData: { scene: credential.scene || 'avatars', uploadToken: credential.uploadToken || '', objectKey: 'avatar.jpg' },
        success: (uploadRes) => {
          let payload = {}
          try { payload = JSON.parse(uploadRes.data || '{}') } catch (err) {}
          if (payload.code !== 200 || !payload.data || !payload.data.url) return reject(new Error(payload.msg || '\u5934\u50cf\u4e0a\u4f20\u5931\u8d25'))
          resolve({ avatar: payload.data.url, baseUrl })
        },
        fail: () => reject(new Error('\u5934\u50cf\u4e0a\u4f20\u5931\u8d25'))
      }))
    }).then(({ avatar, baseUrl }) => api({ url: '/api/user/profile', method: 'PUT', data: Object.assign({}, this.data.profileForm || {}, { avatar }) }).then((saved) => {
      if (saved.code !== 200) throw new Error(saved.msg || '\u5934\u50cf\u4fdd\u5b58\u5931\u8d25')
      store.updateUser({ avatar: /^https?:/i.test(avatar) ? avatar : baseUrl + avatar })
      wx.showToast({ title: '\u5934\u50cf\u5df2\u66f4\u65b0' })
      this.refresh()
    })).catch((err) => wx.showToast({ title: err.message || '\u5934\u50cf\u4e0a\u4f20\u5931\u8d25', icon: 'none' })).finally(() => {
      this.avatarUploading = false
      wx.hideLoading()
    })
  },
  saveProfile() {
    if (!store.requireLogin()) return
    api({ url: '/api/user/profile', method: 'PUT', data: this.data.profileForm }).then(() => {
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
    const type = e.currentTarget.dataset.type || 'goods'
    const id = e.currentTarget.dataset.id
    const url = type === 'goods'
      ? `/pages/detail/detail?id=${id}`
      : `/pages/service-detail/service-detail?id=${id}&type=${type}`
    wx.navigateTo({ url })
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
