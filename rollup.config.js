import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import {terser} from 'rollup-plugin-terser'

export default {
  input: 'index.js',
  plugins: [
    resolve(),
    commonjs(),
    terser()
  ],
  output: {
    file: 'miniprogram_dist/index.js',
    format: 'cjs'
  }
}
