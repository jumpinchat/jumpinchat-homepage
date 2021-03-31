// Simulate config options from your production environment by
// customising the .env file in your project's root folder.
require('dotenv').config();

// Require keystone
const keystone = require('keystone');
const config = require('./config');

// Initialise Keystone with your project's configuration.
// See http://keystonejs.com/guide/config for available options
// and documentation.

keystone.init({
  name: 'JumpInChat',
  brand: 'JumpInChat',

  static: 'public',
  'static options': {
    maxAge: 1000 * 60 * 60 * 24,
  },
  favicon: 'public/images/favicon.png',
  views: 'templates/views',
  'view engine': 'pug',

  'auto update': true,
  mongo: process.env.MONGODB_URI || 'mongodb://localhost/tc',
  session: true,
  auth: true,
  'user model': 'User',
  'cookie secret': config.auth.cookieSecret,
  'session store': 'mongo',
});

// Load your project's Models
keystone.import('models');

// Setup common locals for your templates. The following are required for the
// bundled templates and layouts. Any runtime locals (that should be set uniquely
// for each request) should be added to ./routes/middleware.js
keystone.set('locals', {
  _: require('lodash'),
  env: keystone.get('env'),
  location: process.env.DEPLOY_LOCATION,
  utils: keystone.utils,
  editable: keystone.content.editable,
});

// Load your project's Routes
keystone.set('routes', require('./routes'));


// Configure the navigation bar in Keystone's Admin UI
keystone.set('nav', {
  users: 'users',
});

// Start Keystone to connect to your database and initialise the web server


keystone.start();
