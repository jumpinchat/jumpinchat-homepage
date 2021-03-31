/**
 * This file contains the common middleware used by your routes.
 *
 * Extend or replace these functions as your application requires.
 *
 * This structure is not enforced, and just a starting point. If
 * you have more middleware you may want to group it as separate
 * modules in your project's /lib directory.
 */
const multer = require('multer');
const log = require('../utils/logger')({ name: 'middleware' });
const manifest = require('../public/rev-manifest.json');
const { getUserById } = require('../utils/userUtils');
const { getUnreadMessages } = require('../utils/messageUtils');
const config = require('../config');

/**
 Initialises the standard view locals

 The included layout depends on the navLinks array to generate
 the navigation in the header, you may wish to change this array
 or replace it with your own templates / logic.
 */
exports.initLocals = function initLocals(req, res, next) {
  res.locals.path = req.path;
  res.locals.navLinks = [
    { label: 'Home', key: 'home', href: '/' },
  ];
  res.locals.description = 'Create a free group video chat room, with up to 12 people broadcasting at once. No downloads or registration required!';
  res.locals.user = req.user;
  res.locals.unreadMessages = req.unreadMessages;
  res.locals.stripeKey = config.stripe.publicKey;
  res.locals.asset = function asset(path) {
    if (process.env.NODE_ENV === 'production') {
      const revPath = path.replace(/^\//, '');
      if (manifest[revPath]) {
        return `/${manifest[revPath]}`;
      }
    }

    return path;
  };
  return next();
};


/**
 Inits the error handler functions into `res`
 */
exports.initErrorHandlers = function initErrorHandlers(req, res, next) {
  res.err = function error(err, title, message) {
    log.fatal(err);
    return res.status(500).render('errors/500', {
      err,
      errorTitle: title,
      errorMsg: message,
    });
  };

  res.notfound = function notfound(title, message) {
    return res.status(404).render('errors/404', {
      errorTitle: title,
      errorMsg: message,
      user: req.user,
    });
  };

  next();
};


/**
 Prevents people from accessing protected pages when they're not signed in
 */
exports.requireUser = function requireUser(req, res, next) {
  if (!req.user) {
    req.flash('error', 'Please sign in to access this page.');
    res.redirect('/keystone/signin');
  } else {
    next();
  }
};

exports.checkUserSession = async (req, res, next) => {
  let unread;
  const userId = req.signedCookies['jic.ident'];

  if (!userId) {
    return next();
  }

  log.debug('attaching user to session');

  try {
    ({ unread } = await getUnreadMessages(userId));
  } catch (err) {
    log.error({ err }, 'failed to get unread messages');
  }

  try {
    const user = await getUserById(userId, false);
    if (!user) {
      log.warn(`Could not find user with ID ${userId}`);
      res.clearCookie('jic.ident');
      return next();
    }

    user.attrs.last_active = new Date();

    // fix to migrate older users to profiles

    if (!user.profile) {
      req.user = Object.assign({}, user, {
        profile: {
          bio: null,
          dob: { month: null, day: null },
          location: null,
        },
      });
    } else {
      req.user = user;
      req.unreadMessages = unread;
    }

    return user.save((err) => {
      if (err) {
        log.fatal('error saving updated user', err);
        return res.status(500).send();
      }

      return next();
    });
  } catch (err) {
    log.error({ err }, 'Error getting user');
    return res.status(500).end();
  }
};

exports.validateUserIsAdmin = (req, res, next) => {
  if (!req.user) {
    log.warn('no user');
    return res.status(403).redirect('/');
  }

  if (req.user.attrs.userLevel < 30) {
    log.warn('user is not admin');
    return res.status(403).redirect('/');
  }

  log.info('user is admin');

  return next();
};

exports.validateUserIsSiteMod = (req, res, next) => {
  if (!req.user) {
    log.warn('no user');
    return res.status(403).redirect('/');
  }

  if (req.user.attrs.userLevel < 20) {
    log.warn('user is not site mod');
    return res.status(403).redirect('/');
  }

  log.info('user is sitemod');

  return next();
};


exports.noFollow = (req, res, next) => {
  res.set('X-Robots-Tag', 'noindex,nofollow');
  next();
};

exports.cache = (req, res, next) => next();

exports.upload = multer({ storage: multer.memoryStorage() }).any();
