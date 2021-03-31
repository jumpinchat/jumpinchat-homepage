const url = require('url');
const keystone = require('keystone');
const Joi = require('joi');
const { products, errors } = require('../../constants/constants');
const log = require('../../utils/logger')({ name: 'support' });

module.exports = function support(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;
  const { error } = req.query;

  locals.page = req.params.page;
  locals.section = 'Support the site';
  locals.description = 'Support JumpInChat by becoming a site supporter! Help keep the site running and get exclusive supporter perks!';
  locals.user = req.user;
  locals.products = products;
  locals.error = error || null;

  view.on('post', { action: 'custom' }, async (next) => {
    const schema = Joi.object().keys({
      amount: Joi.number().integer().min(3).max(50),
    });

    try {
      const {
        amount,
      } = await Joi.validate({ amount: req.body.amount }, schema);

      return res.redirect(`/support/payment?productId=onetime&amount=${amount * 100}`);
    } catch (err) {
      locals.error = errors.ERR_VALIDATION;
      return res.redirect(url.format({
        path: './',
        query: {
          error: locals.error,
        },
      }));
    }
  });

  view.render('support');
};
