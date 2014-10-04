// Builds upon mongoose to provide models for my Ranomizer app

var BeatsAPI = require('./bapi');
var Step = require('step');
var mongoose = require('mongoose');

var internals = {};

var UserSchema = mongoose.Schema({
    _id: String,
    username: String,
    full_name: String,
    weights: [{ type: String, ref: 'GenreWeight'}]
});

var GenreSchema = mongoose.Schema({
    _id: String,
    name: String,
    thumbnail: { type: String, default: '' },
    tracks: [{ type: String, ref: 'Track'}]
});

var GenreWeightSchema = mongoose.Schema({
    value: { type: Number, default: 50 },
    genre: { type: String, ref: 'Genre' },
    user: { type: String, ref: 'User'}
});

var PlaylistSchema = mongoose.Schema({
    _id: String,
    name: String,
    tracks: [{ type: String, ref: 'Track'}],
    owner: [{ type: String, ref: 'User'}]
});

var TrackSchema = mongoose.Schema({
    _id: String,
    title: String,
    artist: String,
    duration: Number,
    thumbnail: { type: String, default: '' },
    image: { type: String, default: '' }
});

var User = mongoose.model('User', UserSchema);
var Playlist = mongoose.model('Playlist', PlaylistSchema);
var Track = mongoose.model('Track', TrackSchema);
var Genre = mongoose.model('Genre', GenreSchema);
var GenreWeight = mongoose.model('GenreWeight', GenreWeightSchema);

Playlist.lookup = function(query, accessToken, callback) {
    Step(
        function getPlaylistCollection() {
            BeatsAPI.Playlists.user({
                'user_id': query.owner,
                'access_token': accessToken
            }, this);
        },
        function findPlaylist(err, response) {
            if (err) {
                callback(err, null);
                return undefined;
            }

            var result = BeatsAPI.parseResponse(response),
                data = result.apiResponse.data;

            if (result.errorCode != 0) {
                // TODO: Flll out error object
                callback(err, null);
                return undefined;
            }

            for (var i=0; i<data.length; i++) {
                var playlist = data[i];
                if (playlist.name === query.name) {
                    var tracks = [];
                    if (playlist.refs.tracks) {
                        tracks = playlist.refs.tracks.map(function(track) { return track.id; });
                    }

                    Playlist.findByIdAndUpdate(
                        playlist.id, 
                        { 'name': query.name, 'tracks': tracks, 'owner': query.owner }, 
                        { 'upsert': true }, 
                        function(err, playlist) {
                            if (err) return callback(err, null);
                            return callback(null, playlist) 
                        }
                    );

                    return undefined;
                }
            }

            return callback(null, null);
        }
    );
}

Playlist.sync = function(playlist_id, accessToken, callback) {
    Playlist.findById(playlist_id, function(err, playlist) {
        if (err) callback(err, null);
        if (playlist) {
            var playlistObj = playlist.toObject();
            BeatsAPI.Playlists.Tracks.update({
                'playlist_id': playlist_id,
                'track_ids': playlistObj.tracks,
                'access_token': accessToken
            }, function(err, response) {
                console.log(response);
                if (err) return callback(err, null);

                var result = BeatsAPI.parseResponse(response);
                if (result.errorCode !== 0) {
                    // Todo fill out error object
                    return callback(err, null);
                }

                callback(null, playlist);
            });
        }
    });
};

Playlist.createNew = function(record, accessToken, callback) {
    // First, create the new playlist on the BeatsMusic backend. If successful,
    // then we can store it in our database.
    BeatsAPI.Playlists.create({
        name: record.name,
        access_token: accessToken
    }, function(err, response) {
        if (err) return callback(err, null);

        var result = BeatsAPI.parseResponse(response),
            data = result.data;

        if (result.errorCode !== 0) {
            // TODO: Fill out error object
            return callback(err, null);
        }

        record._id = data.id;
        Playlist.create(record, function(err, playlist) {
            if (err) return callback(err, null);
            if (playlist) return callback(null, playlist);

            callback(null, null);
        })
    });
}

