import { sequelize } from '../config/database';
import { User } from './User';
import { Analysis } from './Analysis';

// Зв'язки між моделями
User.hasMany(Analysis, { foreignKey: 'user_id', as: 'analyses' });
Analysis.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export { sequelize, User, Analysis };
