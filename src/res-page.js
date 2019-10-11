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
global.Component = global.Component || Component

const VUE_DATA_DATA_NAME = '_data'
const VUE_DATA_PROP_NAME = '_props'
const VUE_DATA_COMPUTED_NAME = '_computedWatchers'

class ResDataHelper {
  constructor (vueData = {}, wxCtx, setViewData = true) {
    this.canSetViewData = setViewData
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
          // 设置原型链方法
          if ('__proto__' in source[key]) {
            _target.__proto__ = source[key].__proto__
          }
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
    const rd = new ResDataHelper({data, props, computed, methods, watch}, this, true)
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

function ResComponent (options) {
  const {data, properties, methods, computed, watch} = options
  delete options.data
  delete options.computed
  delete options.watch
  const wrapHook = function (handler, oriHookName, cb) {
    const oriHook = handler[oriHookName]
    handler[oriHookName] = function (...args) {
      if (cb) cb.apply(this, args)
      if (oriHook) oriHook.apply(this, args)
    }
  }
  // 转化为符合Vue的Prop形式
  const vueProps = Object.keys(properties).reduce((res, item) => {
    if (typeof properties[item] === 'object') {
      properties[item]['default'] = properties[item]['value']
    } else {
      properties[item] = {
        type: properties[item]
      }
    }
    wrapHook(properties[item], 'observer', function (val) {
      if (this.$vm) this.$vm[item] = val
    })
    res[item] = properties[item]
    return res
  }, {})
  // 检查是否有lifetimes
  if (!options['lifetimes']) options['lifetimes'] = {}
  if (!options['pageLifetimes']) options['pageLifetimes'] = {}
  wrapHook(options, 'created', function () {
    // 组件此生命周期中，不能调用setData，所以setViewData设置为false，在后续的生命周期函数中恢复SetViewData。
    const rd = new ResDataHelper({data, props: vueProps, methods, computed, watch}, this, false)
    this.__rd__ = rd
    this.$vm = rd.getVM()
    // 将目标数据混合至微信上线文的vm上下文内容绑定至当前微信环境
    ResDataHelper.proxy(this, this.$vm, VUE_DATA_DATA_NAME)
    ResDataHelper.proxy(this, this.$vm, VUE_DATA_PROP_NAME)
    ResDataHelper.proxy(this, this.$vm, VUE_DATA_COMPUTED_NAME)
  })
  // attached
  wrapHook(options['lifetimes'], 'attached', function () {
    this.__rd__.resumeSetViewData()
  })
  // page onShow
  wrapHook(options['pageLifetimes'], 'show', function () {
    this.__rd__.resumeSetViewData()
  })
  // page onHide
  wrapHook(options['pageLifetimes'], 'hide', function () {
    this.__rd__.pauseSetViewData()
  })
  // detached
  wrapHook(options['lifetimes'], 'detached', function () {
    this.__rd__.destroy()
  })
  const pageOptions = {
    data: {},
    ...options
  }
  global.Component(pageOptions)
}

exports.ResPage = ResPage
exports.ResComponent = ResComponent
