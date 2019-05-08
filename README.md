# vue-on-wechat

VueJs驱动的微信小程序，提供VueJs一样的开发体验。

## 安装

```bash
npm i vue-on-wechat -S
```

## 使用

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

## Vuex的集成

定义一个Store模块

```javascript
import {Vue, Vuex} from 'vue-on-wechat'
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
