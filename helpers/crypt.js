
const crypto = require('crypto');

/*
* Generate a random salt.
 */
exports.generateSalt = () => crypto.randomBytes(16).toString('hex');

/*
 * Encrypt the given password.
 */
exports.encryptPassword = (password, salt) => crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
