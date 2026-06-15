const { api } = require('../../utils/api')
const store = require('../../utils/store')
const mock = require('../../utils/mock')

const BLOCKED_KEYWORDS = ['违禁', '违规', '危险品', '仿冒', '代考', '作弊', '校园贷', '网贷', '烟草', '酒精', '管制刀具', '毒品', '枪支', '诈骗', '套现']

function findBlockedKeywords(form) {
  const text = [form.title, form.category, form.condition, form.desc, form.location, form.pickupLocation, form.deliveryLocation]
    .filter(Boolean)
    .join(' ')
  return BLOCKED_KEYWORDS.filter((keyword) => text.indexOf(keyword) >= 0)
}

Page({
  data: {
    categories: mock.categories,
    publishTabs: [
      { key: 'goods', text: '二手闲置', className: 'publish-tab active' },
      { key: 'service', text: '校园服务', className: 'publish-tab' },
      { key: 'errand', text: '跑腿订单', className: 'publish-tab' }
    ],
    activeType: 'goods',
    pageTitle: '发布二手闲置',
    pageSubtitle: '填写商品信息，提交时进行实名和AI审核校验',
    formTitle: '商品信息',
    priceLabel: '价格',
    descPlaceholder: '描述、交易地点、验货说明',
    showGoodsFields: true,
    showErrandFields: false,
    form: {
      title: '',
      category: '教材资料',
      condition: '九成新',
      price: '',
      desc: '',
      location: '',
      pickupLocation: '',
      deliveryLocation: ''
    },
    aiTags: [],
    verifyTip: '可先填写草稿，点击“提交发布”时再校验实名认证。'
  },

  chooseType(e) {
    const activeType = e.currentTarget.dataset.key
    const copy = this.getTypeCopy(activeType)
    this.setData(Object.assign({
      activeType,
      publishTabs: this.data.publishTabs.map((item) => Object.assign({}, item, {
        className: item.key === activeType ? 'publish-tab active' : 'publish-tab'
      })),
      aiTags: []
    }, copy))
  },

  getTypeCopy(type) {
    if (type === 'service') {
      return {
        pageTitle: '发布校园服务',
        pageSubtitle: '面向同校用户发布可预约服务，服务费进入平台托管',
        formTitle: '服务信息',
        priceLabel: '服务费',
        descPlaceholder: '服务内容、可预约时间、交付方式',
        showGoodsFields: false,
        showErrandFields: false
      }
    }
    if (type === 'errand') {
      return {
        pageTitle: '发起跑腿订单',
        pageSubtitle: '发布取送需求，等待骑手抢单并在订单页查看进度',
        formTitle: '跑腿需求',
        priceLabel: '报酬',
        descPlaceholder: '取件要求、送达时间、联系人备注',
        showGoodsFields: false,
        showErrandFields: true
      }
    }
    return {
      pageTitle: '发布二手闲置',
      pageSubtitle: '填写商品信息，提交时进行实名和AI审核校验',
      formTitle: '商品信息',
      priceLabel: '价格',
      descPlaceholder: '描述、交易地点、验货说明',
      showGoodsFields: true,
      showErrandFields: false
    }
  },

  updateField(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`form.${key}`]: e.detail.value })
  },

  chooseCategory(e) {
    this.setData({ 'form.category': this.data.categories[e.detail.value] })
  },

  aiGenerate() {
    const { title, category, condition, pickupLocation, deliveryLocation } = this.data.form
    let generatedTitle = title || `${condition}${category}闲置`
    let desc = `${category}闲置，${condition}，支持校内当面验货。可通过平台聊天确认交易时间和地点。`
    let tags = [category, condition, '校内自提', '平台留痕']
    if (this.data.activeType === 'service') {
      generatedTitle = title || '校园服务预约'
      desc = '说明服务内容、可预约时间、交付地点和完成标准，服务费通过平台托管。'
      tags = ['校园服务', '可预约', '资金托管', '服务评价']
    } else if (this.data.activeType === 'errand') {
      generatedTitle = title || '校内跑腿代取'
      desc = `请从${pickupLocation || '取件点'}取件送到${deliveryLocation || '送达点'}，接单后通过聊天同步进度，完成后确认结算。`
      tags = ['跑腿订单', '可抢单', '进度留痕', '完成结算']
    }
    this.setData({
      'form.title': generatedTitle,
      'form.desc': desc,
      aiTags: tags
    })
  },

  submit() {
    if (!store.requireVerified()) return
    const form = this.data.form
    if (!form.title || !form.price || !form.desc) {
      wx.showToast({ title: '请补全标题、金额和描述', icon: 'none' })
      return
    }
    if (Number(form.price) <= 0) {
      wx.showToast({ title: '金额必须大于0', icon: 'none' })
      return
    }
    if (Number(form.price) > 9999) {
      wx.showToast({ title: '金额过高，请重新填写', icon: 'none' })
      return
    }
    const blockedKeywords = findBlockedKeywords(form)
    if (blockedKeywords.length) {
      wx.showToast({ title: `包含违禁词：${blockedKeywords[0]}`, icon: 'none' })
      return
    }
    if (this.data.activeType === 'goods' && !form.location) {
      wx.showToast({ title: '请填写交易地点', icon: 'none' })
      return
    }
    if (this.data.activeType === 'errand' && (!form.pickupLocation || !form.deliveryLocation)) {
      wx.showToast({ title: '请填写取件和送达地点', icon: 'none' })
      return
    }
    const url = this.data.activeType === 'goods' ? '/api/goods/save' : '/api/service/save'
    const payload = Object.assign({}, form, {
      type: this.data.activeType === 'errand' ? 'errand' : 'service',
      location: this.data.activeType === 'errand' ? `${form.pickupLocation} -> ${form.deliveryLocation}` : form.location
    })
    api({ url, method: 'POST', data: payload }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      const status = res.data.status
      const title = status === 'pending' ? '已提交审核' : this.data.activeType === 'errand' ? '跑腿待支付' : this.data.activeType === 'service' ? '服务已发布' : '发布成功'
      wx.showToast({ title })
      if (this.data.activeType === 'errand' && res.data.orderSn) {
        wx.navigateTo({ url: `/pages/order-detail/order-detail?orderSn=${res.data.orderSn}` })
        return
      }
      wx.switchTab({ url: '/pages/home/home' })
    })
  }
})
