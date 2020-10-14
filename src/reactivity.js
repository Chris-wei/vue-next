let activeEffect;

// 副作用
export function effect (fn) {
	// 存储fn方法，数据更新要重新调用
	activeEffect = fn;
	// effect默认先执行一次
	fn();
	// 页面渲染完毕需要清空 effect
	activeEffect = null;
}

// 响应式对象
export function reactive (target) {
	return new Proxy(target, {
		// set 拦截器，不需要重写每个属性
		set (target, key, value, receiver) {
			// reflect 有返回值
			const res = Reflect.set(target, key, value, receiver);
			// 触发更新
			trigger(target, key)
			return res;
		},
		// get 拦截器
		get (target, key, receiver) {
			// 如果是对象，递归代理
			if ( typeof target[key] === 'object' ) return reactive(target[key]);
			// 普通对象直接返回
			const res = Reflect.get(target, key, receiver);
			// 依赖收集
			track(target, key)
			return res;
		}
	})
}

// 依赖收集，确定某个属性变了才更新，而不是整个对象，一个属性要收集对应的 effect
// map { map : [set]}
const targetMap = new WeakMap();

function track (target, key) {
	// target 中的 key 对应多个 effect
	let depsMap = targetMap.get(target);
	// target 对象是否有依赖收集
	if ( !depsMap ) {
		targetMap.set(target, (depsMap = new Map()));
	}
	// 查找 target 中 key 对应的 effect 依赖
	let deps = depsMap.get(key);
	if ( !deps ) {
		depsMap.set(key, (deps = new Set()));
	}
	// 依赖收集
	if ( activeEffect && !deps.has(activeEffect) ) {
		deps.add(activeEffect)
	}
}

// 触发更新
function trigger (target, key) {
	// 查找依赖
	const depsMap = targetMap.get(target);
	if ( !depsMap ) return;
	// 获取 effects
	const effects = depsMap.get(key);
	effects && effects.forEach(effect => effect());
}
