const keystone = require('keystone');
const { Schema } = require('mongoose');

const Trophy = new keystone.List('Trophy');

Trophy.schema.add({
  name: String,
  image: String,
  description: { type: String, default: null },
  title: String,
  type: String,
  conditions: {
    date: {
      day: Number,
      month: Number,
      year: Number,
    },
    duration: {
      years: Number,
    },
  },
});

Trophy.register();
