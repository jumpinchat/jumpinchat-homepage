const keystone = require('keystone');
const log = require('../../utils/logger')({ name: 'views.home' });

module.exports = function ageVerificationSuccess(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;
  locals.section = 'Verification submission success';
  locals.user = req.user;

  view.render('ageVerificationSuccess');
};
