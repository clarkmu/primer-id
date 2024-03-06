import useIntactness from "@/hooks/useIntactness";
import Modal from "../form/Modal";
import Alert from "../form/Alert";
import Button from "../form/Button";
import { useState } from "react";
import { CheckCircleIcon } from "@heroicons/react/solid";

export default function Confirmation({
  onClose,
  open,
  email,
  sequences,
  jobID,
  resultsFormat,
}) {
  const { mutateSubmit } = useIntactness();
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async () => {
    mutateSubmit.mutate({
      body: { sequences, email, jobID, resultsFormat },
      callback: ({ id }) => {
        // setId(id);
        setSubmitted(true);
      },
    });
  };

  const { error, isLoading } = mutateSubmit;

  return (
    <Modal open={open} onClose={onClose}>
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
        <span>
          Results Format:{" "}
          <span className="underline font-bold">{resultsFormat}</span>
        </span>
        <span>{(sequences.match(/>/g) || []).length} Sequences Detected</span>
        <ol className="list-decimal overflow-x-auto whitespace-nowrap max-h-[50vh]">
          {sequences
            .split("\n")
            .filter((s) => s[0] === ">")
            .map((seq) => (
              <li key={seq} className="">
                {seq.replace(">", "")}
              </li>
            ))}
        </ol>
        {!!error && <Alert severity="error" msg={error} />}
        <div className="self-end place-self-end justify-self-end flex justify-end items-end gap-4">
          <Button onClick={onClose} variant="none" color="error">
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
