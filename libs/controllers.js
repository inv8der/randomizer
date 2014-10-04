module.exports.set = function(app) {
    var routes = [
        {
            method: 'GET',
            path: '/login',
            config: {
                auth: {
                    strategy: 'session',
                    mode: 'try'
                },
                handler: function(request, reply) {
                    if (request.auth.isAuthenticated) {
                        var user = request.auth.credentials;

                        // Note: app.login will retreive the user from the db and also decorate the
                        // user object with the Randomizer playlist id. This property is not currently
                        // stored in the User model.
                        app.login(user, function(err, user) {
                            if (err) throw err;
                            var context = {
                                _id: user._id,
                                username: user.username,
                                full_name: user.full_name,
                                weights: user.weights,
                                playlist: user.playlist
                            };
                            return reply.view('success.html', context);
                        });
                    } else {
                        return reply.redirect('/auth/beatsmusic');
                    }
                }
            }
        },

        {
            method: 'GET',
            path: '/logout',
            config: {
                auth: {
                    mode: 'try',
                    strategy: 'session'
                },
                handler: function(request, reply) {
                    var user;
                    if (request.auth.isAuthenticated) {
                        user = request.auth.credentials;
                        app.logout(user);
                    }

                    request.auth.session.clear();
                    reply('Logged out!');
                }
            }
        },

        // Use the 'beatsmusic' authentication strategy to protect the
        // endpoint handling the incoming authentication credentials.
        // This endpoints usually looks up the third party account in
        // the database and sets some application state (cookie) with
        // the local application account information.
        {
            method: ['GET', 'POST'],  // Must handle both GET and POST
            path: '/auth/beatsmusic', // The callback endpoint registered with the provider
            config : {
                auth: {
                    strategy: 'beatsmusic'
                },
                handler: function(request, reply) {
                    // Perform any account lookup or registration, setup local session,
                    // and redirect to the application. The third-party credentials are
                    // stored in request.auth.credentials. Any query parameters from
                    // the initial request are passed back via request.auth.credentials.query.
                    var credentials = request.auth.credentials;

                    var user = credentials.profile;
                    user.access_token = credentials.token;
                    user.refresh_token = credentials.refreshToken;

                    request.auth.session.set(user);
                    return reply.redirect('/login');
                }
            }
        },       

        {
            method: 'GET',
            path: '/users/{id}',
            config: {
                handler: function(request, reply) { 
                    if (request.params.id === '0') {
                        
                        var data = { 
                            'user': { 
                                '_id': 0,
                                'username': 'guest',
                                'full_name': 'guest',
                                'weights': [] 
                            }
                        };
                        var json = JSON.stringify(data || {});
                        return reply(json);
                    }

                    app.getUser(request.params.id, function(err, user) {
                        if (err) throw err;

                        var data = { 'user': user };
                        var json = JSON.stringify(data || {});
                        return reply(json)
                    });
                }
            }
        },

        {
            method: 'GET',
            path: '/genres',
            config: {
                handler: function(request, reply) {
                    app.getGenres(function(err, genres) {
                        if (err) throw err;

                        var data = { 'genres': genres };
                        var json = JSON.stringify(data || []);
                        return reply(json)
                    });
                }
            }
        },

        {
            method: 'GET',
            path: '/tracks',
            config: {
                handler: function(request, reply) {
                    var query = request.url.query;

                    if (query.ids) {
                        app.getTracks(query.ids, function(err, tracks) {
                            if (err) throw err;
                            var data = { 'tracks': tracks };
                            var json = JSON.stringify(data || []);
                            return reply(json)
                        });
                    } else {
                        return reply([]);
                    }
                }
            }
        },

        {
            method: 'GET',
            path: '/playlists/{id}',
            config: {
                handler: function(request, reply) { 
                    app.getPlaylist(request.params.id, function(err, playlist) {
                        if (err) throw err;

                        var data = { 'playlist': playlist };
                        var json = JSON.stringify(data || {});
                        return reply(json)
                    });
                }
            }
        },

        {
            method: ['POST', 'PUT'],
            path: '/playlists/{id}',
            config: {
                handler: function(request, reply) {
                    var data = request.payload;    

                    console.log(data.playlist.tracks);
                    //reply({});
            
                    app.updatePlaylist(request.params.id, data.playlist.tracks, function(err, playlist) {
                        if (err) throw err;

                        var data = { 'playlist': playlist };
                        var json = JSON.stringify(data || {});
                        return reply(json)
                    });
                }
            }
        },

        {
            method: 'GET',
            path: '/genreWeights',
            config: {
                handler: function(request, reply) {
                    var query = request.url.query;

                    if (query.ids) {
                        app.getGenreWeights(query.ids, function(err, weights) {
                            if (err) throw err;
                            var data = { 'genreWeights': weights };
                            var json = JSON.stringify(data || []);
                            return reply(json)
                        });
                    } else {
                        return reply([]);
                    }
                }
            }
        },


        {
            method: ['POST', 'PUT'],
            path: '/genreWeights/{id}',
            config: {
                handler: function(request, reply) {
                    console.log(request.payload);

                    /*
                    app.updateGenreWeight(request.params.id, function(err, weight) {
                        if (err) throw err;
                        var data = { 'genreWeight': weight };
                        var json = JSON.stringify(data || []);
                        return reply(json)
                    });
                    */

                    return reply({});
                }
            }
        },

        {
            method: 'GET',
            path: '/audio/{id}',
            config: {
                auth: 'session',
                handler: function(request, reply) {
                    // The ability to stream requires a user to be signed in, so we need to pass the user id
                    // in addition the track id to retrieve the audio stream
                    app.getAudioStream(request.params.id, request.auth.credentials.id, function(err, stream) {
                        if (err) throw err;
                        var json = JSON.stringify(stream || {});
                        return reply(json);
                    });
                }
            }
        }
    ];

    return routes;
};