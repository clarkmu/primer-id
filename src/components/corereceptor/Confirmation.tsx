import useCoreReceptor from "@/hooks/useCoreReceptor";
import Modal from "../form/Modal";
import Alert from "../form/Alert";
import Button from "../form/Button";
import { useState } from "react";
import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { useRouter } from "next/router";
import { fasta } from "bioinformatics-parser";
import { BioinformaticsParserType } from "./Page";

export default function Confirmation({
  onClose,
  open,
  email,
  sequences,
  filename,
  jobID,
  resultsFormat,
}: {
  sequences: BioinformaticsParserType;
  email: string;
  jobID: string;
  resultsFormat: string;
  onClose: () => void;
  open: boolean;
  filename: string;
}) {
  const { reload } = useRouter();
  const [error, setError] = useState("");

  const { mutate, isLoading } = useCoreReceptor();
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

  const onCloseConfirmation = () => {
    if (submitted) {
      reload();
    } else {
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onCloseConfirmation}>
      <div className="flex flex-col gap-4 overflow-y-auto max-h-[80vh] p-4">
        {submitted && (
          <Alert
            severity="success"
            msg="Submitted. Please check your email for confirmation then results."
          />
        )}
        <h1 className="text-xl font-bold">Review Submission</h1>
        <span>
          Email: <span className="underline font-bold">{email}</span>
        </span>
        {jobID && (
          <span>
            Job ID: <span className="underline font-bold">{jobID}</span>
          </span>
        )}
        <span className="">
          File: <span className="underline font-bold">{filename}</span>
        </span>
        <span>
          Results Format:{" "}
          <span className="underline font-bold">{resultsFormat}</span>
        </span>
        <span>{sequences?.result?.length} Sequences Detected</span>
        <ol className="list-decimal overflow-x-auto whitespace-nowrap max-h-[30vh]">
          {(sequences?.result || []).map((seq) => (
            <li key={seq?.description} className="">
              {seq?.description}
            </li>
          ))}
        </ol>
        {!!error && <Alert severity="error" msg={error} />}
        <div className="self-end place-self-end justify-self-end flex justify-end items-end gap-4">
          <Button onClick={onCloseConfirmation} variant="none" color="error">
            {submitted ? "Finish" : "Back"}
          </Button>
          <Button
            onClick={onSubmit}
            iconButton={submitted}
            isLoading={isLoading}
            disabled={isLoading || submitted}
          >
            {submitted ? (
              <CheckCircleIcon className="w-5 h-5 text-green" />
            ) : (
              "Submit"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
