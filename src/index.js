import {nodeOps} from "./runtime-dom";
import getSequence from './sequence'

export * from './reactivity'

// 渲染函数
export function render (vnode, container) {
	// 渲染方法 1.初始化渲染 2.dom-diff
	patch(container._vnode, vnode, container)
	// 上一次的虚拟节点
	container._vnode = vnode;
}

// 渲染
function patch (n1, n2, container, anchor) {	// 后续 diff 可以执行此方法
	// 如果是组件，tag 是一个对象
	if ( typeof n2.tag == "string" ) {
		processElement(n1, n2, container, anchor)
	} else if ( typeof n2.tag == "object" ) {
		// 组件渲染
		mountComponent(n2, container)
	}
}

// 处理节点
function processElement (n1, n2, container, anchor) {
	// 初始化渲染
	if ( n1 == null ) {
		// 标签渲染
		mountElement(n2, container, anchor)
	} else {
		// diff 对比
		patchElement(n1, n2)
	}
}

// diff
function patchElement (n1, n2) {
	// 考虑都有key的情况
	// 节点一样就复用
	let el = n2.el = n1.el;
	// 属性对比
	const oldProps = n1.props;
	const newProps = n2.props;
	patchProps(el, oldProps, newProps)
	// 比较元素中的children
	patchChildren(n1, n2, el)
}

// 属性对比
function patchProps (el, oldProps, newProps) {
	if ( oldProps !== newProps ) {
		/* 1.将新的属性设置上去 */
		for ( let key in newProps ) {
			// 老的属性值
			const prev = oldProps[key];
			// 新的属性值
			const next = newProps[key];
			if ( prev !== next ) {
				// 设置新的值
				nodeOps.hostPatchProps(el, key, prev, next)
			}
		}
		/* 2.将旧的有而新的没有的删除 */
		for ( let key in oldProps ) {
			if ( !newProps.hasOwnProperty(key) ) {
				// 清空新的没有的属性
				nodeOps.hostPatchProps(el, key, oldProps[key], null)
			}
		}
	}
}

// 子元素对比
function patchChildren (n1, n2, container) {
	const c1 = n1.children;
	const c2 = n2.children;

	if ( typeof c2 == 'string' ) { // new 子元素是字符串，文本替换
		if ( c1 !== c2 ) {
			nodeOps.hostSetElementText(container, c2);
		}
	} else { // new 子元素是数组
		if ( typeof c1 == "string" ) {	// 先删除 old 原有的内容，然后插入新内容
			nodeOps.hostSetElementText(container, '');
			// 挂在新的children
			mountChildren(c2, container);
		} else {
			// new 和 old 的 children 都是数组
			patchKeyChildren(c1, c2, container);
		}
	}
}

// 对比children中的key
function patchKeyChildren (c1, c2, container) {
	// 1.根据新节点生成 key 对应 index 的映射表
	let e1 = c1.length - 1;	// old 最后一项索引
	let e2 = c2.length - 1;	// new 最后一项索引
	//
	const keyToNewIndexMap = new Map();
	for ( let i = 0; i <= e2; i++ ) {
		const currentEle = c2[i]; // 当前元素
		keyToNewIndexMap.set(currentEle.props.key, i)
	}
	// 2.查找老节点 有无对应的 key ，有就复用
	const newIndexToOldIndexMap = new Array(e2 + 1);
	// 用于标识哪个元素被patch过
	for ( let i = 0; i <= e2; i++ ) newIndexToOldIndexMap[i] = -1;

	for ( let i = 0; i <= e1; i++ ) {
		const oldVNode = c1[i];
		// 新的索引
		let newIndex = keyToNewIndexMap.get(oldVNode.props.key);
		if ( newIndex === undefined ) { // old 有，new 没有
			nodeOps.remove(oldVNode.el) // 直接删除 old 节点
		} else {// 复用
			// 比对属性
			newIndexToOldIndexMap[newIndex] = i + 1;
			patch(oldVNode, c2[newIndex], container);
		}
	}

	let sequence = getSequence(newIndexToOldIndexMap);	// 获取最长序列个数
	let j = sequence.length - 1; // 获取最后的索引

	// 以上方法仅仅对比和删除无用节点，没有移动操作

	// 从后往前插入
	for ( let i = e2; i >= 0; i-- ) {
		let currentEle = c2[i];
		const anchor = (i + 1 <= e2) ? c2[i + 1].el : null;
		// 新的节点比老得多
		if ( newIndexToOldIndexMap[i] === -1 ) { // 新元素，没有patch过，需要插入到列表中
			patch(null, currentEle, container, anchor);	// 插入到 anchor 前面
		} else {
			// 获取最长递增子序列，来确定不用移动的元素，直接跳过即可
			if ( i === sequence[j] ) {
				j--;
			} else {
				// 插入元素
				nodeOps.insert(currentEle.el, container, anchor);
			}
		}
	}
}

// 挂载节点
function mountElement (vnode, container, anchor) {
	const { tag, props, children } = vnode;
	// 创建元素，将虚拟节点和真实节点建立映射关系
	let el = (vnode.el = nodeOps.createElement(tag));

	// 处理属性
	if ( props ) {
		for ( let key in props ) {
			nodeOps.hostPatchProps(el, key, {}, props[key])
		}
	}
	// children 是数组
	if ( Array.isArray(children) ) {
		mountChildren(children, el)
	} else {
		// 字符串
		nodeOps.hostSetElementText(el, children);
	}
	// 插入节点
	nodeOps.insert(el, container, anchor)
}

// 挂载子节点
function mountChildren (children, container) {
	for ( let i = 0; i < children.length; i++ ) {
		let child = children[i];
		// 递归挂载节点
		patch(null, child, container);
	}
}

// 挂载组件
function mountComponent (vnode, container) {
	// 根据组件创建一个示例
	const instance = {
		vnode: vnode, // 虚拟节点
		render: null,	// setup的返回值
		subTree: null, // render返回的结果
	}
	// 声明组件
	const Component = vnode.tag;
	// 调用 setup 返回 render
	instance.render = Component.setup(vnode.props, instance);
	// 只收集组件的依赖，每个组件都有 effect ， 用于局部渲染
	effect(() => {
		// 如果是对象， template => render ， 把 render 方法挂在到对象上
		instance.subTree = instance.render && instance.render()
		// 将组件插入到 container 中
		patch(null, instance.subTree, container)
	})
}
