import { useRouter } from "next/router";
import Modal from "../form/Modal";
import { useState } from "react";
import useSplicing from "@/hooks/queries/useSplicing";
import Alert from "../form/Alert";
import { CheckCircleIcon } from "@heroicons/react/20/solid";
import Button from "../form/Button";
import useUploadSignedURLs from "@/hooks/useUploadSignedURLs";
import { splice } from "@prisma/client";
import spliceConfigValues from "./spliceConfigValues.json";
import ConfirmationDisplay from "../form/ConfirmationDisplay";

const { assays, strains } = spliceConfigValues;

export default function Confirmation({ submission, open, onClose }) {
  const { reload } = useRouter();
  const [error, setError] = useState("");

  const { mutate, isLoading, isError } = useSplicing();
  const [submitted, setSubmitted] = useState(false);

  const { uploadError, UploadProgress, uploadFilesToSignedURL } =
    useUploadSignedURLs(submission.files);

  const onSubmit = async () => {
    setError("");

    const { files, ...body } = submission;

    mutate({
      body,
      callback: async (data: splice & { error?: string }) => {
        if (!data) {
          setError("An error has occurred. Please try again.");
        } else if (data?.error) {
          setError(data?.error || "An error has occurred. Please try again.");
        } else {
          if (data.signedURLs.length) {
            const isSuccess = await uploadFilesToSignedURL(data.signedURLs);
            if (isSuccess) {
              await fetch(`/api/splicing/submit/${data.id}`, {
                method: "DELETE",
              });
              setSubmitted(true);
            } else {
              setError("Failed to upload files. Please refresh and try again.");
            }
          } else {
            setSubmitted(true);
          }
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
      <div className="flex flex-col gap-4 overflow-y-auto max-h-[75vh] p-4">
        <h1 className="text-xl font-bold">HIV-Splicing Submission</h1>
        {uploadError && <Alert severity="error" msg={uploadError} />}
        <ConfirmationDisplay label="Email" value={submission.email} />
        {!!submission.jobID && (
          <ConfirmationDisplay label="Job ID" value={submission.jobID} />
        )}
        <ConfirmationDisplay
          label="Results Format"
          value={submission.resultsFormat}
        />
        <ConfirmationDisplay
          label="Strain Config"
          value={
            strains.find((strain) => strain.value === submission.strain)?.label
          }
        />
        <ConfirmationDisplay
          label="Assay Design"
          value={
            assays.find((assay) => assay.value === submission.assay)?.label
          }
        />
        <ConfirmationDisplay
          label="Splice Distance"
          value={submission.distance}
        />
        {!!submission.sequence && (
          <ConfirmationDisplay
            label="Splice Sequence"
            value={submission.sequence}
          />
        )}
        {!!submission.htsf && (
          <>
            <ConfirmationDisplay
              label="HTSF Location"
              value={submission.htsf}
            />
            <ConfirmationDisplay
              label="Pool Name"
              value={submission.poolName}
            />
          </>
        )}
        {submission.uploads?.length > 0 && <UploadProgress />}
      </div>
      {!!error && <Alert severity="error" msg={error} />}
      {isError && (
        <Alert severity="error" msg="Network Error: Failed to submit." />
      )}
      <div className="self-end place-self-end justify-self-end flex justify-end items-end gap-4 p-4">
        <Button
          data-cy="finishButton"
          onClick={onCloseConfirmation}
          variant="none"
          color="error"
        >
          {submitted ? "Finish" : "Back"}
        </Button>
        <Button
          data-cy="submitButton"
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
    </Modal>
  );
}
