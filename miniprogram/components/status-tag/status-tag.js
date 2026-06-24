Component({
  properties: {
    text: {
      type: String,
      value: ''
    },
    type: {
      type: String,
      value: 'default'
    }
  },

  observers: {
    'type': function(type) {
      this.setData({ className: this.getClassName(type) })
    }
  },

  data: {
    className: 'status-tag default'
  },

  lifetimes: {
    attached() {
      this.setData({ className: this.getClassName(this.data.type) })
    }
  },

  methods: {
    getClassName(type) {
      const success = ['ok', 'active', 'approved', 'completed', 'paid', 'on_sale']
      const warn = ['warn', 'pending', 'pending_verify', 'unpaid', 'refunding', 'waiting_accept']
      const danger = ['danger', 'rejected', 'cancelled', 'banned', 'removed']
      if (success.indexOf(type) >= 0) return 'status-tag success'
      if (warn.indexOf(type) >= 0) return 'status-tag warn'
      if (danger.indexOf(type) >= 0) return 'status-tag danger'
      return 'status-tag default'
    }
  }
})
