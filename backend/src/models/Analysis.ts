import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type AnalysisStatus = 'pending' | 'completed' | 'failed';
export type Verdict = 'real' | 'synthetic';

export interface AnalysisAttributes {
  id: number;
  user_id: number;
  image_hash: string;
  image_path: string;
  filename: string;
  status: AnalysisStatus;
  probability_synthetic: number | null;
  verdict: Verdict | null;
  heatmap_path: string | null;
  model_version: string | null;
  processing_time_ms: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface AnalysisCreationAttributes
  extends Optional<
    AnalysisAttributes,
    | 'id'
    | 'status'
    | 'probability_synthetic'
    | 'verdict'
    | 'heatmap_path'
    | 'model_version'
    | 'processing_time_ms'
    | 'created_at'
    | 'updated_at'
  > {}

export class Analysis
  extends Model<AnalysisAttributes, AnalysisCreationAttributes>
  implements AnalysisAttributes
{
  declare id: number;
  declare user_id: number;
  declare image_hash: string;
  declare image_path: string;
  declare filename: string;
  declare status: AnalysisStatus;
  declare probability_synthetic: number | null;
  declare verdict: Verdict | null;
  declare heatmap_path: string | null;
  declare model_version: string | null;
  declare processing_time_ms: number | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

Analysis.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    image_hash: { type: DataTypes.STRING(64), allowNull: false },
    image_path: { type: DataTypes.STRING(500), allowNull: false },
    filename: { type: DataTypes.STRING(255), allowNull: false },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    probability_synthetic: { type: DataTypes.FLOAT, allowNull: true },
    verdict: {
      type: DataTypes.ENUM('real', 'synthetic'),
      allowNull: true,
    },
    heatmap_path: { type: DataTypes.STRING(500), allowNull: true },
    model_version: { type: DataTypes.STRING(50), allowNull: true },
    processing_time_ms: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'analyses',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['image_hash'] },
      { fields: ['user_id', 'created_at'] },
    ],
  }
);
