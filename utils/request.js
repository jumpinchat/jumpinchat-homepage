const request = require('request');

module.exports = function requestPromise(opts) {
  return new Promise((resolve, reject) => request(opts, (err, response, body) => {
    if (err) {
      return reject(err);
    }

    if (response.statusCode >= 400) {
      if (body) {
        return reject(body);
      }

      return reject(new Error());
    }

    return resolve(body);
  }));
};
