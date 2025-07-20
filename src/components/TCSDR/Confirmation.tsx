import { useState } from "react";
import Collapse from "@/components/form/Collapse";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/20/solid";
import Button from "../form/Button";
import Alert from "../form/Alert";
import Modal from "../form/Modal";
import { useRouter } from "next/router";
import usePost from "@/hooks/queries/usePost";
import useUploadSignedURLs from "@/hooks/useUploadSignedURLs";
import { tcsdrs } from "@prisma/client";
import ConfirmationDisplay from "../form/ConfirmationDisplay";
import { TCSDRState } from "./Form";

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

  const { uploadError, UploadProgress, uploadFilesToSignedURL } =
    useUploadSignedURLs(files);

  const router = useRouter();

  const handleClose = () => {
    if (submitted) {
      router.reload();
    } else {
      onClose();
    }
  };

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

  const showSubmitted = submitted && !isError;

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="flex flex-col gap-4 p-4 m-4">
        <div className="font-lg text-lg">Confirm Submission</div>
        <Alert
          msg={isError ? "An error has occurred with your submission." : ""}
        />
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
          <Collapse open={showSubmitted}>
            <div className="flex flex-col gap-8">
              <Alert
                severity="success"
                msg="Submitted. You will receive a confirmation email within 5 minutes."
              />
              <DownloadJSONButton />
            </div>
          </Collapse>
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
          <Alert severity="error" msg={error} />
          <Alert severity="error" msg={uploadError} />
        </div>
        <div className="flex justify-end items-end gap-4">
          <Button
            onClick={handleClose}
            variant="outlined"
            color="error"
            disabled={isLoading}
            data-cy={submitted ? "finishButton" : "backButton"}
          >
            {submitted ? "Finish" : "Back"}
          </Button>
          <Button
            onClick={onSubmit}
            iconButton={submitted}
            isLoading={isLoading}
            disabled={isLoading || submitted}
            data-cy="submitButton"
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
};

export default Confirmation;
