const keystone = require('keystone');
const request = require('request');
const log = require('../../utils/logger')({ name: 'routes.contact' });
const Joi = require('joi');
const { errors } = require('../../constants/constants');
const { api } = require('../../constants/constants');

module.exports = function contact(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;

  // locals.section is used to set the currently selected
  // item in the header navigation.
  locals.section = 'Contact';
  locals.user = req.user;
  locals.error = null;
  locals.success = null;

  view.on('post', { action: 'send' }, (next) => {
    const schema = Joi.object().keys({
      email: Joi.string().email().required(),
      option: Joi.string().required(),
      name: Joi.string().allow(''),
      message: Joi.string().required(),
      phone6tY4bPYk: Joi.any().valid('').strip(),
    });

    Joi.validate({
      email: req.body.email,
      option: req.body.option,
      name: req.body.name,
      message: req.body.message,
      phone6tY4bPYk: req.body.phone6tY4bPYk,
    }, schema, { abortEarly: false }, (err, validatedForm) => {
      if (err) {
        log.warn({ err: err.name }, 'invalid contact form information');
        locals.error = errors.ERR_VALIDATION;
        return next();
      }


      return request({
        method: 'POST',
        url: `${api}/api/user/contact`,
        body: validatedForm,
        json: true,
      }, (err, response, body) => {
        if (err) {
          log.error({ err }, 'error happened');
          return res.status(500).send();
        }

        if (response.statusCode >= 400) {
          if (body && body.message) {
            locals.error = body.message;
            return next();
          }

          locals.error = 'Failed to send message, sorry!';
          return next();
        }

        locals.success = 'Message sent!';
        return next();
      });
    });
  });

  // Render the view
  view.render('contact');
};
