'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('analyses', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      image_hash: { type: Sequelize.STRING(64), allowNull: false },
      image_path: { type: Sequelize.STRING(500), allowNull: false },
      filename: { type: Sequelize.STRING(255), allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      probability_synthetic: { type: Sequelize.FLOAT, allowNull: true },
      verdict: {
        type: Sequelize.ENUM('real', 'synthetic'),
        allowNull: true,
      },
      heatmap_path: { type: Sequelize.STRING(500), allowNull: true },
      model_version: { type: Sequelize.STRING(50), allowNull: true },
      processing_time_ms: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('analyses', ['image_hash']);
    await queryInterface.addIndex('analyses', ['user_id', 'created_at']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('analyses');
  },
};
