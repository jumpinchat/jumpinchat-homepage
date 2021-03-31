const keystone = require('keystone');

const Stats = new keystone.List('Stats');

Stats.schema.add({
  createdAt: { type: Date },
  rooms: [{
    name: String,
    users: Number,
    broadcasters: Number,
  }],
});

Stats.schema.index({ createdAt: 1 });

Stats.register();
