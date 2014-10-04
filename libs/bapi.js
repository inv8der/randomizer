var request = require('request');
var Hoek = require('hoek');

var defaults = {
	baseURL: 'https://partner.api.beatsmusic.com/v1/',
	limits: {
		callsPerSec: 15,
		callsPerDay: 15000
	}
}

var internals = {};

// Mechanism to keep track of calls per second and calls per day
(function() {
	var callsPerSec = 0,
		callsPerDay = 0,
		overseer = null;

	var nightlyTimer = function() {
		callsPerDay = 0;
		now = Date.now();
		tomorrow = new Date(now+86400000);
		midnight = tomorrow.setHours(0, 0, 0, 0);
		setTimeout(function() { nightlyTimer(); }, midnight-now);
	}
	nightlyTimer();

	Object.defineProperty(
		internals, 'callsPerSec', {
			set: function(value) {
				if (value > 0) {
					callsPerSec = value;

					if (!overseer) {
						// Use a timeout of 1500 ms just to be safe. Don't want to push our
						// luck and get a ERR_403_DEVELOPER_OVER_QPS from the Beats API
						overseer = setTimeout(function() {
							callsPerSec = 0;
							clearTimeout(overseer);
							overseer = null;
						}, 3000);
					}
				}
				else if (value == 0) {
					callsPerSec = value;
				}
			},
			get: function() {
				return callsPerSec;
			}
		}
	);

	Object.defineProperty(
		internals, 'callsPerDay', {
			set: function(value) {
				callsPerDay = (value >= 0) ? value : 0;
			},
			get: function() {
				return callsPerDay;
			}
		}
	);
})();


function RequestQueue() {}

RequestQueue.prototype = new Array;

RequestQueue.prototype.push = function(value) {
	Array.prototype.push.call(this, value);
	this.checkQueue();
};

RequestQueue.prototype.checkQueue = function() {
	var _this = this;
	while (this.length > 0) {
		if (internals.callsPerSec >= defaults.limits.callsPerSec) {
			//console.log('Warning: exceeding 15 calls per second... throttling request rate')
			setTimeout(function() { _this.checkQueue() }, 500);
			break;
		}

		if (internals.callsPerDay >= defaults.limits.callsPerDay) {
			console.log('Daily request limit reached!')
			this.splice(0, this.length);
			break;
		}

		var req = this.shift()
		var callback = req.callback;
		delete req.callback;

		console.log('Making request to ' + req.url);
		request(req, callback);
		internals.callsPerSec++;
		internals.callsPerDay++;
	}
};

var requestQueue = new RequestQueue();


/************* Playlists Endpoint *************/
var Playlists = { 
	Tracks: {} 
};
Playlists.user = function(params, callback) {
	params = Hoek.applyToDefaults({}, params);
	params = parseParameters(params);

	var user_id = params.user_id;
	delete params.user_id;
	
	var req = {
		method: 'GET',
		url: defaults.baseURL+'api/users/'+user_id+'/playlists',
		qs: params,
		callback: callback
	};
	requestQueue.push(req);
};
Playlists.create = function(params, callback) {
	params = parseParameters(params);

	var req = {
		method: 'POST',
		url: defaults.baseURL+'api/playlists/',
		qs: params,
		callback: callback
	};	
	requestQueue.push(req);
};
Playlists.Tracks.update = function(params, callback) {
	params = Hoek.applyToDefaults({}, params);
	params = parseParameters(params);

	var playlist_id = params.playlist_id;
	delete params.playlist_id;

	var req = {
		method: 'PUT',
		url: defaults.baseURL+'api/playlists/'+playlist_id+'/tracks',
		qs: params,
		callback: callback
	};
	requestQueue.push(req);
};
Playlists.Tracks.append = function(params, callback) {
	params = Hoek.applyToDefaults({}, params);
	params = parseParameters(params);
	
	var playlist_id = params.playlist_id;
	delete params.playlist_id;

	var req = {
		method: 'POST',
		url: defaults.baseURL+'api/playlists/'+playlist_id+'/tracks',
		qs: params,
		callback: callback
	};
	requestQueue.push(req);
};


