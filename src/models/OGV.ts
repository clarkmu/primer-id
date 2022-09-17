import mongoose, { Schema } from "mongoose";

export type UploadInterface = {
  fileName: String;
  libName: String;
};

export type OGVInterface = {
  jobID?: string;
  resultsFormat: string;
  createdAt: Date;
  uploads?: UploadInterface[];
  email: string;
  submit: boolean;
  pending: boolean;
  processingError: boolean;
};

const UploadSchema = new Schema<UploadInterface>({
  fileName: String,
  libName: String,
});

const OGVSchema = new Schema<OGVInterface>({
  jobID: { type: String, default: "" },
  resultsFormat: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  uploads: { type: [UploadSchema], default: [] },
  conversion: Object,
  email: String,
  submit: { type: Boolean, default: false },
  pending: { type: Boolean, default: false },
  processingError: { type: Boolean, default: false },
});

export default mongoose.models.OGV ||
  mongoose.model<OGVInterface>("OGV", OGVSchema);
