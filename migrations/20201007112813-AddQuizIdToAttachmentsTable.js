'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
        'Attachments',
        'quizId',
        {
          type: Sequelize.INTEGER,
          references: {
            model: "Quizzes",
            key: "id"
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Attachments', 'quizId');
  }
};
