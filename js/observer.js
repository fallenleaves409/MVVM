/**
 * 监听data中属性变化
 * 通知订阅者
 * @param {[type]} data [description]
 */
function Observer(data) {
	this.data = data;
	this.walk(data);
}

Observer.prototype = {
	constructor: Observer,
	walk: function(data) {
		var me = this;
		Object.keys(data).forEach(function(key) {
			me.convert(key, data[key]);
		})
	},
	convert: function(key,val) {
		this.defineReactive(this.data, key, val);
	},
	defineReactive(data, key, val) {
		var dep = new Dep();
		var childObj = observe(val);

		Object.defineProperty(data, key, {
			enumerable: true, // 可枚举
			configurable: false, // 不可再define
			get: function () {
				if(Dep.target) {  //注意此处判断为构造函数的target,类似一个全局的暂存变量
					dep.depend();
				}
				return val;
			},
			set: function (newVal) {
				if(newVal === val) {
					return ;
				}
				console.log('数值变化：' + val + '->' + newVal);
				val = newVal;
				// 新的值为object,添加内部key的监听
				childObj = observe(newVal);
				// 通知订阅者
				dep.notify();
			}
		})
	},
};

//遍历对象的所有key
function observe(value, vm) {
	if(!value || typeof value !== 'object') {
		return ;
	}
	return new Observer(value);
}

var uid = 0;

function Dep() {
	this.id = uid++;
	this.subs = [];
}


Dep.prototype = {
	constructor: Dep,
	addSub: function (sub) {
		this.subs.push(sub);
	},

	depend: function () {
		Dep.target.addDep(this);
	},

	removeSub: function (sub) {
		var index = this.subs.indexOf(sub);
		if(index !== -1) {
			this.subs.splice(index,1);
		}
	},

	notify: function () {
		this.subs.forEach(function (sub) {
			sub.update();
		})
	}
}

Dep.target = null;