import { useState } from "react";
import { fasta } from "bioinformatics-parser";
import { BioinformaticsParserType } from "@/hooks/useSequenceFile";
import { SharedSubmissionData } from "../templates/SharedSubmissionData";
import usePost from "@/hooks/queries/usePost";
import ConfirmationModal from "../templates/ConfirmationModal";
import ConfirmationDisplay from "../form/ConfirmationDisplay";

export default function Confirmation({
  onClose,
  open,
  sequences,
  filename,
  state,
}: {
  sequences: BioinformaticsParserType;
  filename: string;
  onClose: () => void;
  open: boolean;
  state: SharedSubmissionData;
}) {
  const [error, setError] = useState("");

  const { email, jobID, resultsFormat } = state;

  const { mutate, isLoading } = usePost("/api/intactness");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async () => {
    setError("");
    mutate({
      body: {
        sequences: fasta.stringify(sequences?.result),
        email,
        jobID,
        resultsFormat,
      },
      callback: (data) => {
        if (data?.error) {
          setError(data?.error || "An error has occurred. Please try again.");
        } else {
          setSubmitted(true);
        }
      },
    });
  };

  return (
    <ConfirmationModal
      open={open}
      onBack={onClose}
      onSubmit={onSubmit}
      isLoading={isLoading}
      submitted={submitted}
      errorMessage={error}
    >
      <div className="flex flex-col gap-4">
        <ConfirmationDisplay label="Email to receive results" value={email} />
        {jobID && <ConfirmationDisplay label="Job ID" value={jobID} />}
        <ConfirmationDisplay label="File" value={filename} />
        <ConfirmationDisplay label="Results Format" value={resultsFormat} />
        <ConfirmationDisplay
          label="Sequences Detected"
          value={`${sequences?.result?.length || 0} Sequences`}
        />
        <ol className="list-decimal overflow-x-auto whitespace-nowrap max-h-[30vh]">
          {(sequences?.result || []).map((seq) => (
            <li key={seq?.description} className="">
              {seq?.description}
            </li>
          ))}
        </ol>
      </div>
    </ConfirmationModal>
  );
}
