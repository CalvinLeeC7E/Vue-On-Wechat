'use strict'
/**
 * ResPage替换了微信小程序默认的Page，它支持基于VueJs的数据驱动能力。
 * @type {cr}
 */
const VueData = require('../lib/vuedata.runtime.common.min')
const throttle = require('../lib/lodash-throttle')
const DataDiff = require('./data-diff')
global.App = global.App || App
global.Page = global.Page || Page

const VUE_DATA_DATA_NAME = '_data'
const VUE_DATA_PROP_NAME = '_props'
const VUE_DATA_COMPUTED_NAME = '_computedWatchers'

class ResDataHelper {
  constructor (vueData = {}, wxCtx) {
    this.canSetViewData = true
    this._bindDataChange(wxCtx)
    const vm = new VueData({
      ...vueData
    }, (vmCtx) => {
      if (this._vueDataChange) this._vueDataChange(vmCtx)
    })
    this.vm = vm
  }

  // 获取vm实例
  getVM () {
    return this.vm
  }

  // 设置微信视图数据
  _setViewData (ctx, vData) {
    if (!this.canSetViewData) return
    const renderData = DataDiff(ctx.data, vData)
    if (renderData) ctx.setData(renderData)
  }

  // 暂停设置Data
  pauseSetViewData () {
    this.canSetViewData = false
  }

  // 恢复设置Data
  resumeSetViewData () {
    this.canSetViewData = true
    this._vueDataChange(this.vm)
  }

  // 销毁实例
  destroy () {
    this.vm.$destroy()
  }

  // 设置数据变化时的微信上下文环境
  _bindDataChange (wxCtx) {
    const setDataWithThrottle = throttle((vData) => {
      this._setViewData(wxCtx, vData)
    }, 67)
    this._vueDataChange = function (vmCtx) {
      setDataWithThrottle(ResDataHelper.stdData(vmCtx))
    }
  }

  // 获取VueData标准数据
  static stdData (vm) {
    const vmData = {}
    ResDataHelper.proxy(vmData, vm, VUE_DATA_DATA_NAME)
    ResDataHelper.proxy(vmData, vm, VUE_DATA_PROP_NAME)
    ResDataHelper.proxy(vmData, vm, VUE_DATA_COMPUTED_NAME)
    return vmData
  }

  // setter/getter 方法深度转发
  static proxy (target, source, field) {
    function defineProperty (target, key, getter, setter) {
      const sharedPropertyDefinition = {
        enumerable: true,
        configurable: true
      }
      sharedPropertyDefinition.get = getter
      sharedPropertyDefinition.set = setter
      Object.defineProperty(target, key, sharedPropertyDefinition)
    }

    // 创建临时对象
    function createTmpTarget (source) {
      if (source instanceof Array) {
        return []
      } else if (source instanceof Object) {
        return {}
      }
    }

    function _proxy (target, source, field) {
      const vData = field ? source[field] : source
      if (!vData) return
      for (let key in vData) {
        if (source[key] !== null && typeof source[key] === 'object' && Object.keys(source[key]).length) {
          // 引用类型处理
          let _target = createTmpTarget(source[key])
          _proxy(_target, source[key])
          defineProperty(target, key, function () {
            return _target
          }, function (val) {
            _target = val
            source[key] = val
          })
        } else {
          // 值类型处理
          defineProperty(target, key, function () {
            return source[key]
          }, function (val) {
            source[key] = val
          })
        }
      }
    }

    _proxy(target, source, field)
  }
}

function ResPage (options) {
  const {data, props, computed, methods, watch} = options
  delete options.data
  delete options.props
  delete options.computed
  delete options.methods
  delete options.watch
  const wrapHook = function (oriHookName, cb) {
    const oriHook = options[oriHookName]
    options[oriHookName] = function (...args) {
      if (cb) cb.call(this)
      if (oriHook) oriHook.apply(this, args)
    }
  }

  // onLoad
  wrapHook('onLoad', function () {
    const rd = new ResDataHelper({data, props, computed, methods, watch}, this)
    this.__rd__ = rd
    this.$vm = rd.getVM()
    // 将目标数据混合至微信上线文的vm上下文内容绑定至当前微信环境
    ResDataHelper.proxy(this, this.$vm, VUE_DATA_DATA_NAME)
    ResDataHelper.proxy(this, this.$vm, VUE_DATA_PROP_NAME)
    ResDataHelper.proxy(this, this.$vm, VUE_DATA_COMPUTED_NAME)
  })
  // onShow
  wrapHook('onShow', function () {
    this.__rd__.resumeSetViewData()
  })
  // onHide
  wrapHook('onHide', function () {
    this.__rd__.pauseSetViewData()
  })
  // onUnload
  wrapHook('onUnload', function () {
    this.__rd__.destroy()
  })
  const pageOptions = {
    data: {},
    ...options
  }
  global.Page(pageOptions)
}

module.exports = ResPage
