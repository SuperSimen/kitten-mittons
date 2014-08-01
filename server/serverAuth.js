var express = require('express');
var passport = require('passport');
var secret = require('./auth/secret');
var request = require('request');
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
var Client = require('node-xmpp-client');
var cookieSession = require('cookie-session');
var fileSystem = require('fs');
var https = require('https');
var http = require('http');
var bodyParser = require('body-parser');
var ltx = require('ltx');

var app = express();

var constants = {
	xmppServer: "meet-test.akademia.no"
};

function xmppError (error) {
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
}

function registerNewXmppUser (user, callback) {
	var client = new Client({
		jid: user.xmpp.jid,
		password: user.xmpp.password,
		register: true
	});
	client.on('online', function() {
		user.xmpp.registered = true;
		writeUserToFile(user);
		client.end();

		if (callback) {
			callback();
		}
	});
	client.on('error', xmppError);
}

var invitorClient;

function startInvitor () {

	var invitor;
	try {
		invitor = JSON.parse(fileSystem.readFileSync("users/invitor.txt", {encoding: 'utf8'}));
		continueStartup();
	}
	catch (e) {
		invitor = {
			id: "invitor",
			xmpp: {
				jid: "invite" + "@" + constants.xmppServer,
				password: randomString(),
			}
		};
		registerNewXmppUser(invitor, continueStartup);
	}
	function continueStartup() {
		invitorClient = new Client({
			jid: invitor.xmpp.jid,
			password: invitor.xmpp.password,
		});
		invitorClient.on('online', function() {
			console.log("invitor online");
		});
		invitorClient.on('error', xmppError);
	}

}

function inviteUninettPerson(person, sender) {
	if (person.o.toLowerCase() !== "uninett") {
		console.log("not uninett user");
		return;
	}
	if (!invitorClient) {
		console.log("something is very wrong");
	}

	var inviteMessage = "Hei. " + sender.mail + " har invitert deg til å besøke http://webrtc.akademia.no";
	var jid = person.userid.substring(0,person.userid.indexOf("@") + 1) + "jabber.uninett.no";
	var stanza = new ltx.Element('message', { to: jid, type: 'chat' }).
		c('body').t(inviteMessage);
	invitorClient.send(stanza);
}

function writeUserToFile(user) {
	fileSystem.writeFile("users/" + user.id + ".txt", JSON.stringify(user), function(err) {
		if (err) {
			console.log(err);
		}
	});
}

var friendList = {
	list: {},
	run: function(friend) {
		if (!friend) {
			return;
		}
		var friendId = friend.userid;
		if (this.list[friendId]) {
			while (this.list[friendId].length) {
				var userId = this.list[friendId].shift();
				var user = userList.get(userId);
				user.addToRoster(friend);
			}
			delete this.list[friendId];
		}
		this.write();
	},
	add: function(friendId, userId) {
		if (!this.list[friendId]) {
			this.list[friendId] = [];
		}
		this.list[friendId].push(userId);
		this.write();
	},
	write: function() {
		fileSystem.writeFile("friendList.txt", JSON.stringify(this.list), function(err) {
			if (err) {
				console.log(err);
			}
		});
	},
	read: function() {
		try {
			this.list = JSON.parse(fileSystem.readFileSync("friendList.txt", {encoding: 'utf8'}));
		}
		catch (e) {}
	}
};

function readUserFromFile(id) {
	return JSON.parse(fileSystem.readFileSync("users/" + id + ".txt", {encoding: 'utf8'}));
}

