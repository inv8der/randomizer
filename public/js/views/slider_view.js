App.SliderView = Ember.View.extend({
    classNames: ['slider'],
    attributeBindings: ['data-id'],

    updateSlider: function(sender, key, val, rev) {
        // The value property will update in repsonse to changes in the underlying model.
        // By adding an observer to this property, we can be notified when it changes and
        // update the slider accordingly
        var sliderValue = this.$().slider('value');
        var value = this.get('value');

        // Make sure the slider is not already updated.
        if (sliderValue !== value) {
            this.$().slider('value', value);
        }
    },

    willInsertElement: function() {
        this.addObserver('value', this, this.updateSlider);
    },

    willDestroyElement: function() {
        this.removeObserver('value', this, this.updateSlider);
    },

    didInsertElement: function() {
        var _this = this;

        // Need to wait until after the view is rendered/inserted into the DOM
        // before we can create the jQuery slider
        this.$().slider({
            min: 0,
            max: 100,
            orientation: 'vertical',
            value: this.get('value'),
            change: function(event, ui) {
                // Notify the controller to update the weight for this genre
                _this.get('controller').send('updateGenreWeight', _this.$().attr('data-id'), ui.value)
            }
        });
    }
});

Ember.Handlebars.helper('slider', App.SliderView);
