/**
 * Created by Zaccary on 20/03/2017.
 */


const _ = require('lodash');
const path = require('path');

const all = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,

  // Root path of server
  root: path.normalize(`${__dirname}/../..`),

  chatcolors: [
    '#cc0000',
    '#3466a5',
    '#5c3466',
    '#8e3901',
    '#ce5d00',
    '#4e9a06',
    '#59a19d',
    '#10a879',
  ],

  cookies: {
    account: 'jic.ident',
  },
  cache: {
    duration: 60 * 1,
    exclude: [
      '/logout',
    ],
  },

  admin: {
    userList: {
      itemsPerPage: 30,
    },
  },
};

module.exports = _.merge(
  all,
  require(`./env/${all.env}.js`) // eslint-disable-line
);
