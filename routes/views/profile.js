/**
 * Created by Zaccary on 19/03/2017.
 */

const keystone = require('keystone');
const moment = require('moment');
const marked = require('marked');
const log = require('../../utils/logger')({ name: 'login view' });
const { errors, calMonths } = require('../../constants/constants');
const { ordinal } = require('../../utils/numbers');

marked.setOptions({
  sanitize: true,
});
const User = keystone.list('User');

const formatUserInfo = user => Object.assign({}, user, {
  attrs: Object.assign({}, user.attrs, {
    join_date: new Date(user.attrs.join_date).toISOString(),
    last_active: new Date(user.attrs.last_active).toISOString(),
  }),
  profile: Object.assign({}, user.profile, {
    dob: user.profile && user.profile.dob && user.profile.dob.month
      ? `${calMonths[user.profile.dob.month]} ${ordinal(user.profile.dob.day)}`
      : null,
  }),
});

const formatMarkdownBio = (user) => {
  if (user.profile.bio && user.profile.bio.length) {
    return marked(user.profile.bio);
  }

  return '';
};

module.exports = function profile(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;

  // locals.section is used to set the currently selected
  // item in the header navigation.
  locals.user = req.user;
  locals.username = req.params.username;
  locals.section = locals.username ? `Profile for ${locals.username}` : 'Your profile';
  locals.errors = null;

  view.on('init', (next) => {
    // IF no username AND not logged in THEN
    //   redirect
    if (!locals.username && !locals.user) {
      return res.redirect('/');
    }

    const username = locals.username || locals.user.username;
    return User.model
      .findOne({ username })
      .populate('trophies.trophyId')
      .lean()
      .exec((err, user) => {
        if (err) {
          log.fatal({ err }, 'error fetching user');
          return res.status(500).send();
        }

        if (!user) {
          return res.notfound();
        }

        // re-map the trophy objects contained
        // in the array to fix the nesting produced
        // by populating them via `trophyId`
        locals.trophies = user.trophies
          .sort(t => t.awarded)
          .map(t => Object.assign({
            awarded: t.awarded,
          }, t.trophyId));

        locals.profileUser = formatUserInfo(user);

        locals.profileBio = formatMarkdownBio(locals.profileUser);

        return next();
      });
  });

  view.render('profile');
};
