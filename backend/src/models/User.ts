import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type UserRole = 'user' | 'admin';

export interface UserAttributes {
  id: number;
  email: string;
  password_hash: string;
  role: UserRole;
  name: string | null;
  avatar_path: string | null;
  email_verified: boolean;
  verification_token: string | null;
  verification_token_expires: Date | null;
  password_reset_token: string | null;
  password_reset_expires: Date | null;
  last_email_sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    | 'id'
    | 'role'
    | 'name'
    | 'avatar_path'
    | 'email_verified'
    | 'verification_token'
    | 'verification_token_expires'
    | 'password_reset_token'
    | 'password_reset_expires'
    | 'last_email_sent_at'
    | 'created_at'
    | 'updated_at'
  > {}

export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  declare id: number;
  declare email: string;
  declare password_hash: string;
  declare role: UserRole;
  declare name: string | null;
  declare avatar_path: string | null;
  declare email_verified: boolean;
  declare verification_token: string | null;
  declare verification_token_expires: Date | null;
  declare password_reset_token: string | null;
  declare password_reset_expires: Date | null;
  declare last_email_sent_at: Date | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;

  toSafeJSON() {
    return {
      id: this.id,
      email: this.email,
      role: this.role,
      name: this.name,
      has_avatar: !!this.avatar_path,
      email_verified: this.email_verified,
      created_at: this.created_at,
    };
  }
}

User.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
      allowNull: false,
    },
    name: { type: DataTypes.STRING(100), allowNull: true },
    avatar_path: { type: DataTypes.STRING(500), allowNull: true },
    email_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    verification_token: { type: DataTypes.STRING(64), allowNull: true },
    verification_token_expires: { type: DataTypes.DATE, allowNull: true },
    password_reset_token: { type: DataTypes.STRING(64), allowNull: true },
    password_reset_expires: { type: DataTypes.DATE, allowNull: true },
    last_email_sent_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'users',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);
