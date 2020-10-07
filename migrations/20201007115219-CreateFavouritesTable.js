'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
        'Favourites',
        {
          quizId: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            unique: "compositeKey",
            allowNull: false,
            references: {
              model: "Quizzes",
              key: "id"
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          userId: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            unique: "compositeKey",
            allowNull: false,
            references: {
              model: "Users",
              key: "id"
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false
          }
        },
        {
          sync: {force: true}
        }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Favourites');
  }
};
