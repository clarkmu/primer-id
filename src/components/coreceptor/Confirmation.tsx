import { useState } from "react";
import { SharedSubmissionData } from "../templates/SharedSubmissionData";
import ConfirmationModal from "../templates/ConfirmationModal";
import ConfirmationDisplay from "../form/ConfirmationDisplay";
import { useMutation } from "react-query";

export default function Confirmation({
  files,
  onClose,
  open,
  state,
}: {
  files: File[];
  onClose: () => void;
  open: boolean;
  state: SharedSubmissionData;
}) {
  const { email, jobID, resultsFormat } = state;

  const [submitted, setSubmitted] = useState(false);

  const { mutate, isLoading, error } = useMutation(async () => {
    const formData = new FormData();

    formData.append("email", email);
    formData.append("job_id", jobID);
    formData.append("results_format", resultsFormat);

    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_CORECEPTOR_SERVER_URL}/submit`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData));
    }

    setSubmitted(true);

    return await response.json();
  });

  return (
    <ConfirmationModal
      open={open}
      onBack={onClose}
      onSubmit={mutate}
      isLoading={isLoading}
      submitted={submitted}
      errorMessage={error?.message}
    >
      <div className="flex flex-col gap-4">
        <ConfirmationDisplay label="Email to receive results" value={email} />
        {jobID && <ConfirmationDisplay label="Job ID" value={jobID} />}
        <ConfirmationDisplay label="Results Format" value={resultsFormat} />
        <ol className="list-decimal overflow-x-auto whitespace-nowrap max-h-[30vh] flex flex-col gap-2">
          {files.map((file, i) => (
            <ConfirmationDisplay
              key={file.name}
              label={`File ${i + 1}`}
              value={file.name}
            />
          ))}
        </ol>
      </div>
    </ConfirmationModal>
  );
}
