var Step = require('step');
var Pelican = require('./pelican');
var BeatsAPI = require('./bapi');

var internals = {
    client_id: '',
    users: {}
}

var Randomizer = function(options) {
    internals.client_id = options.client_id;
    this.initialize();
};

Randomizer.prototype = {};

Randomizer.prototype.initialize = function initialize() {
    Pelican.connect({
        success: function() {
            console.log('MongoDB connection successful!');
            Pelican.updateDatabase(internals.client_id, function(err) { if (err) throw err; });
        },
        error: function() {
            console.log('Error: MongoDB connection failed');
        }
    });
};

Randomizer.prototype.login = function(user, callback) {
    internals.users[user.id] = {
        access_token: user.access_token,
        refresh_token: user.refresh_token
    };

    var userRecord = null;

    Step(
        function findUser() {
            Pelican.User.findByIdAndUpdate(
                user.id, 
                { 'username': user.username, 'full_name': user.full_name },
                { 'upsert': true },
                this
            );
        },
        function findGenres(err, record) {
            if (err) {
                callback(err, null);
                return undefined;
            }

            if (record) {
                userRecord = record;
                Pelican.Genre.find({}, this);
            } else {
                // Should this be considered an error? Previous call should have created
                // a user record if it did not already exist.
                callback(null, null);
                return undefined
            }
        },
        function updateUserWeights(err, genres) {
            if (err) {
                callback(err, null);
                return undefined;
            }

            var _this = this;
            Pelican.GenreWeight.find({'user': user.id}, function(err, weights) {
                if (err) {
                    callback(err, null);
                    return undefined;
                }

                var newGenres = genres.filter(function(genre) {
                    for (var i=0; i<weights.length; i++) {
                        if (weights[i].genre === genre.id) {
                            return false;
                        }
                    }
                    return true;
                });

                for (var i=0; i<newGenres.length; i++) {
                    var weight = new Pelican.GenreWeight({'genre': newGenres[i].id, 'user': user.id});
                    weight.save();
                    userRecord.weights.push(weight.id);
                }

                userRecord.save(_this);
            });
        },
        function lookupRandomizerPlaylist(err) {
            if (err) {
                callback(err, null);
                return undefined;
            }

            // Always hit the Beats API for the Randomizer playlist so that we can
            // retreive any updates that were made offline. If no playlist is found,
            // create a new Randomizer playlist
            Pelican.Playlist.lookup(
                { name: 'Randomizer', owner: user.id },
                user.access_token,
                function(err, playlist) {
                    if (err) return callback(err, null);
                    if (playlist) {
                        var userObj = userRecord.toObject();
                        userObj.playlist = playlist.id;
                        return callback(null, userObj);
                    }

                    Pelican.Playlist.createNew(
                        { name: 'Randomizer', owner: user.id },
                        user.access_token,
                        function (err, playlist) {
                            if (err) return callback(err, null);
                            if (playlist) {
                                var userObj = userRecord.toObject();
                                userObj.playlist = playlist.id;
                                return callback(null, userObj);
                            }

                            // TODO: Output error message to log file and
                            // fill out error object
                            callback(err, null);
                        }
                    );
                }
            );
        }
    );
}

Randomizer.prototype.logout = function(user) {
    delete internals.users[user.id];
}

Randomizer.prototype.getPlaylist = function(playlist_id, callback) {
    Pelican.Playlist.findById(
        playlist_id,
        function(err, playlist) {
            if (err) return callback(err, null);
            if (playlist) return callback(null, playlist.toObject());

            callback(null, null);
        }
    );
};

Randomizer.prototype.updatePlaylist = function(playlist_id, tracks, callback) {
    Pelican.Playlist.findByIdAndUpdate(
        playlist_id,
        { 'tracks': tracks },
        function(err, playlist) {
            if (err) return callback(err, null);
            if (playlist) {
                var user = internals.users[playlist.owner];
                Pelican.Playlist.sync(playlist_id, user.access_token, function(err, playlist) {
                    if (err) return callback(err, null);
                    if (playlist) return callback(null, playlist.toObject());

                    callback(null, null);
                });
            } else {
                // TODO: Output some error message and possibly return err object
                // through callback function
                callback(null, null);
            }
        }
    );
}

Randomizer.prototype.getGenres = function(callback) {
    Pelican.Genre.find({}, callback);
};

Randomizer.prototype.getTrack = function(track_id, callback) {
    Pelican.Track.findById(track_id, function(err, track) {
        if (err) return callback(err, null);
        if (track) {
            return callback(null, track.toObject());
        }

        // Track doesn't exists in database. Check Beats API.
        Pelican.Track.lookupById(track_id, function(err, track) {
            if (err) return callback(err, null);
            if (track) {
                return callback(null, track.toObject());
            }

            callback(null, null);
        });
    });
};

Randomizer.prototype.getTracks = function(track_ids, callback) {
    Pelican.Track.findCollection(track_ids, internals.client_id, function(err, tracks) {
        if (err) return callback(err, null);
        if (tracks) {
            return callback(null, tracks);
        }

        callback(null, null);
    })
};

Randomizer.prototype.getGenreWeights = function(weight_ids, callback) {
    Pelican.GenreWeight.findCollection(weight_ids, function(err, weights) {
        if (err) return callback(err, null);
        if (weights) {
            return callback(null, weights);
        }

        callback(null, null);
    });
};

Randomizer.prototype.updateGenreWeight = function(weight_id, value, callback) {
    Pelican.GenreWeight.findByIdAndUpdate(weight_id, { 'value': value }, function(err, weight) {
        if (err) return callback(err, null);
        if (weight) {
            return callback(null, weight.toObject());
        }

        callback(null, null);
    });
};

Randomizer.prototype.getUser = function(user_id, callback) {
    Pelican.User.findById(user_id, function(err, user) {
        if (err) return callback(err, null);
        
        if (user) {
            user = user.toObject();
            Pelican.Playlist.findOne(
                { name: 'Randomizer', owner: user_id },
                function(err, playlist) {
                    if (err) return callback(err, null);
                    if (playlist) {
                        user.playlist = playlist.id;
                    }
                    callback(null, user);
                }
            );
        } else {
            callback(null, null);
        }
    });
};

Randomizer.prototype.getAudioStream = function(track_id, user_id, callback) {
    var user = internals.users[user_id];

    // Since we don't store audio streams in the db, it didn't make much since to go
    // through Pelican to retreive this info. I could be persuaded either way though.
    BeatsAPI.Audio.playback({
        track_id: track_id,
        acquire: 1,
        access_token: user.access_token
    }, function(err, response) {
        if (err) return callback(err, null);

        var result = BeatsAPI.parseResponse(response),
            data = result.apiResponse.data;

        if (result.errorCode !== 0) {
            // TODO: Fill out error object
            return callback(err, null);
        }

        callback(null, data);
    });
};

module.exports = Randomizer;