const { List } = require('keystone');
const { Schema } = require('mongoose');

const RoomClose = new List('RoomClose');

RoomClose.schema.add({
  name: String,
  reason: String,
  createdAt: Date,
  expiresAt: Date,
  users: [
    {
      ip: String,
      sessionId: String,
      userId: { type: Schema.Types.ObjectId },
      handle: String,
    },
  ],
});

RoomClose.register();
