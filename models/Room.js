/**
 * Created by Zaccary on 19/03/2017.
 */

const { List } = require('keystone');
const { Schema } = require('mongoose');

const Room = new List('Room');

Room.schema.add({
  name: String,
  attrs: {
    janus_id: String,
    owner: { type: Schema.Types.ObjectId, default: null, ref: 'User' },
    active: { type: Boolean, default: true },
    created: { type: Date, default: Date.now },
    last_accessed: { type: Date, default: Date.now },
    creation_ip: String,
    time_since_last_disconnect: Date,
    ageRestricted: { type: Boolean, default: false },
  },
  users: [
    {
      createdAt: { type: Date, default: Date.now },
      user_id: { type: Schema.Types.ObjectId, default: null },
      handle: String,
      ip: String,
      signature: { type: String, default: null },
      session_id: String,
      socket_id: { type: String, default: null },
      color: String,
      operator_id: { type: String, default: null },
      username: { type: String, default: null },
      isBroadcasting: { type: Boolean, default: false },
      isAdmin: { type: Boolean, default: false },
    },
  ],
  banlist: [
    {
      handle: String,
      user_id: { type: Schema.Types.ObjectId, default: null },
      ip: String,
      signature: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
  // room settings
  settings: {
    passhash: { type: String, default: false },
    public: { type: Boolean, default: false },
    modOnlyPlayMedia: { type: Boolean, default: false },
    display: { type: String, default: null },
    description: { type: String, default: null },
    topic: {
      text: { type: String, default: null },
      updatedAt: { type: Date, default: null },
      updatedBy: { type: Schema.Types.ObjectId, default: null },
    },
    forcePtt: { type: Boolean, default: false },
    forceUser: { type: Boolean, default: false },
    requireVerifiedEmail: { type: Boolean, default: false },
    minAccountAge: { type: Number, default: null },
    moderators: [{
      user_id: { type: Schema.Types.ObjectId, default: null, ref: 'User' },
      username: { type: String, default: null },
      session_token: { type: String, default: null },
      timestamp: { type: Date, default: Date.now },
      assignedBy: { type: Schema.Types.ObjectId, default: null, ref: 'User' },
      permissions: {
        ban: { type: Boolean, default: true },
        close_cam: { type: Boolean, default: true },
        mute_user_audio: { type: Boolean, default: true },
        mute_user_chat: { type: Boolean, default: true },
        mute_room_chat: { type: Boolean, default: false },
        mute_room_audio: { type: Boolean, default: false },
        apply_password: { type: Boolean, default: false },
        assign_operator: { type: Boolean, default: false },
      },
    }],
  },
});

Room.register();
