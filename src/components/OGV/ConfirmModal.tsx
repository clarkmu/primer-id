import { useState } from "react";
import Button from "@/components/form/Button";
import Modal from "@/components/form/Modal";
import Alert from "../form/Alert";
import { useRouter } from "next/router";
import { Conversion } from "./OGVPage";
import usePost from "@/hooks/queries/usePost";
import useUploadSignedURLs from "@/hooks/useUploadSignedURLs";

export default function ConfirmModal({
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

  const router = useRouter();
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { uploadError, UploadProgress, uploadFilesToSignedURL } =
    useUploadSignedURLs(files);

  const { mutate, isLoading, isError } = usePost("/api/ogv");

  const onClose = () => {
    if (submitted) {
      router.reload();
    } else {
      stepBack();
    }
  };

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

  return (
    <Modal open={show} onClose={onClose}>
      <div className="flex flex-col gap-8 m-8">
        <div className="text-center w-full text-xl font-bold">
          Please review your submission data.
        </div>
        <div className="flex gap-4">
          <b>Email:</b>
          <div>{email}</div>
        </div>
        <div className="flex gap-4">
          {Object.keys(conversion).map((subject) => (
            <div key={`display_${subject}`} className="">
              {subject} -{" "}
              {files.filter((f) => f.name.startsWith(subject)).length} samples -
              Start ART: {conversion[subject]} weeks.
            </div>
          ))}
        </div>
        <UploadProgress />
        {!!error && <Alert severity="error" msg={error} />}
        {isError && (
          <Alert severity="error" msg="Network Error: Failed to submit." />
        )}
        {uploadError && (
          <Alert
            severity="error"
            msg="An error occurred while uploading.  Please resubmit."
          />
        )}
        <div className="flex justify-end items-end gap-4">
          {submitted ? (
            <Button onClick={() => router.reload()} data-cy="uploadedButton">
              Submitted! Click to reload page.
            </Button>
          ) : (
            <>
              <Button variant="outlined" onClick={onClose}>
                Back
              </Button>
              <Button
                onClick={onSubmit}
                isLoading={isLoading}
                data-cy="submitButton"
              >
                Submit
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
