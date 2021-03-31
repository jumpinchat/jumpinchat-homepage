const keystone = require('keystone');
const querystring = require('querystring');
const jwt = require('jsonwebtoken');
const request = require('request');
const log = require('../../utils/logger')({ name: 'routes.support' });
const config = require('../../config');
const { api, errors, products } = require('../../constants/constants');
const {
  getUserById,
} = require('../../utils/userUtils');

module.exports = function payment(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;

  const productIdMap = Object
    .keys(products)
    .reduce((acc, current) => ({ ...acc, [current]: current }), {});

  let token;
  locals.page = req.params.page;
  locals.section = 'Payment';
  locals.user = req.user;
  locals.key = config.stripe.publicKey;
  locals.productIdMap = productIdMap;
  locals.checkoutSessionId = null;

  view.on('init', async (next) => {
    if (!locals.user) {
      log.warn('no user');
      return res.redirect('/');
    }

    const {
      productId,
      amount,
      beneficiary,
    } = req.query;


    if (!productId || !productIdMap[productId]) {
      locals.error = 'Invalid product';
      return next();
    }

    if (productId === productIdMap.onetime && !amount) {
      locals.error = 'Amount missing';
      return next();
    }

    locals.productId = productId;
    locals.product = products[productId];
    locals.beneficiary = beneficiary;

    if (beneficiary) {
      try {
        locals.beneficiaryUser = await getUserById(beneficiary);
        log.debug({ user: locals.beneficiaryUser }, 'beneficiary user');
      } catch (err) {
        log.fatal({ err }, 'failed to get beneficiary user');
        return res.status(500).send(errors.ERR_SRV);
      }
    }

    if (amount) {
      locals.product.amount = amount;
    }

    token = jwt.sign(String(locals.user._id), config.auth.jwtSecret);

    const query = {
      product: locals.productId,
    };

    if (locals.beneficiary) {
      query.beneficiary = locals.beneficiary;
    }

    let url = `${api}/api/payment/session?${querystring.stringify(query)}`;

    if (locals.productId === productIdMap.onetime) {
      url = `${url}&amount=${products[locals.productId].amount}`;
    }

    request({
      url,
      method: 'post',
      body: {
        product: productId,
        amount,
        beneficiary,
      },
      headers: {
        Authorization: token,
      },
      json: true,
    }, (err, response, body) => {
      if (err) {
        return res.status(500).send();
      }

      if (response.statusCode >= 400) {
        log.warn({ body, status: response.statusCode }, 'failed to create payment');
        if (body && body.message) {
          return res.redirect(`/support/payment/failed?${querystring.stringify({
            reason: body.message,
          })}`);
        }

        log.warn('failed to create payment', { body, code: response.statusCode });
      }

      locals.checkoutSessionId = body;
      return next();
    });
  });

  view.on('post', { action: 'payment' }, () => {
    locals.error = null;

    const query = {
      product: locals.productId,
    };

    if (locals.beneficiary) {
      query.beneficiary = locals.beneficiary;
    }

    let url = `${api}/api/payment/session?${querystring.stringify(query)}`;

    if (locals.productId === productIdMap.onetime) {
      url = `${url}&amount=${products[locals.productId].amount}`;
    }

    request({
      url,
      method: 'post',
      body: req.body,
      headers: {
        Authorization: token,
      },
      json: true,
    }, (err, response, body) => {
      if (err) {
        return res.status(500).send();
      }

      if (response.statusCode >= 400) {
        log.warn({ body, status: response.statusCode }, 'failed to create payment');
        if (body && body.message) {
          return res.redirect(`/support/payment/failed?${querystring.stringify({
            reason: body.message,
          })}`);
        }

        log.warn('failed to create payment', { body, code: response.statusCode });
        return res.redirect(`/support/payment/failed?${querystring.stringify({
          reason: 'Payment failed',
        })}`);
      }


      const productValue = products[locals.productId].amount;
      return res.redirect(`/support/payment/success?productId=${locals.productId}&value=${productValue}`);
    });
  });


  view.render('payment');
};
