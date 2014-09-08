App.User = DS.Model.extend({
    username: DS.attr('string'),
    fullName: DS.attr('string'),
    genreWeights: DS.hasMany('GenreWeight', {async: true}),
    playlists: DS.hasMany('Playlist', {async: true})
});

App.Playlist = DS.Model.extend({
    name: DS.attr('string'),
    description: DS.attr('string'),
    tracks: DS.hasMany('Track', {async: true})
});

App.Track = DS.Model.extend({
    title: DS.attr('string'),
    artist: DS.attr('string'),
    thumbnail: DS.attr('string'),
    image: DS.attr('string'),
    duration: DS.attr('number'),
    genres: DS.hasMany('Genre', {async: true})
});

App.Genre = DS.Model.extend({
    name: DS.attr('string'),
    featuredTracks: DS.hasMany('Track', {async: true})
});

App.GenreWeight = DS.Model.extend({
    weight: DS.attr('number'),
    user: DS.belongsTo('User'),
    genre: DS.belongsTo('Genre')
});

App.User.FIXTURES = [
    {
        id: 1,
        username: 'Inv8der',
        fullName: 'Marc Ryan',
        playlists: [1],
        genreWeights: [1, 2]
    }
];

App.Playlist.FIXTURES = [
    {
        id: 1,
        name: 'Randomizer',
        description: '',
        tracks: [1],
        owner: 1
    }
];

App.Track.FIXTURES = [
    {
        id: 1,
        title: 'Cannibal',
        artist: 'Silversun Pickups',
        thumbnail: 'http://mn.ec.cdn.beatsmusic.com/albums/094/804/469/s.jpeg',
        image: 'http://mn.ec.cdn.beatsmusic.com/albums/094/804/469/g.jpeg',
        duration: 224,
        genres: [1]
    },
    {
        id: 2,
        title: 'Magic',
        artist: 'Coldplay',
        thumbnail: 'http://mn.ec.cdn.beatsmusic.com/albums/110/393/437/m.jpeg',
        image: 'http://mn.ec.cdn.beatsmusic.com/albums/110/393/437/g.jpeg',
        duration: 285,
        genres: [2]
    }
];

App.Genre.FIXTURES = [
    {
        id: 1,
        name: 'Rock',
        featuredTracks: [1]
    },
    {
        id: 2,
        name: 'Pop',
        featuredTracks: [2]
    }
];

App.GenreWeight.FIXTURES = [
    {
        id: 1,
        user: 1,
        weight: 50,
        genre: 1
    },
    {
        id: 2,
        user: 1,
        weight: 30,
        genre: 2
    }
];