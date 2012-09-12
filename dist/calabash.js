/*! calabash - v0.0.1 - 2012-09-11
* Copyright (c) 2012 sam l'ecuyer; Licensed MIT */

(function(global, undefined) {
	'use strict';
// shortcuts for frequently used functions
var array_slice = Array.prototype.slice,
    freeze = Object.freeze,
K;

function noop(){}
function forward(v) {return v;}

K = function() {};

K.iter = iter;
function iter(next, stop) {
	var iterator = {};
	var val;
	iterator.next = function(callback) {
		when(next(val), callback);
		return this;
	};
	iterator.start = function(value) {
		val = value;
		return this;
	};
	return iterator;
}

K.bind = bind;
function bind(fn, obj) {
	var args = array_slice.apply(arguments, [2]);
	return function() {
		return fn.apply(obj || {}, args.concat(array_slice.apply(arguments)));
	};
}

K.always = always;
function always(promise, handler) {
	return when(promise, handler, handler);
}

K.fail = fail;
function fail(promise, handler) {
	return promise.then(forward, handler);
}

K.apply = apply;
function apply(promise, name, args) {
	return when(promise, function(obj) {
		try {
			return resolve(obj[name].apply(obj, args));
		} catch(e) {
			return rejected(e);
		}
	});
}

K.val = val;
function val(promise, name, value) {
	return when(promise)
	.then(function(obj) {
		if (arguments.length === 3) {
			obj[name] = value;
			return resolve(obj);
		} else {
			return resolve(obj[name]);
		}
	});
}

K.timeout = timeout;
function timeout(promise, millis) {
	var deferred = defer();
	var timeoutId = setTimeout(function() {
		if (timeoutId) { deferred.reject('timeout'); }
	}, millis);
	when(promise, function(value) {
		clearTimeout(timeoutId);
		timeoutId = undefined;
		deferred.resolve(value);
	}, function(reason) {
		clearTimeout(timeoutId);
		timeoutId = undefined;
		deferred.reject(reason);
	});
	return deferred.promise;
}

K.Promise = Promise;
function Promise() {}
['always', 'fail', 'val', 'apply','timeout','all'].forEach(function(name) {
	Promise.prototype[name] = function() {
		return K[name].apply(global,[this].concat(array_slice.call(arguments)));
	};
});
freeze(Promise.prototype);

K.defer = defer;
function defer() {
	var done = false,
	listeners = [],
	deferred = {},
	promise = Object.create(Promise.prototype),
	val;
	var _then = function(callback, errback) {
		var d = defer();
		listeners.push(function(promise) {
			promise.then(callback, errback).then(d.resolve, d.reject);
		});
		return d.promise;
	};
	deferred.then = promise.then = function(callback, errback) {
		return _then(callback, errback);
	};
	deferred.promise = freeze(promise);

	var _resolve = function(value) {
		if (!done) {
			done = true;
			val = resolve(value);
			while (listeners[0]) {
				var listener = listeners.shift();
				listener(val);
			}
		}
		return val;
	};
	deferred.resolve = function(value) {
		return _resolve(value);
	};
	deferred.reject = function(reason) {
		return _resolve(rejected(reason));
	};

	return deferred;
}

K.fcall = fcall;
function fcall(task) {
	var d = defer();
	enqueue(function() {
		try {
			d.resolve(task());
		} catch(e) {
			d.reject(e);
		}
	});
	return d.promise;
}

K.when = when;
function when(value, callback, errback) {
	return resolve(value).then(callback, errback);
}

K.resolve = resolve;
function resolve(value) {
	if (isPromise(value)) {
		return value;
	} else {
		return resolved(value);
	}
}

K.all = all;
function all(arrayOfPromises, callback, errback) {
	return when(arrayOfPromises, function(promises) {
		return _reducePromises(promises, _pushValueToArray);
	}).then(callback, errback);
}

K.spread = spread;
function spread(arrayOfPromises, callback, errback) {
	return all(arrayOfPromises).then(function(promises) {
		callback.call(undefined, promises);
	}, errback);
}

K.map = map;
function map(promisesOrVals, mapFunc) {
	return when(promisesOrVals, function(promiseArray) {
		var results = promiseArray.map(function(promise) {
			return when(promise, mapFunc);
		});
		return _reducePromises(results, _pushValueToArray);
	});
}

K.some = some;
function some(arrayOfPromises, atLeast, callback, errback) {
	var allowedFailures = arrayOfPromises.length - atLeast;
	return when(arrayOfPromises, function(promises) {
		var d = defer();
		var results = [];
		enqueue(function() {
			promises.forEach(function(promise) {
				when(promise, function(val) {
					results.push(val);
					if (results.length >= atLeast) {
						d.resolve(results);
					}
				}, function() {
					if (--allowedFailures <= 0) {
						d.reject('too many failures');
					} 
				});
			});
		});
		return when(d.promise, callback, errback);
	}, errback);
}

function _reducePromises(arrayOfPromises, callback) {
	return arrayOfPromises.reduce(function (arrayOfValues, currentPromise, i) {
		return when(arrayOfValues, function (resolvedSoFar) {
			return when(currentPromise, function (value) {
				return callback(resolvedSoFar, i, value);
			});
		});
	}, []);
}

function _pushValueToArray(resolvedSoFar, i, value) {
	resolvedSoFar[i] = value;
	return resolvedSoFar;
}

function resolved(value) {
	var res = new Promise();
	res.then = function(callback) {
		try {
			if (callback && typeof callback === typeof []) {
				return callback.reduce(function(previous, current) {
					return previous.then(current);
				}, resolve(value));
			}
			return resolve(callback? callback(value): value);
		} catch(e) {
			return rejected(e);
		}
	};
	return freeze(res);
}

function rejected(reason) {
	var res = new Promise();
	res.then = function(callback, errback) {
		try {
			return errback? resolve(errback(reason)): rejected(reason);
		} catch(e) {
			return rejected(e);
		}
	};
	return freeze(res);
}

var taskQueue = [];
var notifier = new global.MessageChannel();
notifier.port1.onmessage = function() {
	var task = taskQueue.shift();
	task();
};

K.enqueue = enqueue;
function enqueue(task) {
	taskQueue.push(task);
	notifier.port2.postMessage(undefined);
}

K.isPromise = isPromise;
function isPromise(value) {
	return value && value instanceof Promise;
}



K.ajax = ajax;
function ajax(url, options) {
	var d = defer();
	enqueue(function() {
		try {
			var req = new XMLHttpRequest();
			req.open(options.method || 'GET', url, true);
			req.onload = function() {
				d.resolve(this);
			};
			req.onerror = 
			req.onabort = 
			req.ontimeout = function(err) {
				d.reject(err);
			};
			req.send();
		} catch(e) {
			d.reject(e);
		}
	});
	return d.promise;
}

K.get = get;
function get(url) {
	return ajax(url, {method: 'GET'})
	.then(function(response) {
		if (response.status >= 400) {
			throw response.status;
		}
		return response.response;
	});
}

	global.K = K;
	global.Calabash = K;
}(window));