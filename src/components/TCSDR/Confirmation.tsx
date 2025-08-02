import { useState } from "react";
import usePost from "@/hooks/queries/usePost";
import useUploadSignedURLs from "@/hooks/useUploadSignedURLs";
import { tcsdrs } from "@prisma/client";
import ConfirmationDisplay from "../form/ConfirmationDisplay";
import { TCSDRState } from "./Form";
import ConfirmationModal from "../templates/ConfirmationModal";

const Confirmation = ({
  open,
  state,
  files,
  onClose,
  isDR,
  useUploads,
  DownloadJSONButton,
}: {
  open: boolean;
  state: TCSDRState;
  files: File[];
  onClose: () => void;
  isDR: boolean;
  useUploads: boolean;
  DownloadJSONButton: () => JSX.Element;
}) => {
  const { primers } = state;
  const [submitted, setSubmitted] = useState(false);
  const { mutate, isLoading, isError } = usePost("/api/tcsdr");

  const [error, setError] = useState("");

  const {
    uploadError,
    UploadProgress,
    uploadFilesToSignedURL,
    isUploading,
    isUploadComplete,
  } = useUploadSignedURLs(files);

  const onSubmit = async () => {
    setError("");

    mutate({
      body: state,
      callback: async (data: tcsdrs & { error?: string }) => {
        if (!data) {
          setError("An error has occurred. Please try again.");
        } else if (data?.error) {
          setError(data?.error || "An error has occurred. Please try again.");
        } else {
          if (data.signedURLs.length) {
            const isSuccess = await uploadFilesToSignedURL(data.signedURLs);
            if (isSuccess) {
              await fetch(`/api/tcsdr/submit/${data.id}`, {
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

  const errorMessage =
    error || uploadError || isError
      ? "An error has occurred with your submission."
      : "";

  const isItUploading = useUploads ? isUploading : false;
  const isItUploadComplete = useUploads ? isUploadComplete : true;

  return (
    <ConfirmationModal
      open={open}
      onBack={onClose}
      onSubmit={onSubmit}
      isLoading={isLoading || isItUploading}
      submitted={submitted && isItUploadComplete}
      errorMessage={errorMessage}
    >
      <div className="flex flex-col gap-4">
        <DownloadJSONButton />
        <ConfirmationDisplay label="Pipeline" value={isDR ? "DR" : "TCS"} />
        {isDR && (
          <ConfirmationDisplay label="DR Version" value={state.drVersion} />
        )}
        <ConfirmationDisplay
          label="Email to receive results"
          value={state.email}
        />
        {!useUploads && (
          <>
            <ConfirmationDisplay label="HTSF Location" value={state.htsf} />
            <ConfirmationDisplay label="Pool Name" value={state.poolName} />
          </>
        )}
        {!isDR && primers?.length > 0 && (
          <>
            <div className="text-lg font-semibold mb-2">Primers:</div>
            <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto ml-6">
              {primers?.map((primer, i) => (
                <div
                  className="flex gap-2 justify-start items-center"
                  key={`primer_${i}`}
                >
                  <div className="flex flex-col gap-1">
                    <div> {`Region: ${primer.region}`}</div>
                    <div className="text-sm">{`cDNA: ${primer.cdna}`}</div>
                    <div className="text-sm">{`Forward: ${primer.forward}`}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {useUploads && <UploadProgress />}
      </div>
    </ConfirmationModal>
  );
};

export default Confirmation;
