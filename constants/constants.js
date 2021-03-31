/**
 * Created by Zaccary on 19/03/2017.
 */

module.exports.colours = [
  '#cc0000',
  '#3466a5',
  '#5c3466',
  '#8e3901',
  '#ce5d00',
  '#4e9a06',
  '#59a19d',
  '#10a879',
];

module.exports.api = process.env.NODE_ENV === 'production' ? 'http://haproxy' : 'http://localhost:3232';

const MSG_BAD_USER = 'Invalid username or password. Be sure to use your username, not your email address';

module.exports.errors = {
  ERR_SRV: 'Something went wrong',
  ERR_VALIDATION: 'Invalid details',
  ERR_NO_USER: MSG_BAD_USER,
  ERR_BAD_PASS: MSG_BAD_USER,
  ERR_PASS_INVALID: 'Password incorrect',
  ERR_PASS_NO_MATCH: 'Passwords do not match',
  ERR_USER_EXISTS: 'Username already exists',
};

module.exports.successMessages = {
  MSG_SETTINGS_UPDATED: 'Settings updated',
};

module.exports.jwtSecret = 'secret';
module.exports.cookieTimeout = 1000 * 60 * 60 * 24 * 180;

module.exports.calMonths = {
  1: 'January',
  2: 'February',
  3: 'March',
  4: 'April',
  5: 'May',
  6: 'June',
  7: 'July',
  8: 'August',
  9: 'September',
  10: 'October',
  11: 'November',
  12: 'December',
};

module.exports.banReasons = {
  BAN_BROADCAST_VIOLATION: 'Inappropriate broadcast',
  BAN_NUDITY: 'Nudity',
  BAN_RECORDING: 'Recording broadcasters',
  BAN_ABUSE: 'Abusing or promoting abuse',
  BAN_HARASSMENT: 'Harassing other members',
  BAN_UNDERAGE: 'Under age',
};

module.exports.messageReportReasons = {
  REPORT_NUDITY: 'Nudity',
  REPORT_EXPLICIT: 'Explicit or inappropriate content',
  REPORT_ABUSE: 'Abusing or promoting abuse',
  REPORT_HARASSMENT: 'Harassment',
};

module.exports.closeReasons = {
  BAN_BROADCAST_VIOLATION: 'Inappropriate broadcasts',
  BAN_NUDITY: 'Nudity or encouraging nudity',
  BAN_ABUSE: 'Abusing or promoting abuse',
  BAN_UNDERAGE: 'Under age',
};

module.exports.ageVerifyRejectReasons = {
  REJECT_UNCLEAR_ID: 'Photo of ID document is blurry or unclear',
  REJECT_UNCLEAR_SELFIE: 'Selfie with ID document is blurry or unclear',
  REJECT_OBSCURED_INFORMATION: 'required information is obscured',
  REJECT_INVALID_ID: 'ID document used can not be accepted',
  REJECT_SELFIE_NO_ID: 'ID document is not visible in selfie',
  REJECT_INVALID: 'Uploaded photos show incorrect or missing information',
};

const features = {
  FEATURE_HEART_ICON: 'Heart user icon forever',
  FEATURE_TROPHY: 'Site supporter trophy on profile',
  FEATURE_TROPHY_GOLD: 'Gold Site Supporter trophy on profile',
  FEATURE_RESOLUTION: 'Stream up to 1080p',
  FEATURE_ICON: 'Custom user list icon',
  FEATURE_TIMEOUT: 'Broadcasts don\'t timeout due to inactivity',
  FEATURE_UPCOMING: 'More benefits for site supporters coming soon!',
};

module.exports.products = {
  onetime: {
    title: 'One time payment',
    description: 'One-time, non-recurring payment.',
    features: [
      features.FEATURE_HEART_ICON,
      features.FEATURE_TROPHY,
    ],
    amount: 300,
    frequency: '',
  },
  monthly: {
    title: 'Monthly plan',
    description: 'Pay each month (you can opt-out any time)',
    features: [
      features.FEATURE_HEART_ICON,
      features.FEATURE_TROPHY,
      features.FEATURE_TROPHY_GOLD,
      features.FEATURE_RESOLUTION,
      features.FEATURE_ICON,
      features.FEATURE_TIMEOUT,
    ],
    amount: 500,
    frequency: '/month',
  },
  annual: {
    title: 'Annual plan',
    description: 'Pay once each year, save $10 over the monthly plan!',
    features: [
      features.FEATURE_HEART_ICON,
      features.FEATURE_TROPHY,
      features.FEATURE_TROPHY_GOLD,
      features.FEATURE_RESOLUTION,
      features.FEATURE_ICON,
      features.FEATURE_TIMEOUT,
    ],
    amount: 5000,
    frequency: '/year',
  },
};

module.exports.videoQuality = {
  VIDEO_240: {
    id: 'VIDEO_240',
    label: '240p',
  },
  VIDEO_480: {
    id: 'VIDEO_480',
    label: '480p',
  },
  VIDEO_720: {
    id: 'VIDEO_720',
    label: '720p',
  },
  VIDEO_720_60: {
    id: 'VIDEO_720_60',
    label: '720p 60fps',
  },
  VIDEO_1080: {
    id: 'VIDEO_1080',
    label: '1080p',
  },
  VIDEO_1080_60: {
    id: 'VIDEO_1080_60',
    label: '1080p 60fps',
  },
};

module.exports.reportOutcomes = {
  RESOLUTION_NONE: 'No action taken',
  RESOLUTION_BAN_BROADCAST: 'User banned from broadcasting',
  RESOLUTION_BAN_JOIN: 'User banned from joining rooms',
};
