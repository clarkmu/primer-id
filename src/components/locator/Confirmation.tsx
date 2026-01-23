import { useState } from "react";
import usePost from "@/hooks/queries/usePost";
import useUploadSignedURLs from "@/hooks/useUploadSignedURLs";
import ConfirmationModal from "../templates/ConfirmationModal";
import ConfirmationDisplay from "../form/ConfirmationDisplay";

type ResponseData =
  | undefined
  | {
      error: string;
    }
  | {
      id: string;
      signedURLs: string[];
    };

export default function Confirmation({
  show,
  body,
  stepBack,
}: {
  show: boolean;
  body: object & {
    email: string;
    refGenome: string;
    files: File[];
  };
  stepBack: () => void;
}) {
  const { email, files, refGenome } = body;

  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const {
    uploadError,
    UploadProgress,
    uploadFilesToSignedURL,
    isUploading,
    isUploadComplete,
  } = useUploadSignedURLs(files);

  const { mutate, isLoading, isError } = usePost("/api/locator");

  const onSubmit = async () => {
    const data = { ...body };

    setError("");

    data.uploads = files.map((f) => ({
      fileName: f.name,
    }));

    delete data.files;

    mutate({
      body: data,
      callback: async (responseData: ResponseData) => {
        if (!responseData) {
          setError("An error has occurred. Please try again.");
          return;
        }

        if (responseData?.error) {
          setError(
            responseData?.error || "An error has occurred. Please try again.",
          );
          return;
        }

        if (!responseData.signedURLs.length) {
          setError("Failed to upload files. Please refresh and try again.");
          return;
        }

        const isSuccess = await uploadFilesToSignedURL(responseData.signedURLs);
        if (isSuccess) {
          await fetch(`/api/locator/submit/${responseData.id}`, {
            method: "DELETE",
          });
          setSubmitted(true);
        } else {
          setError("Failed to upload files. Please refresh and try again.");
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
        <ConfirmationDisplay label="Reference Genome" value={refGenome} />
        <UploadProgress />
      </div>
    </ConfirmationModal>
  );
}
