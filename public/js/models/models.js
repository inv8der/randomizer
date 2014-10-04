App.User = DS.Model.extend({
    username: DS.attr('string'),
    full_name: DS.attr('string'),
    weights: DS.hasMany('genreWeight', {async: true}),
    playlist: DS.belongsTo('playlist', {async: true})
});

App.Playlist = DS.Model.extend({
    name: DS.attr('string'),
    tracks: DS.hasMany('track', {async: true})
});

App.Track = DS.Model.extend({
    title: DS.attr('string'),
    artist: DS.attr('string'),
    thumbnail: DS.attr('string'),
    image: DS.attr('string'),
    duration: DS.attr('number')
});

App.Genre = DS.Model.extend({
    name: DS.attr('string'),
    tracks: DS.hasMany('track', {async: true})
});

App.GenreWeight = DS.Model.extend({
    value: DS.attr('number'),
    genre: DS.belongsTo('genre', {async: true})
});
