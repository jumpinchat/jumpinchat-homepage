const fs = require('fs');
const keystone = require('keystone');
const request = require('request');
const jwt = require('jsonwebtoken');
const log = require('../../utils/logger')({ name: 'views.ageVerify' });
const config = require('../../config');
const { api } = require('../../constants/constants');

module.exports = function ageVerify(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;
  let token;

  // locals.section is used to set the currently selected
  // item in the header navigation.
  locals.page = req.params.page;
  locals.section = 'Age verification';
  locals.user = req.user;
  locals.error = null;
  locals.success = null;

  view.on('init', (next) => {
    if (!locals.user) {
      return res.redirect('/');
    }

    if (locals.user.attrs.ageVerified) {
      return res.redirect('/');
    }

    token = jwt.sign(String(req.user._id), config.auth.jwtSecret);

    return next();
  });

  view.on('post', { action: 'upload' }, (next) => {
    if (!locals.user.auth.email_is_verified) {
      locals.error = 'Email not verified';
      return next();
    }

    const url = `${api}/api/user/${locals.user._id}/age-verify/upload`;
    const { id, selfie } = req.files;

    if (!id || !selfie) {
      locals.error = 'Please choose files to upload';
      return next();
    }

    const formData = {
      id: {
        value: fs.createReadStream(id.path),
        options: {
          filename: id.name,
          filepath: id.path,
          contentType: id.mimetype,
          knownLength: id.size,
        },
      },

      selfie: {
        value: fs.createReadStream(selfie.path),
        options: {
          filename: selfie.name,
          filepath: selfie.path,
          contentType: selfie.mimetype,
          knownLength: selfie.size,
        },
      },
    };

    log.debug({ formData });

    return request({
      url,
      method: 'post',
      headers: {
        Authorization: token,
      },
      formData,
      json: true,
    }, (err, response, body) => {
      Object.values(formData).forEach(({ options: { filepath } }) => {
        fs.unlink(filepath, (err) => {
          if (err) {
            log.fatal({ err, filepath }, 'failed to remove temp file');
            return;
          }

          log.debug({ filepath }, 'removed temp file');
        });
      });
      if (err) {
        log.error({ err }, 'error uploading files');
        return res.status(500).send();
      }

      if (response.statusCode >= 400) {
        log.warn({ body, status: response.statusCode }, 'failed to upload verification images');
        if (body && body.message) {
          locals.error = body.message;
          return next();
        }

        locals.error = 'Failed to upload';
        return next();
      }

      locals.success = 'Uploaded successfully';
      return res.redirect('/ageverify/success');
    });
  });

  view.render('ageVerify');
};
