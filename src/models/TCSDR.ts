import mongoose, { Schema } from "mongoose";

export interface UploadInterface {
  fileName: string;
  poolName: string;
  signedURL: string;
}

export interface PrimerInterface {
  region: string;
  supermajority: number;
  forward: string;
  cdna: string;
  endJoin: boolean;
  endJoinOption?: number;
  endJoinOverlap?: number;
  qc: boolean;
  refGenome?: string;
  refStart?: number;
  refEnd?: number;
  allowIndels: boolean;
  trim: boolean;
  trimGenome?: string;
  trimStart?: number;
  trimEnd?: number;
}

export interface TCSDRInterface {
  jobID?: string;
  resultsFormat: string;
  createdAt: Date;
  uploads?: UploadInterface[];
  dropbox?: string;
  htsf?: string;
  uploaded: boolean;
  email: string;
  errorRate: number;
  platformFormat: number;
  poolName: string;
  primers: PrimerInterface[];
  submit: boolean;
  pending: boolean;
  results?: string;
  processingError: boolean;
}

const PrimerSchema = new Schema<PrimerInterface>(
  {
    region: String,
    supermajority: Number,
    forward: String,
    cdna: String,
    endJoin: Boolean,
    endJoinOption: Number,
    endJoinOverlap: Number,
    qc: Boolean,
    refGenome: String,
    refStart: Number,
    refEnd: Number,
    allowIndels: Boolean,
    trim: Boolean,
    trimGenome: String,
    trimStart: Number,
    trimEnd: Number,
  },
  {
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

const UploadSchema = new Schema<UploadInterface>(
  {
    fileName: String,
    poolName: String,
    signedURL: String,
  },
  {
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

const TCSDRSchema = new Schema<TCSDRInterface>(
  {
    jobID: { type: String, default: "" },
    resultsFormat: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    uploads: { type: [UploadSchema], default: [] },
    uploaded: { type: Boolean, default: false },
    email: String,
    errorRate: Number,
    platformFormat: Number,
    htsf: String,
    poolName: String,
    dropbox: String,
    primers: [PrimerSchema],
    submit: { type: Boolean, default: true },
    pending: { type: Boolean, default: false },
    results: String,
    processingError: { type: Boolean, default: false },
  },
  {
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
  }
);

export default mongoose.models.TCSDR ||
  mongoose.model<TCSDRInterface>("TCSDR", TCSDRSchema);
