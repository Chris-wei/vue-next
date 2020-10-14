(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Vue = {}));
}(this, (function (exports) { 'use strict';

  function _typeof(obj) {
    "@babel/helpers - typeof";

    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function (obj) {
        return typeof obj;
      };
    } else {
      _typeof = function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
    }

    return _typeof(obj);
  }

  // dom 操作
  var nodeOps = {
    // 插入节点
    insert: function insert(child, parent, anchor) {
      if (anchor) {
        parent.insertBefore(child, anchor);
      } else {
        parent.appendChild(child);
      }
    },
    // 移除节点
    remove: function remove(child) {
      var parent = child.parentNode;
      parent && parent.removeChild(child);
    },
    // 创建元素
    createElement: function createElement(tag) {
      return document.createElement(tag);
    },
    // 设置元素中的文本
    hostSetElementText: function hostSetElementText(el, text) {
      el.textContent = text;
    },
    // 更新属性
    hostPatchProps: function hostPatchProps(el, key, prevProps, nextProps) {
      // 匹配事件
      if (/^on[^a-z]/.test(key)) {
        var eventName = key.slice(2).toLowerCase(); // 如果上次一次事件有值，先移除

        prevProps && el.removeEventListener(eventName, prevProps); // 添加新的事件

        nextProps && el.addEventListener(eventName, nextProps, false);
      } else {
        // 设置其他属性
        if (nextProps == null) {
          // 删除元素的属性
          return el.removeAttribute(key);
        } // 样式


        if (key === 'style') {
          // 更新样式
          for (var _key in nextProps) {
            el.style[_key] = nextProps[_key];
          } // 删除没有的样式


          for (var _key2 in prevProps) {
            if (!nextProps.hasOwnProperty(_key2)) {
              el.style[_key2] = null;
            }
          }
        } else {
          el.setAttribute(key, nextProps);
        }
      }
    }
  };

  function getSequence(arr) {
    var p = arr.slice();
    var result = [0];
    var i, j, u, v, c;
    var len = arr.length;

    for (i = 0; i < len; i++) {
      var arrI = arr[i];

      if (arrI !== 0) {
        j = result[result.length - 1];

        if (arr[j] < arrI) {
          p[i] = j;
          result.push(i);
          continue;
        }

        u = 0;
        v = result.length - 1;

        while (u < v) {
          c = (u + v) / 2 | 0;

          if (arr[result[c]] < arrI) {
            u = c + 1;
          } else {
            v = c;
          }
        }

        if (arrI < arr[result[u]]) {
          if (u > 0) {
            p[i] = result[u - 1];
          }

          result[u] = i;
        }
      }
    }

    u = result.length;
    v = result[u - 1];

    while (u-- > 0) {
      result[u] = v;
      v = p[v];
    }

    return result;
  }

  var activeEffect; // 副作用

  function effect$1(fn) {
    // 存储fn方法，数据更新要重新调用
    activeEffect = fn; // effect默认先执行一次

    fn(); // 页面渲染完毕需要清空 effect

    activeEffect = null;
  } // 响应式对象

  function reactive(target) {
    return new Proxy(target, {
      // set 拦截器，不需要重写每个属性
      set: function set(target, key, value, receiver) {
        // reflect 有返回值
        var res = Reflect.set(target, key, value, receiver); // 触发更新

        trigger(target, key);
        return res;
      },
      // get 拦截器
      get: function get(target, key, receiver) {
        // 如果是对象，递归代理
        if (_typeof(target[key]) === 'object') return reactive(target[key]); // 普通对象直接返回

        var res = Reflect.get(target, key, receiver); // 依赖收集

        track(target, key);
        return res;
      }
    });
  } // 依赖收集，确定某个属性变了才更新，而不是整个对象，一个属性要收集对应的 effect
  // map { map : [set]}

  var targetMap = new WeakMap();

  function track(target, key) {
    // target 中的 key 对应多个 effect
    var depsMap = targetMap.get(target); // target 对象是否有依赖收集

    if (!depsMap) {
      targetMap.set(target, depsMap = new Map());
    } // 查找 target 中 key 对应的 effect 依赖


    var deps = depsMap.get(key);

    if (!deps) {
      depsMap.set(key, deps = new Set());
    } // 依赖收集


    if (activeEffect && !deps.has(activeEffect)) {
      deps.add(activeEffect);
    }
  } // 触发更新


  function trigger(target, key) {
    // 查找依赖
    var depsMap = targetMap.get(target);
    if (!depsMap) return; // 获取 effects

    var effects = depsMap.get(key);
    effects && effects.forEach(function (effect) {
      return effect();
    });
  }

  function render(vnode, container) {
    // 渲染方法 1.初始化渲染 2.dom-diff
    patch(container._vnode, vnode, container); // 上一次的虚拟节点

    container._vnode = vnode;
  } // 渲染

  function patch(n1, n2, container, anchor) {
    // 后续 diff 可以执行此方法
    // 如果是组件，tag 是一个对象
    if (typeof n2.tag == "string") {
      processElement(n1, n2, container, anchor);
    } else if (_typeof(n2.tag) == "object") {
      // 组件渲染
      mountComponent(n2, container);
    }
  } // 处理节点


  function processElement(n1, n2, container, anchor) {
    // 初始化渲染
    if (n1 == null) {
      // 标签渲染
      mountElement(n2, container, anchor);
    } else {
      // diff 对比
      patchElement(n1, n2);
    }
  } // diff


  function patchElement(n1, n2) {
    // 考虑都有key的情况
    // 节点一样就复用
    var el = n2.el = n1.el; // 属性对比

    var oldProps = n1.props;
    var newProps = n2.props;
    patchProps(el, oldProps, newProps); // 比较元素中的children

    patchChildren(n1, n2, el);
  } // 属性对比


  function patchProps(el, oldProps, newProps) {
    if (oldProps !== newProps) {
      /* 1.将新的属性设置上去 */
      for (var key in newProps) {
        // 老的属性值
        var prev = oldProps[key]; // 新的属性值

        var next = newProps[key];

        if (prev !== next) {
          // 设置新的值
          nodeOps.hostPatchProps(el, key, prev, next);
        }
      }
      /* 2.将旧的有而新的没有的删除 */


      for (var _key in oldProps) {
        if (!newProps.hasOwnProperty(_key)) {
          // 清空新的没有的属性
          nodeOps.hostPatchProps(el, _key, oldProps[_key], null);
        }
      }
    }
  } // 子元素对比


  function patchChildren(n1, n2, container) {
    var c1 = n1.children;
    var c2 = n2.children;

    if (typeof c2 == 'string') {
      // new 子元素是字符串，文本替换
      if (c1 !== c2) {
        nodeOps.hostSetElementText(container, c2);
      }
    } else {
      // new 子元素是数组
      if (typeof c1 == "string") {
        // 先删除 old 原有的内容，然后插入新内容
        nodeOps.hostSetElementText(container, ''); // 挂在新的children

        mountChildren(c2, container);
      } else {
        // new 和 old 的 children 都是数组
        patchKeyChildren(c1, c2, container);
      }
    }
  } // 对比children中的key


  function patchKeyChildren(c1, c2, container) {
    // 1.根据新节点生成 key 对应 index 的映射表
    var e1 = c1.length - 1; // old 最后一项索引

    var e2 = c2.length - 1; // new 最后一项索引
    //

    var keyToNewIndexMap = new Map();

    for (var i = 0; i <= e2; i++) {
      var currentEle = c2[i]; // 当前元素

      keyToNewIndexMap.set(currentEle.props.key, i);
    } // 2.查找老节点 有无对应的 key ，有就复用


    var newIndexToOldIndexMap = new Array(e2 + 1); // 用于标识哪个元素被patch过

    for (var _i = 0; _i <= e2; _i++) {
      newIndexToOldIndexMap[_i] = -1;
    }

    for (var _i2 = 0; _i2 <= e1; _i2++) {
      var oldVNode = c1[_i2]; // 新的索引

      var newIndex = keyToNewIndexMap.get(oldVNode.props.key);

      if (newIndex === undefined) {
        // old 有，new 没有
        nodeOps.remove(oldVNode.el); // 直接删除 old 节点
      } else {
        // 复用
        // 比对属性
        newIndexToOldIndexMap[newIndex] = _i2 + 1;
        patch(oldVNode, c2[newIndex], container);
      }
    }

    var sequence = getSequence(newIndexToOldIndexMap); // 获取最长序列个数

    var j = sequence.length - 1; // 获取最后的索引
    // 以上方法仅仅对比和删除无用节点，没有移动操作
    // 从后往前插入

    for (var _i3 = e2; _i3 >= 0; _i3--) {
      var _currentEle = c2[_i3];
      var anchor = _i3 + 1 <= e2 ? c2[_i3 + 1].el : null; // 新的节点比老得多

      if (newIndexToOldIndexMap[_i3] === -1) {
        // 新元素，需要插入到列表中
        patch(null, _currentEle, container, anchor); // 插入到 anchor 前面
      } else {
        // 获取最长递增子序列，来确定不用移动的元素，直接跳过即可
        if (_i3 === sequence[j]) {
          j--;
        } else {
          // 插入元素
          nodeOps.insert(_currentEle.el, container, anchor);
        }
      }
    }
  } // 挂载节点


  function mountElement(vnode, container, anchor) {
    var tag = vnode.tag,
        props = vnode.props,
        children = vnode.children; // 创建元素，将虚拟节点和真实节点建立映射关系

    var el = vnode.el = nodeOps.createElement(tag); // 处理属性

    if (props) {
      for (var key in props) {
        nodeOps.hostPatchProps(el, key, {}, props[key]);
      }
    } // children 是数组


    if (Array.isArray(children)) {
      mountChildren(children, el);
    } else {
      // 字符串
      nodeOps.hostSetElementText(el, children);
    } // 插入节点


    nodeOps.insert(el, container, anchor);
  } // 挂载子节点


  function mountChildren(children, container) {
    for (var i = 0; i < children.length; i++) {
      var child = children[i]; // 递归挂载节点

      patch(null, child, container);
    }
  } // 挂载组件


  function mountComponent(vnode, container) {
    // 根据组件创建一个示例
    var instance = {
      vnode: vnode,
      // 虚拟节点
      render: null,
      // setup的返回值
      subTree: null // render返回的结果

    }; // 声明组件

    var Component = vnode.tag; // 调用 setup 返回 render

    instance.render = Component.setup(vnode.props, instance); // 只收集组件的依赖，每个组件都有 effect ， 用于局部渲染

    effect(function () {
      // 如果是对象， template => render ， 把 render 方法挂在到对象上
      instance.subTree = instance.render && instance.render(); // 将组件插入到 container 中

      patch(null, instance.subTree, container);
    });
  }

  exports.effect = effect$1;
  exports.reactive = reactive;
  exports.render = render;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
