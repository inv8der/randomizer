window.App = Ember.Application.create();

Ember.Application.initializer({
    name: 'loginHandler',
    initialize: function(container, application) {
        $(window).on('message', function(event) {
            var data = event.originalEvent.data;
            if (data._id) {
                var controller = container.lookup('controller:randomizer');
                controller.send('loginUser', data);
            }
        });
    }
});

App.ApplicationSerializer = DS.RESTSerializer.extend({
    primaryKey: '_id'
});

App.Router.map(function() {
    this.route('randomizer', {path: '/'});
});

App.RandomizerRoute = Ember.Route.extend({
    model: function() {
        return Ember.RSVP.hash({
            user: this.store.find('user', docCookies.getItem('user') || 0),
            genres: this.store.find('genre')
        });
    },
    actions: {
        refreshView: function() {
            this.refresh();
        }
    }
});

// TODO: Make sure genre has at least one featured track. Otherwise,
// don't consider it during randomization. Also, don't show it on the
// settings page
App.RandomizerController = Ember.ObjectController.extend(Ember.Evented, {
    actions: {
        updateGenreWeight: function(id, value) {
            var user = this.get('user');
            user.get('weights').then(function(genreWeights) {
                var genreWeight = genreWeights.findBy('id', id);
                genreWeight.set('value', value);
                genreWeight.save();
            });
        },

        randomize: function() {
            var user = this.get('user'),
                genres = this.get('genres'),
                _this = this;

            user.get('weights').then(function(genreWeights) {
                var randomizeArr, winner_id, winner;
                    
                randomizeArr = genreWeights.reduce(function(previousValue, item) {
                    for (var i=0; i<item.get('value'); i++) {
                        previousValue.push(item.get('genre').get('id'));
                    }
                    return previousValue;
                }, []);

                winner_id = randomizeArr[Math.floor(Math.random()*randomizeArr.length)];
                winner = genres.findBy('id', winner_id);

                winner.get('tracks').then(function(featuredTracks) {
                    var i = Math.floor(Math.random()*featuredTracks.get('length')),
                        chosenOne = featuredTracks.toArray()[i];

                    _this.set('nowPlaying', chosenOne);
                    console.log('Winner: ' + winner_id);
                    _this.trigger('mediaChanged', chosenOne.get('id'));

                    // TODO: Find a way to move this out of the controller
                    $('#randomizer').css('background-image', 'url(' + chosenOne.get('image') + ')');

                    user.get('playlist').then(function(playlist) {
                        playlist.get('tracks').then(function(tracks) {
                            if (tracks.contains(chosenOne)) {
                                _this.set('isFavorited', true);
                            }
                            else {
                                _this.set('isFavorited', false);
                            }
                        });
                    });
                });
            });
        },

        loginUser: function(user) {
            docCookies.setItem('user', user._id);

            this.set('displayLoginPrompt', false);
            this.get('target').send('refreshView');
        },

        like: function() {
            var nowPlaying = this.get('nowPlaying'),
                user = this.get('user'),
                _this = this;

            // TODO: Change user model so that it only contains one playlist, the
            // Randomizer playlist
            user.get('playlist').then(function(playlist) {
                playlist.get('tracks').then(function(tracks) {
                    if (tracks.contains(nowPlaying)) {
                        tracks.removeObject(nowPlaying);
                        _this.set('isFavorited', false);
                    }
                    else {
                        tracks.pushObject(nowPlaying);
                        _this.set('isFavorited', true);
                    }
                    playlist.save();
                });
            });
        },

        dislike: function() {
            //var nowPlaying = this.get('nowPlaying');
            //console.log(nowPlaying);
        },

        manageSession: function() {
            var _this = this,
                isUserAuthenticated = this.get('isUserAuthenticated');

            if (isUserAuthenticated === false) {
                var displayLoginPrompt = this.get('displayLoginPrompt');
                this.set('displayLoginPrompt', !displayLoginPrompt); 
            } else {
                // Logout user
                $.ajax({
                    url: '/logout',
                    success: function() {
                        // TODO: Remove playlist from data store so that future sign ins from the
                        // same user force a refresh from the server.
                        docCookies.removeItem('user');
                        _this.trigger('mediaStopped');
                        _this.get('target').send('refreshView');
                    }
                })
            }
        },

        togglePlaylist: function() {
            var isVisible = this.get('isPlaylistVisible');
            this.set('isPlaylistVisible', !isVisible);
        },

        toggleSettings: function() {
            var isVisible = this.get('isSettingsVisible');
            this.set('isSettingsVisible', !isVisible);
        }
    },

    isUserAuthenticated: function() {
        var user = this.get('user'),
            user_id = user.get('id');

        return (user_id === '0') ? false : true;
    }.property('user.id'),

    nowPlaying: undefined,
    displayLoginPrompt: false,
    isPlaylistVisible: false,
    isSettingsVisible: false
});