var userList = {
	list: {},
	getWithUserId: function(userid){
		for (var i in this.list) {
			if (this.list[i].userid === userid) {
				return this.list[i];
			}
		}
	},
	get: function(id) {
		if (!this.list[id]) {
			try {	
				this.list[id] = readUserFromFile(id);
			}
			catch (e) {
				console.error(e);
				console.log("Could not find user");
				return;
			}
		}

		this.list[id].addFriend = function(friend) {
			for (var i in this.tempFriends) {
				if (this.tempFriends[i].userid === friend.userid) {
					return;
				}
			}
			this.tempFriends.push(friend);
			friendList.add(friend.userid, this.id);
			friendList.run(userList.getWithUserId(friend.userid));

			writeUserToFile(userList.list[id]);
		};
		this.list[id].removeFriend = function(friend) {
			for (var i in this.tempFriends) {
				if (this.tempFriends[i].userid === friend.userid) {
					this.tempFriends.splice(i,1);
					return;
				}
			}

			writeUserToFile(userList.list[id]);
		};

		this.list[id].addToRoster = function(friend) {
			for (var i in this.tempFriends) {
				if (this.tempFriends[i].userid === friend.userid) {
					//this.tempFriends.splice(i,1);
				}
			}

			var client = new Client({
				jid: this.xmpp.jid,
				password: this.xmpp.password
			});

			var randomId = randomString();
			client.on('online', function() {
				var stanza = new ltx.Element('iq', { type: 'set', id: randomId }).
					c('query', {xmlns: "jabber:iq:roster"}).
					c('item', {jid: friend.xmpp.jid});
				client.send(stanza);

			});
			client.on('stanza', function(stanza) {
				if (stanza.attrs.id === randomId) {
					var pres = new ltx.Element('presence', {to: friend.xmpp.jid, type: 'subscribe'});
					client.send(pres);
				}
			});
			client.on('error', xmppError);
			
			writeUserToFile(userList.list[id]);
		};

		return this.list[id];
	},
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


				user.tempFriends = [];
				user.roster = [];
				user.xmpp = {};
				user.xmpp.password = randomString();
				user.xmpp.jid = userId + "@" + constants.xmppServer;
				user.nickname = user.userid.substring(0, user.userid.indexOf("@")) + randomString();

				registerNewXmppUser(user);
			}
		}


		var temp = this.get(userId);

		friendList.run(temp);

		return temp;
	},
};

function randomString() {
	return Math.random().toString(36).substring(2);
}



function init() {

	app.use(cookieSession({
		keys: ['secret1', 'secret2']
	}));

	app.use(passport.initialize());
	app.use(passport.session());
	app.use(bodyParser.json());

	startInvitor();


	var options = {
		key: fileSystem.readFileSync('auth/server.key'),
		cert: fileSystem.readFileSync('auth/server.crt')
	};

	https.createServer(options, app).listen(443);
	http.createServer(app).listen(80);

	app.get('/', function(req, res, next){
		if (req.user) {
			next();
		}
		else res.redirect("/auth/uwap/login");
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
	app.post('/api/addFriend', function(req, res) {
		if (req.user) {
			req.user.addFriend(req.body);
			res.send(JSON.stringify(userList.list[req.user.id]));
		}
		else {
			res.status(401).send();
		}
	});
	app.post('/api/removeFriend', function(req, res) {
		if (req.user) {
			req.user.removeFriend(req.body);
			res.send(JSON.stringify(userList.list[req.user.id]));
		}
		else {
			res.status(401).send();
		}
	});
	app.post('/api/inviteUninettPerson', function(req, res) {
		if (req.user) {
			inviteUninettPerson(req.body, req.user);
			res.send(JSON.stringify({type: "ok"}));
		}
		else {
			res.status(401).send();
		}
	});

	passport.use('uwap', new OAuth2Strategy({
		authorizationURL: secret.uwapAuthorizationURL,
		tokenURL: secret.uwapTokenURL,
		clientID: secret.uwapClientID,
		clientSecret: secret.uwapClientSecret
	},
	function(accessToken, refreshToken, profile, done) {
		getUserInfo(accessToken, done);
	}));

	function getUserInfo(token, done) {
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
				done(null, user);
			}
		});
	}

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

	friendList.read();
}

init();
