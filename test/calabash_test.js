/*global QUnit:false, module:false, test:false, asyncTest:false, expect:false*/
/*global start:false, stop:false ok:false, equal:false, notEqual:false, deepEqual:false*/
/*global notDeepEqual:false, strictEqual:false, notStrictEqual:false, raises:false*/
(function(K) {

  /*
    ======== A Handy Little QUnit Reference ========
    http://docs.jquery.com/QUnit

    Test methods:
      expect(numAssertions)
      stop(increment)
      start(decrement)
    Test assertions:
      ok(value, [message])
      equal(actual, expected, [message])
      notEqual(actual, expected, [message])
      deepEqual(actual, expected, [message])
      notDeepEqual(actual, expected, [message])
      strictEqual(actual, expected, [message])
      notStrictEqual(actual, expected, [message])
      raises(block, [expected], [message])
  */

function restart() { 
	ok(false, arguments[0]); start(); 
}

  module('calabash.core#bind', {
    setup: function() {
      return;
    }
  });

  test('binds the object to this', 1, function() {
	var myObj = {};
	function myFunc() {
		strictEqual(this, myObj, 'bound object should be this');
	}
	K.bind(myFunc, myObj)();
  });

  test('can access properties of this', 1, function() {
	var myObj = { "a": 5 };
	function myFunc(b) {
		return this.a + b;
	}
	var result = K.bind(myFunc, myObj)(3);
	strictEqual(result, 8, 'should add properly');
  });

  test('curries additional args correctly', 1, function() {
	function myFunc(a, b) {
		return a + b;
	}
	var result = K.bind(myFunc, {}, 5)(3);
	strictEqual(result, 8, 'should add properly');
  });

  module('calabash.core#enqueue', {
    setup: function() {
      return;
    }
  });

  asyncTest('should enqueue a task asyncly', 1, function() {
	K.enqueue(function() {
		ok(true, 'this should be run');
		start();
	});
	setTimeout(restart, 5000);
  });
 
  module('calabash.core#defer', {
    setup: function() {
      this.deferred = K.defer();
    }
  });

  test('has resolve, reject, promise', 3, function() {
	ok(typeof this.deferred.resolve === 'function', 'resolve should be function');
	ok(typeof this.deferred.reject === 'function', 'reject should be function');
	ok(this.deferred.promise instanceof K.Promise, 'promise should be Promise');
  });

  asyncTest('calls errback on rejection', 1, function() {
	var myReason = 'this is the reason';
	this.deferred.promise
	.then(function() {
		ok(false, 'should not have called callback');
		start();
	}, function(reason) {
		equal(reason, myReason, 'called with provided reason');
		start();
	});
	this.deferred.reject(myReason);
  });

  asyncTest('calls callback on resolution', 1, function() {
	this.deferred.promise
	.then(function(val) {
		equal(13, val, 'called with correct val');
		start();
	}, function(reason) {
		ok(false, 'should not errback');
		start();
	});
	this.deferred.resolve(13);
  });

  asyncTest('never resolves a rejected promise', 1, function() {
	var myReason = 'this is the reason';
	this.deferred.promise
	.then(function() {
		ok(false, 'should not have called callback');
		start();
	}, function(reason) {
		equal(reason, myReason, 'called with provided reason');
		start();
	});
	this.deferred.reject(myReason);
	this.deferred.resolve(10);
  });

  module('calabash.core#resolve', {
    setup: function() {
    }
  });

  test('resolve returns a promise', 2, function() {
	var val = 5;
	var resolvedVal = K.resolve(val);
	ok(resolvedVal instanceof K.Promise, 'resolve should return a promise');
	var twiceResolved = K.resolve(resolvedVal);
	strictEqual(twiceResolved, resolvedVal);
  });

  module('calabash.core#when', {
    setup: function() {
    }
  });

  asyncTest('when always forwards the provided literal', 1, function() {
	K.when(5, function(val) {
		equal(5, val, 'should have forwarded the when value');
		start();
	},restart);
  });

  module('calabash.ajax#get', {
    setup: function() {
    }
  });

  asyncTest('get should return the value', 1, function() {
	K.get('/test/resources/1.json')
	.then(function(response) {
		ok(JSON.parse(response), 'should be parsed');
		start();
	}, restart);
  });

  asyncTest('get should reject on 404', 1, function() {
	K.get('/not/actual/resource/path')
	.then(restart, function(reason) {
		ok(reason, 'should have rejected a get to a non-real resource');
		start();
	});
  });

  asyncTest('timeout should reject if not fulfilled within millis', 1, function() {
	K.get('/test/resources/1.json').timeout(1)
	.then(restart, function(reason) {
		equal('timeout', reason, 'should have timed out');
		start();
	});
  });

  asyncTest('timeout should not reject if fulfilled within millis', 1, function() {
	var d = K.defer();
	setTimeout(function() {
		d.resolve(true);
	}, 200);
	d.promise.timeout(500000)
	.then(function(val) {
		ok(val, 'should have succeeded');
		start();
	}, restart);
  });

}(window.K));
