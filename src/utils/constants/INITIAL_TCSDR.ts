import { PrimerInterface } from "@/models/TCSDR";

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
};

export const INITIAL_TCSDR = {
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
};

export type tcsdrType = {
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
};
