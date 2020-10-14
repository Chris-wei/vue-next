import babel from 'rollup-plugin-babel'
import serve from 'rollup-plugin-serve'

export default {
	input : './src/index.js',
	output : {
		format : 'umd',	 // amd commonjs规范  默认将打包后的结果挂载到window上
		file : 'dist/umd/vue.js',
		name : 'Vue',
		sourceMap: true
	},
	plugins : [
		babel ({
			exclude : 'node_modules/**'
		}),
		serve({
			open: true,
			openPage: '/index.html', // 打开的页面
			port: 3000,
			contentBase: ''
		})
	]
}
