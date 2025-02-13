import mongoose, { Schema } from "mongoose";

export type CoreReceptorInterface = {
  sequences: string;
  email: string;
  createdAt: Date;
  submit?: boolean;
  pending?: boolean;
  complete?: boolean;
  processingError?: boolean;
  jobID?: string;
  resultsFormat: string;
};

const CoreReceptorSchema = new Schema<CoreReceptorInterface>({
  sequences: String,
  email: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  submit: { type: Boolean, default: true },
  pending: { type: Boolean, default: false },
  complete: { type: Boolean, default: false },
  processingError: { type: Boolean, default: false },
  jobID: { type: String, default: "" },
  resultsFormat: String,
});

export default mongoose.models.CoreReceptor ||
  mongoose.model<CoreReceptorInterface>("CoreReceptor", CoreReceptorSchema);
