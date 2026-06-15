const { api } = require('../../utils/api')
const store = require('../../utils/store')
const mock = require('../../utils/mock')

const BLOCKED_KEYWORDS = ['违禁', '违规', '危险品', '仿冒', '代考', '作弊', '校园贷', '网贷', '烟草', '酒精', '管制刀具', '毒品', '枪支', '诈骗', '套现']
const DRAFT_KEY = 'publish-main'

function findBlockedKeywords(form) {
  const text = [
    form.title,
    form.category,
    form.condition,
    form.desc,
    form.location,
    form.serviceTime,
    form.pickupLocation,
    form.deliveryLocation
  ].filter(Boolean).join(' ')
  return BLOCKED_KEYWORDS.filter((keyword) => text.indexOf(keyword) >= 0)
}

function createDefaultForm() {
  return {
    title: '',
    category: '教材资料',
    condition: '九成新',
    price: '',
    desc: '',
    location: '',
    serviceTime: '',
    pickupLocation: '',
    deliveryLocation: ''
  }
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
    pageSubtitle: '填写商品信息，提交时会进行实名认证和 AI 内容初审。',
    formTitle: '商品信息',
    priceLabel: '价格',
    descPlaceholder: '描述商品状态、交易地点和验货说明',
    extraPlaceholder: '例如：工作日晚 19:00-22:00',
    showGoodsFields: true,
    showServiceFields: false,
    showErrandFields: false,
    form: createDefaultForm(),
    aiTags: [],
    verifyTip: '可以先填写草稿，点击“提交发布”时再校验实名和认证状态。',
    draftTip: ''
  },

  onLoad() {
    this.restoreDraft()
  },

  onUnload() {
    this.persistDraft()
  },

  restoreDraft() {
    const draft = store.getDraft(DRAFT_KEY)
    if (!draft) return
    const activeType = draft.activeType || 'goods'
    const copy = this.getTypeCopy(activeType)
    this.setData(Object.assign({
      activeType,
      publishTabs: this.buildTabs(activeType),
      form: Object.assign(createDefaultForm(), draft.form || {}),
      aiTags: draft.aiTags || [],
      draftTip: '已恢复上次未提交的草稿。'
    }, copy))
  },

  persistDraft() {
    store.saveDraft(DRAFT_KEY, {
      activeType: this.data.activeType,
      form: this.data.form,
      aiTags: this.data.aiTags
    })
  },

  clearDraftState() {
    store.clearDraft(DRAFT_KEY)
    this.setData({ draftTip: '' })
  },

  buildTabs(activeType) {
    return this.data.publishTabs.map((item) => Object.assign({}, item, {
      className: item.key === activeType ? 'publish-tab active' : 'publish-tab'
    }))
  },

  chooseType(e) {
    const activeType = e.currentTarget.dataset.key
    const copy = this.getTypeCopy(activeType)
    this.setData(Object.assign({
      activeType,
      publishTabs: this.buildTabs(activeType),
      aiTags: [],
      form: Object.assign(createDefaultForm(), this.data.form),
      draftTip: ''
    }, copy))
    this.persistDraft()
  },

  getTypeCopy(type) {
    if (type === 'service') {
      return {
        pageTitle: '发布校园服务',
        pageSubtitle: '面向同校用户发布可预约服务，服务费支付后进入平台托管。',
        formTitle: '服务信息',
        priceLabel: '服务费',
        descPlaceholder: '描述服务内容、交付方式和完成标准',
        extraPlaceholder: '例如：周末下午或工作日晚',
        showGoodsFields: false,
        showServiceFields: true,
        showErrandFields: false
      }
    }
    if (type === 'errand') {
      return {
        pageTitle: '发起跑腿订单',
        pageSubtitle: '发布取送需求，等待骑手接单，并在订单页持续查看进度。',
        formTitle: '跑腿需求',
        priceLabel: '报酬',
        descPlaceholder: '填写取送要求、截止时间或联系人备注',
        extraPlaceholder: '',
        showGoodsFields: false,
        showServiceFields: false,
        showErrandFields: true
      }
    }
    return {
      pageTitle: '发布二手闲置',
      pageSubtitle: '填写商品信息，提交时会进行实名认证和 AI 内容初审。',
      formTitle: '商品信息',
      priceLabel: '价格',
      descPlaceholder: '描述商品状态、交易地点和验货说明',
      extraPlaceholder: '例如：北区宿舍门口',
      showGoodsFields: true,
      showServiceFields: false,
      showErrandFields: false
    }
  },

  updateField(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`form.${key}`]: e.detail.value, draftTip: '草稿已自动保存。' })
    this.persistDraft()
  },

  chooseCategory(e) {
    this.setData({
      'form.category': this.data.categories[e.detail.value],
      draftTip: '草稿已自动保存。'
    })
    this.persistDraft()
  },

  aiGenerate() {
    const { title, category, condition, pickupLocation, deliveryLocation, serviceTime, location } = this.data.form
    let generatedTitle = title || `${condition}${category}闲置`
    let desc = `${category}闲置，${condition}，支持校内当面验货。可通过平台聊天确认交易时间和地点。`
    let tags = [category, condition, '校内自提', '平台留痕']
    if (this.data.activeType === 'service') {
      generatedTitle = title || '校园服务预约'
      desc = `说明服务内容、可预约时间${serviceTime ? `（${serviceTime}）` : ''}、服务地点${location ? `（${location}）` : ''}和完成标准，服务费通过平台托管。`
      tags = ['校园服务', '可预约', '资金托管', '服务评价']
    } else if (this.data.activeType === 'errand') {
      generatedTitle = title || '校内跑腿代取'
      desc = `请从${pickupLocation || '取件点'}取件，送到${deliveryLocation || '送达点'}，接单后通过聊天同步进度，完成后确认结算。`
      tags = ['跑腿订单', '可抢单', '进度留痕', '完成结算']
    }
    this.setData({
      'form.title': generatedTitle,
      'form.desc': desc,
      aiTags: tags,
      draftTip: '草稿已自动保存。'
    })
    this.persistDraft()
  },

  validateForm() {
    const form = this.data.form
    if (!form.title || !form.price || !form.desc) {
      wx.showToast({ title: '请补全标题、金额和描述', icon: 'none' })
      return false
    }
    if (Number(form.price) <= 0) {
      wx.showToast({ title: '金额必须大于 0', icon: 'none' })
      return false
    }
    if (Number(form.price) > 9999) {
      wx.showToast({ title: '金额过高，请重新填写', icon: 'none' })
      return false
    }
    const blockedKeywords = findBlockedKeywords(form)
    if (blockedKeywords.length) {
      wx.showToast({ title: `包含违规词：${blockedKeywords[0]}`, icon: 'none' })
      return false
    }
    if (this.data.activeType === 'goods' && !form.location) {
      wx.showToast({ title: '请填写交易地点', icon: 'none' })
      return false
    }
    if (this.data.activeType === 'service' && !form.serviceTime) {
      wx.showToast({ title: '请填写服务时间', icon: 'none' })
      return false
    }
    if (this.data.activeType === 'service' && !form.location) {
      wx.showToast({ title: '请填写服务地点', icon: 'none' })
      return false
    }
    if (this.data.activeType === 'errand' && (!form.pickupLocation || !form.deliveryLocation)) {
      wx.showToast({ title: '请填写取件和送达地点', icon: 'none' })
      return false
    }
    return true
  },

  submit() {
    if (!store.requireVerified()) return
    const form = this.data.form
    if (!this.validateForm()) return

    const url = this.data.activeType === 'goods' ? '/api/goods/save' : '/api/service/save'
    const payload = Object.assign({}, form, {
      type: this.data.activeType === 'goods' ? 'goods' : this.data.activeType === 'errand' ? 'errand' : 'service',
      location: this.data.activeType === 'errand' ? `${form.pickupLocation} -> ${form.deliveryLocation}` : form.location
    })

    api({ url, method: 'POST', data: payload }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      this.clearDraftState()
      this.setData({
        form: createDefaultForm(),
        aiTags: []
      })
      const status = res.data.status
      const title = status === 'pending'
        ? '已提交审核'
        : this.data.activeType === 'errand'
          ? '跑腿待支付'
          : this.data.activeType === 'service'
            ? '服务已发布'
            : '发布成功'
      wx.showToast({ title })
      if (this.data.activeType === 'errand' && res.data.orderSn) {
        wx.navigateTo({ url: `/pages/order-detail/order-detail?orderSn=${res.data.orderSn}` })
        return
      }
      wx.switchTab({ url: '/pages/home/home' })
    })
  }
})
