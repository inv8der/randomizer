App.JPlayerView = Ember.View.extend({
    tagName: 'div',
    classNames: ['jplayer'],

    didInsertElement: function() {
        // Once the view is rendered, initialize jplayer so we can play de music
        this.$().jPlayer({
            swfPath: 'js/libs',
            supplied: 'rtmpa'
        });

        var controller = this.get('controller');
        controller.on('mediaChanged', this, this.playTrack);
        controller.on('mediaStopped', this, this.stopPlayback);
    },

    willDestroyElement: function() {
        var controller = this.get('controller');
        controller.off('mediaChanged', this, this.playTrack);
        controller.off('mediaStopped', this, this.stopPlayback);
    },

    playTrack: function(track_id) {
        var _this = this;

        this.stopPlayback();
        $.ajax({
            url: '/audio/' + track_id,
            dataType: 'json',
            success: function(data) {
                _this.$().jPlayer('setMedia', {
                    rtmpa: data.location + '/' + data.resource
                });
                _this.$().jPlayer('play');
            }
        });
    },

    stopPlayback: function() {
        this.$().jPlayer('clearMedia');
    }
});

Ember.Handlebars.helper('jplayer', App.JPlayerView);
