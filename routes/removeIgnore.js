const Joi = require('joi');
const log = require('../utils/logger')({ name: 'removeIgnore' });
const { getUserByUsername } = require('../utils/userUtils');

module.exports = async function removeIgnore(req, res) {
  const schema = Joi.object().keys({
    id: Joi.string(),
    username: Joi.string(),
  });

  Joi.validate({
    username: req.body.username,
    id: req.body.id,
  }, schema, async (err, validated) => {
    if (err) {
      log.warn(err);
      return res.status(400).send();
    }

    try {
      const user = await getUserByUsername(validated.username);
      if (!user) {
        log.error({ username: validated.username }, 'user not found');
        return res.status(404).send();
      }

      user.settings.ignoreList = user.settings.ignoreList
        .filter(i => String(i._id) !== validated.id);

      try {
        await user.save();
        return res.status(204).send();
      } catch (err) {
        log.fatal({ err }, 'error saving user');
        return res.status(500).send();
      }
    } catch (err) {
      log.fatal({ err }, 'error getting user');
      return res.status(500).send();
    }
  });
};
