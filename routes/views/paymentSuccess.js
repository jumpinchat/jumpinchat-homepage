const keystone = require('keystone');

module.exports = function paymentSuccess(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;
  locals.user = req.user;
  locals.section = 'Payment success';

  view.on('init', (next) => {
    const { productId, value } = req.query;
    locals.product = {
      id: productId,
      value,
    };
    return next();
  });

  view.render('paymentSuccess');
};
