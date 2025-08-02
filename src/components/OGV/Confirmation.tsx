import { useState } from "react";
import { Conversion } from "./OGVPage";
import usePost from "@/hooks/queries/usePost";
import useUploadSignedURLs from "@/hooks/useUploadSignedURLs";
import ConfirmationModal from "../templates/ConfirmationModal";
import ConfirmationDisplay from "../form/ConfirmationDisplay";

export default function Confirmation({
  show,
  body,
  stepBack,
}: {
  show: boolean;
  body: object & {
    email: string;
    files: File[];
    conversion: Conversion;
  };
  stepBack: () => void;
}) {
  const { email, files, conversion } = body;

  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const {
    uploadError,
    UploadProgress,
    uploadFilesToSignedURL,
    isUploading,
    isUploadComplete,
  } = useUploadSignedURLs(files);

  const { mutate, isLoading, isError } = usePost("/api/ogv");

  const onSubmit = async () => {
    const data = { ...body };

    data.uploads = files.map((f) => ({
      fileName: f.name,
      libName: f.name.split("_")[0],
    }));

    delete data.files;

    mutate({
      body: data,
      callback: async (data) => {
        if (!data) {
          setError("An error has occurred. Please try again.");
        } else if (data?.error) {
          setError(data?.error || "An error has occurred. Please try again.");
        } else {
          if (data.signedURLs.length) {
            const isSuccess = await uploadFilesToSignedURL(data.signedURLs);
            if (isSuccess) {
              await fetch(`/api/ogv/submit/${data.id}`, {
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

  const errorMessage = uploadError
    ? "An error occurred while uploading.  Please resubmit."
    : isError
      ? "Network Error: Failed to submit."
      : error || "";

  return (
    <ConfirmationModal
      open={show}
      onBack={() => stepBack()}
      onSubmit={onSubmit}
      isLoading={isLoading || isUploading}
      submitted={submitted && isUploadComplete}
      errorMessage={errorMessage}
    >
      <div className="flex flex-col gap-4">
        <ConfirmationDisplay label="Email to receive results" value={email} />
        <div className="flex gap-4">
          {Object.keys(conversion).map((subject) => (
            <div key={`display_${subject}`} className="">
              {subject} -{" "}
              {files.filter((f) => f.name.startsWith(subject)).length} samples -
              Start ART: {conversion[subject]} weeks.
            </div>
          ))}
        </div>
      </div>
      <UploadProgress />
    </ConfirmationModal>
  );
}
