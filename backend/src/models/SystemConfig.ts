import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemConfig extends Document {
  key: string;
  value: mongoose.Schema.Types.Mixed;
  updatedAt: Date;
}

const systemConfigSchema = new Schema<ISystemConfig>({
  key: { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed, required: true },
}, { timestamps: true });

export const SystemConfig = mongoose.model<ISystemConfig>('SystemConfig', systemConfigSchema);
