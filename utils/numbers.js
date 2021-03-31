/**
 * Created by Zaccary on 26/03/2017.
 */

/**
 * Get a string with the number ordinal (e.g. 1st, 2nd)
 *
 * @param {Number} number
 * @returns {string}
 */
module.exports.ordinal = (number) => {
  const j = number % 10;
  const k = number % 100;
  if (j === 1 && k !== 11) {
    return `${number}st`;
  }

  if (j === 2 && k !== 12) {
    return `${number}nd`;
  }

  if (j === 3 && k !== 13) {
    return `${number}rd`;
  }

  return `${number}th`;
};
