const keystone = require('keystone');

module.exports = function index(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;

  // locals.section is used to set the currently selected
  // item in the header navigation.
  locals.section = 'Privacy Policy';
  locals.user = req.user;

  // Render the view
  view.render('privacy');
};
