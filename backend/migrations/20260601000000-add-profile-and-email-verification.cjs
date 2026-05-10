'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'name', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'avatar_path', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'email_verified', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('users', 'verification_token', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'verification_token_expires', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'password_reset_token', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'password_reset_expires', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addIndex('users', ['verification_token']);
    await queryInterface.addIndex('users', ['password_reset_token']);

    // Існуючим юзерам (тестовим) — позначаємо email як verified, щоб не блокувати їх
    await queryInterface.sequelize.query(
      'UPDATE users SET email_verified = true WHERE email_verified = false'
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('users', ['password_reset_token']);
    await queryInterface.removeIndex('users', ['verification_token']);
    await queryInterface.removeColumn('users', 'password_reset_expires');
    await queryInterface.removeColumn('users', 'password_reset_token');
    await queryInterface.removeColumn('users', 'verification_token_expires');
    await queryInterface.removeColumn('users', 'verification_token');
    await queryInterface.removeColumn('users', 'email_verified');
    await queryInterface.removeColumn('users', 'avatar_path');
    await queryInterface.removeColumn('users', 'name');
  },
};
