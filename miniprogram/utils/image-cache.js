const cache = {}

function shouldLocalize(url) {
  return typeof url === 'string' && /^http:\/\/127\.0\.0\.1:\d+\/uploads\//.test(url)
}

function localizeUrl(url) {
  if (!shouldLocalize(url)) return Promise.resolve(url || '')
  if (cache[url]) return Promise.resolve(cache[url])
  return new Promise((resolve) => {
    wx.downloadFile({
      url,
      success(res) {
        if (res.statusCode === 200 && res.tempFilePath) {
          cache[url] = res.tempFilePath
          resolve(res.tempFilePath)
          return
        }
        resolve('')
      },
      fail() {
        resolve('')
      }
    })
  })
}

function localizeGoodsImages(goods) {
  const list = goods || []
  return Promise.all(list.map((item) => localizeUrl(item.image).then((image) => {
    if (!image) return Object.assign({}, item, { image: '' })
    return Object.assign({}, item, { image })
  })))
}

module.exports = {
  localizeGoodsImages
}
