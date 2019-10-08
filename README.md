# vue-on-wechat

VueJs驱动的微信小程序，提供VueJs一样的开发体验。

## 安装

```bash
npm i vue-on-wechat -S
```

## 使用

ResPage

```javascript
const {ResPage} = require('vue-on-wechat')
ResPage({
  data () {
    return {
      name: 'demo'
    }
  }
})
```

ResComponent

```javascript
const {ResComponent} = require('vue-on-wechat')
ResComponent({
  properties: {
    name: {
      type: String,
      value: 'im name'
    },
    age: Number
  },
  data () {
    return {
      content: 'just content'
    }
  },
  computed: {
    cName () {
      return `cName = ${this.name}`
    }
  },
})
```

## Vuex的集成

定义一个Store模块

```javascript
const {Vue, Vuex} = require('vue-on-wechat')
Vue.use(Vuex)
module.exports = new Vuex.Store({
  state: {
    name: 'Vuex'
  },
  getters: {
    getName (state) {
      return state.name
    }
  }
})
```

在业务中使用Store模块

ResPage与ResComponent均支持Store。

```javascript
const {ResPage} = require('vue-on-wechat')
ResPage({
  computed: {
    name () {
      return Store.getters['getName']
  }
})
```

## 包导出的内容

* Vue
* Vuex
* ResPage
* ResComponent