Track.lookupById = function(track_id, client_id, callback) {
    var record = {};

    Step(
        function getTrackById() {
            BeatsAPI.Tracks.lookup({
                'track_id': track_id,
                'client_id': client_id
            }, this);
        },
        function getImage(err, response) {
            if (err) return callback(err, null);

            var result = BeatsAPI.parseResponse(response),
                data = result.apiResponse.data;

            if (result.errorCode !== 0) {
                // TODO: Fill out error object
                return callback(err, null);
            }

            record = {
                'title': data.title,
                'artist': data.artist_display_name,
                'duration': data.duration
            };

            BeatsAPI.Images.Tracks.fetchDefault({
                'track_id': track_id,
                'client_id': client_id,
                'size': 'large'
            }, this);
        },
        function getThumbnail(err, response) {
            if (err) {
                callback(err, null);
                return undefined;
            }

            var result = BeatsAPI.parseResponse(response),
                info = result.apiResponse.info;

            if (result.errorCode !== 0) {
                // TODO: Fill out error object
                callback(err, null);
                return undefined
            }

            record.image = info.location;

            BeatsAPI.Images.Tracks.fetchDefault({
                'track_id': track_id,
                'client_id': client_id,
                'size': 'thumb'
            }, this);
        },
        function updateDb(err, response) {
            if (err) {
                callback(err, null);
                return undefined;
            }

            var result = BeatsAPI.parseResponse(response),
                info = result.apiResponse.info;

            if (result.errorCode !== 0) {
                // TODO: Fill out err object
                callback(err, null);
                return undefined
            }

            record.thumbnail = info.location;

            Track.findByIdAndUpdate(
                track_id, record, { 'upsert': true }, 
                function(err, track) {
                    if (err) return callback(err, null);
                    return callback(null, track);
                }
            );
        }
    );
};

Track.findCollection = function(track_ids, client_id, callback) {
    var tracks = [];

    Step(
        function findTracks() {
            var group = this.group();

            track_ids.forEach(function(id) {
                Track.findById(id, group());
            });
        },
        function lookupMissing(err, results) {
            if (err) {
                callback(err, null);
                return undefined;
            }

            results.forEach(function(track) {
                if (track) {
                    tracks.push(track);
                    var i = track_ids.indexOf(track.id);
                    if (i !== -1) {
                        track_ids.splice(i, 1);
                    }
                }
            });

            var group = this.group();
            track_ids.forEach(function(id) {
                Track.lookupById(id, client_id, group());
            });
        },
        function updateDb(err, results) {
            if (err) {
                callback(err, null);
                return undefined;
            }

            results.forEach(function(track) {
                if (track) {
                    tracks.push(track);
                    var i = track_ids.indexOf(track.id);
                    if (i !== -1) {
                        track_ids.splice(i, 1);
                    }
                }
            });

            callback(null, tracks);
        }
    );
};

GenreWeight.findCollection = function(weight_ids, callback) {
    Step(
        function findGenreWeights() {
            var group = this.group();

            weight_ids.forEach(function(id) {
                GenreWeight.findById(id, group());
            });
        },
        function returnResults(err, weights) {
            if (err) {
                callback(err, null);
                return undefined;
            }

            callback(null, weights);
        }
    );
}

internals.connect = function(options) {
    var url = options.url,
        success = options.success,
        error = options.error;

    mongoose.connect(url || process.env.MONGOHQ_URL);

    var db = mongoose.connection;

    if (typeof error === 'function') db.once('error', error);
    if (typeof success === 'function') db.once('open', success);
}

internals.updateDatabase = function(client_id, callback) {
    Step(
        function getGenres() {
            BeatsAPI.Genre.collection({
                client_id: client_id
            }, this);
        },
        function getFeaturedTracks(err, response) {
            if (err) return callback(err);

            var result = BeatsAPI.parseResponse(response),
                data = result.apiResponse.data,
                group = this.group();

            if (result.errorCode != 0) {
                // TODO: Fill out err object
                return callback(err);
            }

            data.forEach(function(genre) {
                var genreName = genre.name,
                    record = {};

                if (genreName.indexOf('Beats') === 0) {
                    genreName = genreName.slice(5).trim();
                }
                record.name = genreName;
                record.tracks = [];

                Genre.findByIdAndUpdate(
                    genre.id, record, { 'upsert': true }, 
                    function(err) { if (err) return callback(err); }
                );

                BeatsAPI.Genre.featured({
                    genre_id: genre.id,
                    limit: 200,
                    client_id: client_id
                }, group());
            });
        },
        function updateDb(err, results) {
            if (err) callback(err, null);

            var regex = /\/v1\/api\/genres\/([^\/]*)\/featured/;
            results.forEach(function(response) {
                var result = BeatsAPI.parseResponse(response),
                    data = result.apiResponse.data,
                    match = regex.exec(result.request.url.pathname),
                    genre_id = (match) ? match[1] : 0;

                if (result.errorCode !== 0) {
                    // TODO: Fill out err object
                    return callback(err, null);
                }

                if (genre_id === 0) {
                    return callback(err, null);
                }

                data.forEach(function(item) {
                    var tracks = item.refs.tracks.map(function(track) { return track.id; });
                    Genre.findByIdAndUpdate(
                        genre_id, { 'tracks': tracks }, 
                        function(err) { if (err) return callback(err); }
                    );
                });
            });
        }
    );
};

module.exports = {
    User: User,
    Playlist: Playlist,
    Track: Track,
    Genre: Genre,
    GenreWeight: GenreWeight,
    updateDatabase: function(client_id, callback) {
        return internals.updateDatabase(client_id, callback);
    },
    connect: function(options) {
        return internals.connect(options);
    }
}


