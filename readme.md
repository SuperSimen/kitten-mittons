## Install

Install `node` and `npm`

Install `bower`:
```shell
npm -g install bower
```

Install bower components in `client/` folder
```shell
bower install
cd bower_components/strophejs-temp && make
```

Install node modules in `server/` folder
```shell
npm install
```

Copy `server/auth/temp/secret.js` to `server/auth/secret.js` and fill in your UWAP credentials.

Run your server from `server/` folder
```shell
npm start
```

That's it!
