import { useState } from "react";

export type SharedSubmissionData = {
  htsf: string;
  poolName: string;
  email: string;
  jobID: string;
  resultsFormat: string;
  submit: boolean;
  pending: boolean;
  processingError: boolean;
};

export const defaultSharedSubmissionData: SharedSubmissionData = {
  htsf: "",
  poolName: "",
  email: "",
  jobID: "",
  resultsFormat: "tar",
  submit: true,
  pending: false,
  processingError: false,
};

export default function useSharedSubmissionData() {
  const [sharedSubmissionData, setSharedSubmissionData] =
    useState<SharedSubmissionData>(defaultSharedSubmissionData);

  return { sharedSubmissionData, setSharedSubmissionData };
}
