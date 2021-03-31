/**
 * Created by Zaccary on 20/03/2017.
 */

module.exports = {
  auth: {
    sharedSecret: process.env.SHARED_SECRET,
    jwtSecret: process.env.JWT_SECRET || 'gO0g$I3qkEWr0X&C92*P/=aiL8NAV-',
    cookieSecret: process.env.COOKIE_SECRET || 'gO0g$I3qkEWr0X&C92*P/=aiL8NAV-',
    cookieTimeout: 1000 * 60 * 60 * 24 * 180,
  },
  stripe: {
    publicKey: process.env.STRIPE_KEY_PUBLIC,
  },
};
