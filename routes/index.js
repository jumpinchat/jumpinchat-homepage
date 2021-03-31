const keystone = require('keystone');
const proxy = require('http-proxy-middleware');
const middleware = require('./middleware');
const removeIgnore = require('./removeIgnore');
const generateSitemap = require('./generateSitemap');
const { api } = require('../constants/constants');
const log = require('../utils/logger')({ name: 'middleware' });

const importRoutes = keystone.importer(__dirname);

// Common Middleware
keystone.pre('routes', middleware.cache);
keystone.pre('routes', middleware.checkUserSession);
keystone.pre('routes', middleware.initLocals);
keystone.pre('routes', middleware.initErrorHandlers);

// Handle 404 errors
keystone.set('404', (req, res) => {
  res.notfound();
});

// Handle other errors
keystone.set('500', (err, req, res) => {
  let title;
  let message;
  if (err instanceof Error) {
    message = err.message;
    err = err.stack;
  }
  res.err(err, title, message);
});

// Import Route Controllers
const routes = {
  views: importRoutes('./views'),
  settings: importRoutes('./views/settings'),
  admin: importRoutes('./views/admin'),
  messages: importRoutes('./views/messages'),
  roomSettings: importRoutes('./views/room/settings'),
  sitemod: importRoutes('./views/sitemod'),
};

// Setup Route Bindings
module.exports = function routeIndex(app) {
  // Views
  app.all('/', routes.views.index);
  app.all('/login', routes.views.login);
  app.all('/login/totp', routes.views.mfaVerify);
  app.all('/register', routes.views.register);
  app.all('/directory', routes.views.directory);
  app.all('/:roomName/settings', (req, res) => res.redirect('settings/info'));
  app.all('/:roomName/settings/info', routes.roomSettings.info);
  app.all('/:roomName/settings/emoji', routes.roomSettings.emoji);
  app.all('/settings/account/mfa', routes.views.mfaEnroll);
  app.all('/settings/account/mfa/backup', routes.views.mfaEnrollBackupCodes);
  app.all('/settings/account', routes.settings.account);
  app.delete('/settings/ignore', middleware.checkUserSession, removeIgnore);
  app.all('/settings/:page?', routes.views.settings);
  app.all('/profile/:username?', routes.views.profile);
  app.get('/verify-email/:token', routes.views.verifyEmail);
  app.all('/password-reset/request', routes.views.resetPasswordRequest);
  app.all('/password-reset/reset/:token', routes.views.resetPassword);
  app.all('/help/:page?', routes.views.help);
  app.all('/contact', routes.views.contact);
  app.all('/ageverify', routes.views.ageVerify);
  app.get('/ageverify/success', routes.views.ageVerificationSuccess);
  app.all('/support', routes.views.support);
  app.all('/support/payment', routes.views.payment);
  app.all('/support/payment/success', routes.views.paymentSuccess);
  app.all('/support/payment/failed', routes.views.paymentFailure);
  app.all('/messages', routes.messages.inbox);
  app.all('/messages/:recipient', routes.messages.compose);


  app.all('/admin/communication', middleware.noFollow, middleware.validateUserIsAdmin, routes.admin.communication);
  app.all('/admin/rooms/:room', middleware.noFollow, middleware.validateUserIsAdmin, routes.views.adminRoomDetails);
  app.all('/admin/rooms/:room/:userListId', middleware.noFollow, middleware.validateUserIsAdmin, routes.views.adminRoomUserDetails);
  app.all('/admin/users/:userId', middleware.noFollow, middleware.validateUserIsAdmin, routes.views.adminUserDetails);
  app.all('/admin/reports/messages', middleware.noFollow, middleware.validateUserIsAdmin, routes.admin.messageReportList);
  app.all('/admin/reports/messages/:reportId', middleware.noFollow, middleware.validateUserIsAdmin, routes.admin.messageReportDetails);
  app.all('/admin/reports/:reportId', middleware.noFollow, middleware.validateUserIsAdmin, routes.views.adminReportDetails);
  app.all('/admin/ageverify/:requestId', middleware.noFollow, middleware.validateUserIsAdmin, routes.views.adminAgeVerificationDetails);
  app.all('/admin/banlist', middleware.noFollow, middleware.validateUserIsAdmin, routes.views.adminBanList);
  app.all('/admin/banlist/:banId', middleware.noFollow, middleware.validateUserIsAdmin, routes.views.adminBanDetails);
  app.all('/admin/roomclosures', middleware.noFollow, middleware.validateUserIsAdmin, routes.admin.roomCloseList);
  app.all('/admin/roomclosures/:closeId', middleware.noFollow, middleware.validateUserIsAdmin, routes.admin.roomCloseDetail);
  app.all('/admin/sitemods', middleware.noFollow, middleware.validateUserIsAdmin, routes.admin.siteMods);
  app.all('/admin/sitemods/activity', middleware.noFollow, middleware.validateUserIsAdmin, routes.admin.modActivity);
  app.all('/admin/:page?', middleware.noFollow, middleware.validateUserIsAdmin, routes.views.admin);

  app.all('/sitemod', middleware.noFollow, middleware.validateUserIsSiteMod,
    (req, res) => res.redirect('/sitemod/conduct'));
  app.all('/sitemod/conduct', middleware.noFollow, middleware.validateUserIsSiteMod, routes.sitemod.conduct);
  app.all('/sitemod/reports', middleware.noFollow, middleware.validateUserIsSiteMod, routes.sitemod.reportList);
  app.all('/sitemod/reports/:reportId', middleware.noFollow, middleware.validateUserIsSiteMod, routes.sitemod.reportDetails);

  app.get('/logout', (req, res) => {
    res.clearCookie('jic.ident');
    res.clearCookie('jic.activity');
    res.locals.user = null;
    res.redirect('/');
  });

  app.get('/terms', routes.views.terms);
  app.get('/privacy', routes.views.privacy);
  app.post('/session/register', (req, res) => {
    req.session.fingerprint = req.body.fp;
    return res.status(200).send();
  });

  if (process.env.NODE_ENV !== 'production') {
    app.all(/^\/api.*/, proxy({
      target: api,
      changeOrigin: true,
      cookieDomainRewrite: 'http://localhost:3232',
    }));
  }

  app.get('/sitemap.xml', generateSitemap);

  app.get('/404', (req, res) => res.status(404).render('errors/error', {
    code: 404,
    message: 'page could not be found, sorry',
  }));

  app.get('/500', (req, res) => res.status(500).render('errors/error', {
    code: 500,
    message: 'The site has experienced an error, the admin will be shouted at shortly.',
  }));

  app.get('/502', (req, res) => res.status(502).render('errors/error', {
    code: 502,
    message: 'Looks like that part of the site was down, the admin will be shouted at shortly.',
  }));
};
