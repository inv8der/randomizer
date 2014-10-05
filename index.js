var Hapi = require('hapi');
var Path = require('path');
var Wreck = require('wreck');
var Randomizer = require('./libs/randomizer');
var Controllers = require('./libs/controllers')

var port = Number(process.env.PORT || 5000);
var server = new Hapi.Server(port, {
    views: {
        engines: { html: require('handlebars') },
        path: Path.join(__dirname, 'public')
    }
});

var app = new Randomizer({client_id: "38q2wmxsng5k7gdbj5vyq8t6"});
var routes = Controllers.set(app);

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

// Register plugins with the server
server.pack.register(
    [{ plugin: require('bell') },
     { plugin: require('hapi-auth-cookie') }], 

    function(err) {
        server.auth.strategy('session', 'cookie', {
            cookie: 'sid-randomizer',
            password: 'cookiemonster',
            clearInvalid: true,
            isSecure: false
        });

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
    }
);

// Application specific routes
server.route(routes);

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
    config: {
        handler: function(request, reply) {
            reply.file('./public/index.html');
        }
    }
});

// Log incoming requests to see how Ember makes requests for data
/*
server.ext('onRequest', function(request, next) {
    console.log(request.url);
    next();
});
*/

server.start(function() {
    console.log('Hapi server started @ ', server.info.uri);
});