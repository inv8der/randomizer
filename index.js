var Hapi = require('hapi');
var Wreck = require('wreck');

var port = Number(process.env.PORT || 5000);
var server = new Hapi.Server(port);

var beatsmusic = {
    protocol: 'oauth2',
    auth: 'https://partner.api.beatsmusic.com/v1/oauth2/authorize',
    token: 'https://partner.api.beatsmusic.com/oauth2/token',
    profile: function(credentials, params, get, callback) {

        credentials.provider = 'beatsmusic';
        credentials.token = params.result.access_token;
        credentials.refreshToken = params.result.refresh_token;

        var options = {
            headers: {
                Authorization: 'Bearer ' + credentials.token
            },
            json: true
        };

        Wreck.get('https://partner.api.beatsmusic.com/v1/api/me', options, function(err, response, payload) {
            if (err) throw err;

            credentials.profile = {
                id: payload.result.user_context
            };

            // Need to make another call to lookup user information
            delete options.headers;

            var uri = 'https://partner.api.beatsmusic.com/v1/api/users/' + credentials.profile.id + '?access_token=' + credentials.token;
            Wreck.get(uri, options, function(err, response, payload) {
                if (err) throw err;

                credentials.profile.username = payload.data.username;
                credentials.profile.full_name = payload.data.full_name;

                console.log(credentials);

                return callback();
            });
        });
    }
};

// Register bell with the server
server.pack.register(require('bell'), function(err) {

    // Declare an authentication strategy using the bell scheme
    // with the name of the provider, cookie encryption password,
    // and the OAuth client credentials.
    server.auth.strategy('beatsmusic', 'bell', {
        provider: beatsmusic,
        password: 'cookiemonster',
        clientId: '38q2wmxsng5k7gdbj5vyq8t6',
        clientSecret: 'bjXb8gxAuSUFbeF2wuPWG9dx',
        isSecure: false     // Terrible idea but required if not using HTTPS
    });

    // Use the 'beatsmusic' authentication strategy to protect the
    // endpoint handling the incoming authentication credentials.
    // This endpoints usually looks up the third party account in
    // the database and sets some application state (cookie) with
    // the local application account information.
    server.route({
        method: ['GET', 'POST'], // Must handle both GET and POST
        path: '/login',          // The callback endpoint registered with the provider
        config: {
            auth: 'beatsmusic',
            handler: function(request, reply) {

                // Perform any account lookup or registration, setup local session,
                // and redirect to the application. The third-party credentials are
                // stored in request.auth.credentials. Any query parameters from
                // the initial request are passed back via request.auth.credentials.query.
                return reply.redirect('/success.html');
            }
        }
    });
});

server.route({
    path: '/{path*}',
    method: 'GET',
    handler: {
        directory: {
            path: './public',
            listing: false,
            index: false
        }
    }
});

server.route({
    path: '/',
    method: 'GET',
    handler: function(request, reply) {
        reply.file('./public/index.html');
    }
});

server.start(function() {
    console.log('Hapi server started @ ', server.info.uri);
});