'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
        'Users',
        'token',
        {
          type: Sequelize.STRING,
          validate: {notEmpty: {msg: "Token must not be empty."}}
        }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'token');
  }
};
