// dom 操作
export const nodeOps = {
	// 插入节点
	insert (child, parent, anchor) {
		if ( anchor ) {
			parent.insertBefore(child, anchor)
		} else {
			parent.appendChild(child)
		}
	},
	// 移除节点
	remove (child) {
		const parent = child.parentNode;
		parent && parent.removeChild(child);
	},
	// 创建元素
	createElement (tag) {
		return document.createElement(tag)
	},
	// 设置元素中的文本
	hostSetElementText (el, text) {
		el.textContent = text;
	},
	// 更新属性
	hostPatchProps (el, key, prevProps, nextProps) {
		// 匹配事件
		if ( /^on[^a-z]/.test(key) ) {
			const eventName = key.slice(2).toLowerCase();
			// 如果上次一次事件有值，先移除
			prevProps && el.removeEventListener(eventName, prevProps)
			// 添加新的事件
			nextProps && el.addEventListener(eventName, nextProps, false);
		} else {
			// 设置其他属性
			if ( nextProps == null ) {
				// 删除元素的属性
				return el.removeAttribute(key);
			}
			// 样式
			if ( key === 'style' ) {
				// 更新样式
				for ( let key in nextProps ) {
					el.style[key] = nextProps[key]
				}
				// 删除没有的样式
				for ( let key in prevProps ) {
					if ( !nextProps.hasOwnProperty(key) ) {
						el.style[key] = null;
					}
				}
			} else {
				el.setAttribute(key, nextProps)
			}
		}
	}
}
