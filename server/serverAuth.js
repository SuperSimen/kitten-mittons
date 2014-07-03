var express = require('express');
var passport = require('passport');
var secret = require('./auth/secret');
var request = require('request');
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
var Client = require('node-xmpp-client');
var cookieSession = require('cookie-session');
var fileSystem = require('fs');

var app = express();
app.use(cookieSession({
    keys: ['secret1', 'secret2']
}));

app.use(passport.initialize());
app.use(passport.session());
app.listen(3000);


app.get('/', function(req, res, next){
	if (req.user) {
		//testAuthorization(req.user);
		next();
	}
	else res.redirect("/auth");
});
app.use('/', express.static(__dirname + "/../client"));

app.use('/auth', express.static(__dirname + "/auth"));
app.get('/auth/uwap/login', passport.authenticate('uwap'));
app.get('/auth/uwap/callback', passport.authenticate('uwap', { successRedirect: '/', failureRedirect: '/auth/failed.html' }));

app.get('/api/info', function(req, res) {
	if (req.user) {
		res.send(JSON.stringify(userList.list[req.user.id]));
	}
	else {
		res.status(401).send();
	}
});

var constants = {
	xmppServer: "meet-test.akademia.no"
};

var userList = {
	list: {},
	findOrCreate: function(user) {
		var userId = user.a;
		if (!this.list[user.a]) {
		
			try {	
				this.list[userId] = readUserFromFile(userId);
			}
			catch (err) {
				this.list[userId] = user;
				user.id = user.a;
				delete user.a;

				user.xmpp = {};
				user.xmpp.password = generateRandomPassword();
				user.xmpp.jid = userId + "@" + constants.xmppServer;
				registerNewXmppUser(user);

			}
			return this.list[userId];
		}
		else {
			return this.list[userId];
		}
	}
};

passport.use('uwap', new OAuth2Strategy({
	authorizationURL: secret.uwapAuthorizationURL,
	tokenURL: secret.uwapTokenURL,
	clientID: secret.uwapClientID,
	clientSecret: secret.uwapClientSecret,
},
function(accessToken, refreshToken, profile, done) {
	getUserInfo(accessToken, done);
}));

var getUserInfo = function(token, done) {
	var options = {
		url: 'https://core.uwap.org/api/userinfo',
		headers: {
			'Authorization': 'Bearer ' + token
		}
	};
	request(options, function callback(error, response, body) {
		if (error) {
			console.error("Oh no! Token is no good.");
			done(null, null);
		}
		else {
			var user = userList.findOrCreate(JSON.parse(body));
			user.token = token;
			console.log(user);
			done(null, user);
		}
	});
};

passport.serializeUser(function(user, done) {
	done(null, JSON.stringify(user));
});

passport.deserializeUser(function(user, done) {
	var temp = JSON.parse(user);
	if (userList.list[temp.id]) {
		done(null, userList.list[temp.id]);
	}
	else {
		done(null, null);
	}
});


var testAuthorization = function(user) {
	var options = {
		url: 'https://core.uwap.org/api/userinfo',
		headers: {
			'Authorization': 'Bearer ' + user.token
		}
	};

	request(options, function callback(error, response, body) {
		if (error) {
			console.error("Oh no! Token is no good.\nDeleting user");
			delete userList.list[user.id];
		}
	});
};

function generateRandomPassword() {
	return Math.random().toString(36).substring(7);
}

function registerNewXmppUser (user) {
	var client = new Client({
		jid: user.xmpp.jid,
		password: user.xmpp.password,
		register: true
	});
	client.on('online', function() {
		console.log("logged on, logging off");
		user.xmpp.registered = true;
		writeUserToFile(user);
		client.end();
	});
	client.on('error', function(error) {
			console.log(error);	
		if (error == "Error: Registration error") {
			console.log("Registration error");
		}
		else if (error == "XMPP authentication failure") {
			console.log("XMPP authentication failure");
		}
		else {
			console.log(error);	
		}
	});

}

function writeUserToFile(user) {
	fileSystem.writeFile("users/" + user.id + ".txt", JSON.stringify(user), function(err) {
		if (err) {
			console.log(err);
		}
	});
}

function readUserFromFile(id) {
	return JSON.parse(fileSystem.readFileSync("users/" + id + ".txt", {encoding: 'utf8'}));
}

console.log('Initialized. All is well');
