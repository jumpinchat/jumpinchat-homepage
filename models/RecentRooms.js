const { List } = require('keystone');
const { Schema } = require('mongoose');

const RecentRooms = new List('RecentRooms');

RecentRooms.schema.add({
  user: Schema.Types.ObjectId,
  rooms: [{
    roomId: { type: Schema.Types.ObjectId, ref: 'Room' },
    createdAt: { type: Date, default: Date.now },
  }],
});

RecentRooms.register();
