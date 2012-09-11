
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
