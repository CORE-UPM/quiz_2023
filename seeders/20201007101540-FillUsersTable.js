'use strict';

var crypt = require('../helpers/crypt');


module.exports = {
  up: async (queryInterface, Sequelize) => {

    const salt = crypt.generateSalt();

    await queryInterface.bulkInsert('Users', [
      {
        username: 'admin',
        password: crypt.encryptPassword('1234', salt),
        salt,
        isAdmin: true,
        accountTypeId: 0,
        createdAt: new Date(), updatedAt: new Date()
      },
      {
        username: 'pepe',
        password: crypt.encryptPassword('5678', salt),
        salt,
        accountTypeId: 0,
        createdAt: new Date(), updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Users', null, {});
  }
};
