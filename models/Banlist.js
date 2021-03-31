const { List } = require('keystone');
const { Schema } = require('mongoose');

const Banlist = new List('Banlist');

Banlist.schema.add({
  ip: String,
  userId: { Type: Schema.Types.ObjectId },
  sessionId: String,
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date,
  reason: String,
  restrictions: {
    broadcast: { type: Boolean, default: true },
    join: { type: Boolean, default: true },
  },
});

Banlist.register();
