import { useState } from "react";

type SharedSubmissionData = {
  htsf: string;
  poolName: string;
  email: string;
  jobID: string;
  resultsFormat: string;
  submit: boolean;
  pending: boolean;
  processingError: boolean;
};

export default function useSharedSubmissionData() {
  const [sharedSubmissionData, setSharedSubmissionData] =
    useState<SharedSubmissionData>({
      htsf: "",
      poolName: "",
      email: "",
      jobID: "",
      resultsFormat: "tar",
      submit: true,
      pending: false,
      processingError: false,
    });

  return { sharedSubmissionData, setSharedSubmissionData };
}