/************* Genre Endpoint *************/
var Genre = {}
Genre.collection = function(params, callback) {
	params = Hoek.applyToDefaults({}, params);
	params = parseParameters(params);

	var req = {
		method: 'GET',
		url: defaults.baseURL+'api/genres',
		qs: params,
		callback: callback
	};
	requestQueue.push(req);
};
Genre.featured = function(params, callback) {
	params = Hoek.applyToDefaults({}, params);
	params = parseParameters(params);

	var genre_id = params.genre_id;
	delete params.genre_id;

	var req = {
		method: 'GET',
		url: defaults.baseURL+'api/genres/'+genre_id+'/featured',
		qs: params,
		callback: callback
	};
	requestQueue.push(req);
};


/************* Tracks Endpoint *************/
var Tracks = {}
Tracks.lookup = function(params, callback) {
	params = Hoek.applyToDefaults({}, params);
	params = parseParameters(params);
	
	var track_id = params.track_id;
	delete params.track_id;

	var req = {
		method: 'GET',
		url: defaults.baseURL+'api/tracks/'+track_id,
		qs: params,
		callback: callback
	};
	requestQueue.push(req);
}

/************* Images Endpoint *************/
var Images = {
	Tracks: {}
};
Images.Tracks.fetchDefault = function(params, callback) {
	params = Hoek.applyToDefaults({}, params);
	params = parseParameters(params);

	var track_id = params.track_id;
	delete params.track_id;

	var req = {
		method: 'GET',
		url: defaults.baseURL+'api/tracks/'+track_id+'/images/default',
		qs: params,
		followRedirect: false,
		callback: callback
	};
	requestQueue.push(req);
};

/************* Audio Endpoint *************/
var Audio = {}
Audio.playback = function(params, callback) {
	params = Hoek.applyToDefaults({}, params);
	params = parseParameters(params);
	
	var track_id = params.track_id;
	delete params.track_id;

	var req = {
		method: 'GET',
		url: defaults.baseURL+'api/tracks/'+track_id+'/audio',
		qs: params,
		callback: callback
	};
	requestQueue.push(req);
}


// Keep stateless for now. If we want to override baseURL, I'll need to refactor
var BeatsAPI = {};

// Add endpoints to BeatsAPI
BeatsAPI.Tracks = Tracks;
BeatsAPI.Playlists = Playlists;
BeatsAPI.Genre = Genre;
BeatsAPI.Images = Images;
BeatsAPI.Audio = Audio;

function parseParameters(params) {
	/*
	Perform some type of validation?

	var keys = Object.keys(params);
	keys.forEach(function(key) {
		if (params[key] instanceof Array) {
			params[key] = params[key].reduce(function(previous, currentValue) {
				if (previous) {
					return previous+"&"+key+"="+currentValue;
				}
				return currentValue;
			}, null);
		}
	});
	*/

	return params;
}

BeatsAPI.parseResponse = function parseResponse(response) {
	
	var result = {
		request: response.request,
		statusCode: response.statusCode,
		headers: response.headers,
		errorCode: 0,
		errorMsg: 'No Error',
		apiResponse: {}
	};

	/* *******************************************************************
	 * Valid status codes:
	 * 	   401 Unauthorized -- content-type: text/xml
	 * 	   400 Bad Request -- content-type: text/html
	 * 	   200 OK -- content-type: application/json
	 *     302 Found -- HTTP redirect, see location of header
	 *********************************************************************/

	switch (response.statusCode) {
		case 200:
			try {
				result.apiResponse = JSON.parse(response.body);
			} catch (e) {
				result.errorCode = 2;
				result.errorMsg = e.message;
			}
			break;
		case 302:
			result.apiResponse = {
				data: [],
				info: { location: response.headers.location },
				code: 'Redirect'
			};
			break;
		case 400:
			result.errorCode = 1;
			result.errorMsg = response.body;
			break;
		case 401:
			result.errorCode = 1;
			result.errorMsg = response.body;
			break;
		default:
			console.log('Unrecogized status code: ' + response.statusCode);
			console.log(response);
			break;
	}

	return result;
}


module.exports = BeatsAPI;