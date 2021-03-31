/**
 * Created by Zaccary on 20/03/2017.
 */

module.exports = {
  auth: {
    sharedSecret: process.env.SHARED_SECRET || 'secret',
    jwtSecret: 'jwtsecret',
    cookieSecret: 'gO0g$I3qkEWr0X&C92*P/=aiL8NAV-',
    cookieTimeout: 1000 * 60 * 60 * 24 * 180,
  },
  stripe: {
    publicKey: process.env.STRIPE_KEY_PUBLIC || 'pk_test_InTCYpWGLje7vIpLIv4Ay4eZ',
  },
};
