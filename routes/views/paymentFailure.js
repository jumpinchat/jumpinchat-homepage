const keystone = require('keystone');

module.exports = function paymentFailure(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;
  locals.user = req.user;
  locals.section = 'Payment failure';

  const { reason } = req.query;

  locals.reason = reason;

  view.render('paymentFailure');
};
