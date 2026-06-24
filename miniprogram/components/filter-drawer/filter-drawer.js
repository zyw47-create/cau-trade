function copyFilters(filters) {
  return Object.assign({
    minPrice: '',
    maxPrice: '',
    condition: '',
    location: '',
    onlyVerified: false
  }, filters || {})
}

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    filters: {
      type: Object,
      value: {}
    },
    conditions: {
      type: Array,
      value: []
    },
    locations: {
      type: Array,
      value: []
    }
  },

  data: {
    draft: copyFilters()
  },

  observers: {
    filters(filters) {
      this.setData({ draft: copyFilters(filters) })
    },
    visible(visible) {
      if (visible) this.setData({ draft: copyFilters(this.properties.filters) })
    }
  },

  methods: {
    noop() {},

    close() {
      this.triggerEvent('close')
    },

    onInput(e) {
      const key = e.currentTarget.dataset.key
      this.setData({ [`draft.${key}`]: e.detail.value })
    },

    chooseCondition(e) {
      const value = e.currentTarget.dataset.value
      this.setData({ 'draft.condition': this.data.draft.condition === value ? '' : value })
    },

    chooseLocation(e) {
      const value = e.currentTarget.dataset.value
      this.setData({ 'draft.location': this.data.draft.location === value ? '' : value })
    },

    toggleVerified() {
      this.setData({ 'draft.onlyVerified': !this.data.draft.onlyVerified })
    },

    reset() {
      const draft = copyFilters()
      this.setData({ draft })
      this.triggerEvent('confirm', draft)
    },

    confirm() {
      this.triggerEvent('confirm', copyFilters(this.data.draft))
    }
  }
})
