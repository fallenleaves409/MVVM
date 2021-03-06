/**
 * compile主要做的事情是解析模板指令，将模板中的变量替换成数据，然后初始化渲染页面视图
 * 并将每个指令对应的节点绑定更新函数，添加监听数据的订阅者，一旦数据有变动，收到通知，更新视图
 * @param {[type]} el dom节点
 * @param {[type]} vm 实例化MVVM对象
 */
function Compile(el, vm) {
	this.$vm = vm
	this.$el = this.isElementNode(el) ? el : document.querySelector(el);
	if(this.$el) {

		//将根节点的子节点转换为文档碎片，提高性能
		this.$fragment = this.node2Fragment(this.$el);
		this.init();
		this.$el.appendChild(this.$fragment);
	}
}

Compile.prototype = {
	constructor: Compile,

	node2Fragment: function (el) {
		var fragment = document.createDocumentFragment();
		var child;

		//拷贝原生节点到fragment
		while(child = el.firstChild) {
			fragment.appendChild(child);
		}

		return fragment;
	},

	init: function () {
		this.compileElement(this.$fragment);
	},

	compileElement: function (el) {
		var childNodes = el.childNodes;
		var me = this;
		[].slice.call(childNodes).forEach(function(node) {
			var text = node.textContent;
			var reg = /\{\{(.*)\}\}/;

			if(me.isElementNode(node)) {
				me.compile(node);
			} else if(me.isTextNode(node) && reg.test(text)) {
				me.compileText(node, RegExp.$1);
			}

			if(node.childNodes && node.childNodes.length) {
				me.compileElement(node);
			}
		});
	},


	//解析element节点中指令
	compile: function (node) {
		var nodeAttrs = node.attributes;
		var me = this;
		[].slice.call(nodeAttrs).forEach(function (attr) {
			var name = attr.name;
			if(me.isDirective(name)) {
				var exp = attr.value;
				var dir = name.substr(2);
				//事件指令
				if(me.isEventDirective(dir)) {
					compileUtil.eventHandler(node, me.$vm, exp, dir);
				} else {
					//普通指令
					compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
				}

				node.removeAttribute(name);
			}
		});
	},

	//{{}}绑定
	compileText: function (node, exp) {
		compileUtil.text(node, this.$vm, exp);
	},

	//是否为指令
	isDirective: function (attr) {
		return attr.indexOf('v-') === 0;
	},

	//是否为基本事件指令
	isEventDirective: function (dir) {
		return dir.indexOf('on') === 0;
	},

	isElementNode: function (node) {
		return node.nodeType === 1;
	},

	isTextNode: function (node) {
		return node.nodeType === 3;
	}
};


//指令处理集合
var compileUtil = {
	text: function (node, vm, exp) {
		this.bind(node, vm, exp, 'text');
	},

	html: function (node, vm, exp) {
		this.bind(node, vm, exp, 'html');
	},
 	
 	model: function (node, vm, exp) {
 		this.bind(node, vm, exp, 'model');
 		var me = this;
 		var val = this._getVMVal(vm, exp);
 		node.addEventListener('input', function(e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }

            me._setVMVal(vm, exp, newValue);
            val = newValue;
        });
 	},

 	class: function(node, vm, exp) {
        this.bind(node, vm, exp, 'class');
    },

    bind: function(node, vm, exp, dir) {
        var updaterFn = updater[dir + 'Updater'];
        //第一次初始化视图
        updaterFn && updaterFn(node, this._getVMVal(vm, exp));
        //实例化订阅者，此操作会在对应的属性消息订阅器中添加该订阅者
        new Watcher(vm, exp, function(value, oldValue) {
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    eventHandler: function (node, vm, exp, dir) {
    	var eventType = dir.split(':')[1];
    	fn = vm.$options.methods && vm.$options.methods[exp];

        if (eventType && fn) {
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    },

     _getVMVal: function(vm, exp) {
        var val = vm;
        exp = exp.split('.');
        exp.forEach(function(k) {
            val = val[k];
        });
        return val;
    },

    _setVMVal: function(vm, exp, value) {
        var val = vm;
        exp = exp.split('.');
        exp.forEach(function(k, i) {
            // 非最后一个key，更新val的值
            if (i < exp.length - 1) {
                val = val[k];
            } else {
                val[k] = value;
            }
        });
    }
};

var updater = {
    textUpdater: function(node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },

    htmlUpdater: function(node, value) {
        node.innerHTML = typeof value == 'undefined' ? '' : value;
    },

    classUpdater: function(node, value, oldValue) {
        var className = node.className;
        className = className.replace(oldValue, '').replace(/\s$/, '');

        var space = className && String(value) ? ' ' : '';

        node.className = className + space + value;
    },

    modelUpdater: function(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    }
};
