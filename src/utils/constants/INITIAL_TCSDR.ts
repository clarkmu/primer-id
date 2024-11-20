import { PrimerInterface } from "@/models/TCSDR";

export type drVersionType = "v1" | "v2" | "v3";

export enum ParamTypes {
  JSON = "Use Existing Params",
  NEW = "Start Your Run",
}

const INITIAL_TCSDR_PIPELINE = {
  email: "",
  jobID: "",
  resultsFormat: "tar",
  errorRate: 0.02,
  platformFormat: 300,
  htsf: "",
  poolName: "",
  dropbox: "",
  primers: [],
  drVersion: "v1",
};

export const INITIAL_TCSDR = {
  expandedPrimer: 0,
  pipeline: INITIAL_TCSDR_PIPELINE,
  showUploads: false,
  showSubmit: false,
  submitting: false,
  submitted: false,
  submittingError: false,
  uploadProcedure: "",
  files: [],
  uploadedFiles: {},
  isDR: false,
  useSaved: false,
  savedPrimers: [],
  procedure: ParamTypes.NEW,
};

export type tcsdrType = {
  expandedPrimer: 0;
  pipeline: {
    email: string;
    jobID: string;
    resultsFormat: "tar" | "zip";
    errorRate: number;
    platformFormat: number;
    htsf: string;
    poolName: string;
    dropbox: string;
    primers: PrimerInterface[];
    drVersion: drVersionType;
  };
  showUploads: boolean;
  showSubmit: boolean;
  submitting: boolean;
  submitted: boolean;
  submittingError: boolean;
  uploadProcedure: string;
  files: {
    file: any;
    errors: string[];
    poolName?: string;
  }[];
  uploadedFiles: { [filename: string]: number | boolean };
  isDR: boolean;
  useSaved: boolean;
  savedPrimers: PrimerInterface[];
  procedure: ParamTypes;
};
