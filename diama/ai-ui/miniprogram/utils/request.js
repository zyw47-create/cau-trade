const { goodsList } = require("./mock-data")
const env = require("../config/env")

function createTraceId() {
  return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function buildHeaders(customHeaders = {}, method = "GET") {
  const token = wx.getStorageSync("campus_token") || ""
  const headers = Object.assign(
    {
      "content-type": "application/json",
      "X-Trace-Id": createTraceId()
    },
    customHeaders
  )

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (["POST", "PUT", "DELETE"].includes(method.toUpperCase())) {
    headers["X-Idempotency-Key"] = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  return headers
}

function handleBizCode(result) {
  const code = result.code
  if (code === 0) {
    return result
  }

  if (code === 4001 || code === 4010) {
    wx.removeStorageSync("campus_token")
    wx.showToast({ title: "登录状态失效，请重新登录", icon: "none" })
    throw result
  }

  if (code === 5031) {
    wx.showToast({ title: "服务繁忙，请稍后重试", icon: "none" })
    throw result
  }

  wx.showToast({
    title: result.msg || "请求失败",
    icon: "none"
  })
  throw result
}

function mockRoute(url, data, options = {}) {
  if (url.includes("/goods/list")) {
    const pageNo = Number(data.pageNo || 1)
    const pageSize = Number(data.pageSize || 6)
    const keyword = String(data.keyword || "").trim()
    const categoryId = data.categoryId || "all"
    const sortType = data.sortType || "latest"
    const condition = data.condition || ""
    const aiOnly = !!data.aiOnly
    let list = goodsList.filter((item) => {
      const matchCategory = categoryId === "all" || item.categoryId === categoryId
      const matchKeyword =
        !keyword || item.title.includes(keyword) || item.summary.includes(keyword) || item.categoryName.includes(keyword)
      const matchCondition = !condition || item.conditionLabel === condition
      const matchAiOnly = !aiOnly || !!item.isAiAudit
      return matchCategory && matchKeyword && matchCondition && matchAiOnly
    })

    if (sortType === "price_asc") {
      list = list.slice().sort((a, b) => a.price - b.price)
    } else if (sortType === "price_desc") {
      list = list.slice().sort((a, b) => b.price - a.price)
    } else if (sortType === "popular") {
      list = list.slice().sort((a, b) => b.likes + b.views - (a.likes + a.views))
    } else {
      list = list.slice().sort((a, b) => b.id.localeCompare(a.id))
    }

    const start = (pageNo - 1) * pageSize
    const pageList = list.slice(start, start + pageSize)
    return {
      code: 0,
      msg: "success",
      data: {
        list: pageList,
        pageNo,
        pageSize,
        total: list.length,
        hasMore: start + pageSize < list.length
      },
      trace_id: createTraceId()
    }
  }

  if (url.includes("/goods/publish")) {
    return {
      code: 0,
      msg: "发布成功",
      data: {
        id: `g${Date.now()}`,
        auditStatus: "pending"
      },
      trace_id: createTraceId()
    }
  }

  return {
    code: 0,
    msg: "mock success",
    data: {
      url,
      payload: data,
      options
    },
    trace_id: createTraceId()
  }
}

function request(method, url, data = {}, options = {}) {
  const baseUrl = options.baseUrl || wx.getStorageSync("campus_base_url") || env.baseUrl
  const headers = buildHeaders(options.header, method)
  const timeout = options.timeout || 12000

  if (env.useMock || !baseUrl) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(handleBizCode(mockRoute(url, data, options)))
        } catch (error) {
          reject(error)
        }
      }, 120)
    })
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${url}`,
      method,
      data,
      timeout,
      header: headers,
      success(res) {
        try {
          resolve(handleBizCode(res.data || {}))
        } catch (error) {
          reject(error)
        }
      },
      fail(error) {
        wx.showToast({
          title: "网络异常，请稍后重试",
          icon: "none"
        })
        reject(error)
      }
    })
  })
}

function upload(url, filePath, formData = {}, options = {}) {
  const baseUrl = options.baseUrl || wx.getStorageSync("campus_base_url") || env.uploadUrl || env.baseUrl
  const header = buildHeaders(options.header, "POST")

  if (env.useMock || !baseUrl) {
    return Promise.resolve({
      code: 0,
      msg: "upload success",
      data: {
        url: `https://mock.local/${Date.now()}.jpg`,
        filePath,
        formData
      },
      trace_id: createTraceId()
    })
  }

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${baseUrl}${url}`,
      filePath,
      name: options.name || "file",
      formData,
      header,
      success(res) {
        try {
          const payload = typeof res.data === "string" ? JSON.parse(res.data) : res.data
          resolve(handleBizCode(payload || {}))
        } catch (error) {
          reject(error)
        }
      },
      fail(error) {
        wx.showToast({
          title: "上传失败，请重试",
          icon: "none"
        })
        reject(error)
      }
    })
  })
}

module.exports = {
  get(url, data, options) {
    return request("GET", url, data, options)
  },
  post(url, data, options) {
    return request("POST", url, data, options)
  },
  put(url, data, options) {
    return request("PUT", url, data, options)
  },
  del(url, data, options) {
    return request("DELETE", url, data, options)
  },
  upload
}
