'use strict'

/**
 * 数据差分对比
 * @param oldData
 * @param newData
 * @returns {*}
 */
const cloneDeep = require('../lib/lodash-clonedeep.min')
module.exports = function diff (oldData, newData) {
  let diffData = null

  function getValueByPath (path, data) {
    const pathItems = path.split(/\.|\[/).map(item => item.replace(']', ''))
    let currentVal = data
    for (let item of pathItems) {
      if (currentVal === null || currentVal === undefined) return currentVal
      currentVal = currentVal[item]
    }
    return currentVal
  }

  function objPath (keyRoot) {
    return function (key) {
      return keyRoot + '.' + key
    }
  }

  function arrPath (keyRoot) {
    return function (key) {
      return keyRoot + '[' + key + ']'
    }
  }

  function setDiffData (key, value) {
    if (diffData === null) diffData = {}
    diffData[key] = value
  }

  function compare (data, keyRootFunc = null) {
    Object.keys(data).forEach(key => {
      const currentKey = keyRootFunc ? keyRootFunc(key) : key
      const val = getValueByPath(currentKey, newData)
      if (val instanceof Array) {
        const oldVal = getValueByPath(currentKey, oldData) || []
        // 数组长度变小则直接赋值，否则比对
        if (val.length < oldVal.length) {
          setDiffData(currentKey, cloneDeep(val))
        } else {
          compare(val, arrPath(currentKey))
        }
      } else if (val instanceof Object) {
        compare(val, objPath(currentKey))
      } else if (val !== getValueByPath(currentKey, oldData)) {
        if (diffData === null) diffData = {}
        // 微信不允许设置data的value为undefined
        if (val !== undefined) setDiffData(currentKey, val)
      }
    })
  }

  // 初始化旧数据，并deep_clone一个对象返回，为了以后对比数据
  if (oldData['__have_run_diff__'] === undefined) return Object.assign({__have_run_diff__: 'done'}, cloneDeep(newData))
  compare(newData)
  return diffData
}
