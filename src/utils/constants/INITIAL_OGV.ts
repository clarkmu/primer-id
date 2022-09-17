export const INITIAL_OGV = {
  files: [],
  uploads: [],
  conversion: {},
  email: "",
  jobID: "",
  resultsFormat: "tar",
  showConversion: false,
  showSubmit: false,
  showConfirm: false,
};

export type ogvType = {
  files: any[];
  uploads: {
    name: string;
    progress: number;
    type: string;
    libName: string;
  }[];
  conversion: { [subject: string]: number };
  email: string;
  jobID: string;
  resultsFormat: "tar" | "zip" | string;
  showConversion: boolean;
  showSubmit: boolean;
  showConfirm: boolean;
};
