window.App = Ember.Application.create();

App.ApplicationAdapter = DS.FixtureAdapter.extend();

App.Router.map(function() {
    this.route('randomizer', {path: '/'});
});

App.RandomizerRoute = Ember.Route.extend({
    model: function() {
        return Ember.RSVP.hash({
            user: this.store.find('user', 1),
            genres: this.store.find('genre')
        });
    }
});

// TODO: Make sure genre has at least one featured track. Otherwise,
// don't consider it during randomization. Also, don't show it on the
// settings page
App.RandomizerController = Ember.ObjectController.extend({
    actions: {
        updateGenreWeight: function(id, value) {
            var user = this.get('user');
            user.get('genreWeights').then(function(genreWeights) {
                var genreWeight = genreWeights.findBy('id', id);
                genreWeight.set('weight', value);
            });
        },

        randomize: function() {
            var user = this.get('user'),
                genres = this.get('genres'),
                _this = this;

            user.get('genreWeights').then(function(genreWeights) {
                var randomizeArr, winner_id, winner;
                    
                randomizeArr = genreWeights.reduce(function(previousValue, item) {
                    var i;
                    for (i=0; i<item.get('weight'); i++) {
                        previousValue.push(item.get('genre').get('id'));
                    }
                    return previousValue;
                }, []);

                winner_id = randomizeArr[Math.floor(Math.random()*randomizeArr.length)];
                winner = genres.findBy('id', winner_id);

                winner.get('featuredTracks').then(function(featuredTracks) {
                    var i = Math.floor(Math.random()*featuredTracks.get('length')),
                        chosenOne = featuredTracks.toArray()[i];

                    _this.set('nowPlaying', chosenOne);

                    // TODO: Find a way to move this out of the controller
                    $('#randomizer').css('background-image', 'url(' + chosenOne.get('image') + ')');

                    user.get('playlists').then(function(playlists) {
                        var playlist = playlists.findBy('name', 'Randomizer');
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

        like: function() {
            var nowPlaying = this.get('nowPlaying'),
                user = this.get('user'),
                _this = this;

            // TODO: Change user model so that it only contains one playlist, the
            // Randomizer playlist
            user.get('playlists').then(function(playlists) {
                var playlist = playlists.findBy('name', 'Randomizer');
                playlist.get('tracks').then(function(tracks) {
                    if (tracks.contains(nowPlaying)) {
                        tracks.removeObject(nowPlaying);
                        _this.set('isFavorited', false);
                    }
                    else {
                        tracks.pushObject(nowPlaying);
                        _this.set('isFavorited', true);
                    }
                });
            });
        },

        dislike: function() {
            //var nowPlaying = this.get('nowPlaying');
            //console.log(nowPlaying);
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

    playTrack: function(track_id) {

    },

    nowPlaying: undefined,

    isPlaylistVisible: false,
    isSettingsVisible: false
});
