## Install

First you need to install `node.js`

Then install `bower`
```shell
npm -g install bower
```

Install bower components from `client/`
```shell
bower install
cd bower_components/strophejs-temp && make
```

Add specially licensed fonts to `client/bower_components/uninett-bootstrap-theme-temp/uninett-theme/fonts/`

Install node modules from `server/`
```shell
npm install
```

Copy `server/auth/temp/secret.js` to `server/auth/secret.js` and fill in your UWAP credentials.

Add `server.crt` and `server.key` to `server/auth/` to use `HTTPS`

Run your server from `server/`
```shell
npm start
```

That's it!


## TODO

Logout from UWAP
