import { useState } from "react";
import Collapse from "@/components/form/Collapse";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/20/solid";
import { useTCSDRContext } from "@/contexts/TCSDRContext";
import Button from "../form/Button";
import Alert from "../form/Alert";
import Modal from "../form/Modal";
import { useRouter } from "next/router";

const UploadProgress = () => {
  const {
    state: { uploadedFiles },
  } = useTCSDRContext();

  return (
    <div className="flex flex-col gap-4">
      <Alert
        severity="info"
        msg="FILES ARE UPLOADING. PLEASE DO NOT CLOSE THIS WINDOW YET."
      />
      <div className="text-lg">Uploading Files:</div>
      <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
        {Object.keys(uploadedFiles).map((key, i) => (
          <div
            className="flex gap-4 justify-between items-center"
            key={`upload_progress_${i}`}
          >
            <div>{key}</div>
            <div>
              {uploadedFiles[key] === false ? (
                <XCircleIcon />
              ) : uploadedFiles[key] === true ? (
                <CheckCircleIcon />
              ) : (
                `${uploadedFiles[key]}%`
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Summary = () => {
  const {
    state: {
      pipeline: { primers, email, dropbox, htsf, drVersion },
      isDR,
      files,
      submitting,
    },
  } = useTCSDRContext();

  return (
    <div className="flex flex-col gap-6">
      <div>
        You are using the {isDR ? "DR" : "TCS"} pipeline
        {isDR ? (
          <span className="underline ml-1">{`version ${drVersion}`}</span>
        ) : (
          ""
        )}
        .
      </div>
      {!isDR && primers?.length > 0 && (
        <>
          <div className="text-lg">Your selected primers:</div>
          <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto">
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
      <div>
        Email to receive results: <u>{email}</u>
      </div>
      {!!dropbox ? (
        <div>Using DropBox URL: {dropbox}</div>
      ) : !!htsf ? (
        <div>Using HTSF location: {htsf}</div>
      ) : files?.length > 0 && !submitting ? (
        <div className="flex flex-col gap-4">
          <div className="text-lg">Files to upload:</div>
          <div className="flex flex-col gap-2 max-h-[33vh] overfloy-y-auto">
            {files.map((file, i) => (
              <div
                className="flex gap-4 justify-start items-center"
                key={`file_${i}`}
              >
                <div className="flex flex-col gap-1">
                  <div>{file.file.name}</div>
                  <div className="text-sm">{`Lib: ${file.poolName}`}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        ""
      )}
    </div>
  );
};

const Submitted = ({ show }) => {
  const { downloadJSON } = useTCSDRContext();
  return (
    <Collapse open={show}>
      <div className="flex flex-col gap-8">
        <Alert
          severity="success"
          msg="Submitted. You will receive a confirmation email within 5 minutes."
        />

        <Button fullWidth href={downloadJSON()} download="params.json">
          Download params.json
        </Button>
      </div>
    </Collapse>
  );
};

const Confirmation = () => {
  const {
    state: {
      submitting,
      submitted,
      submitError,
      submittingError,
      pipeline: { email },
    },
    submitTCSDR,
  } = useTCSDRContext();

  const router = useRouter();

  const [open, setOpen] = useState(false);
  const handleClose = () => {
    if (submitted) {
      router.reload();
    } else if (!submitting) {
      setOpen(false);
    }
  };

  const showSubmitted = submitted && !submitError;

  return (
    <>
      <Button fullWidth onClick={() => setOpen(true)} disabled={!email}>
        Submit
      </Button>
      <Modal open={open} onClose={handleClose}>
        <div className="flex flex-col gap-4 p-4 m-4">
          <div className="font-lg text-lg">Confirm Submission</div>
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
            <Submitted show={showSubmitted} />
            {!showSubmitted && (
              <>
                {submittingError !== false && (
                  <Alert severity="error" msg={submittingError} />
                )}
                {submitting ? <UploadProgress /> : <Summary />}
              </>
            )}
          </div>
          <div className="flex justify-end items-end gap-4">
            <Button
              onClick={handleClose}
              variant="none"
              color="error"
              disabled={submitting}
            >
              {submitted ? "Finish" : "Back"}
            </Button>
            <Button
              onClick={submitTCSDR}
              iconButton={submitted}
              isLoading={submitting}
              disabled={submitting || submitted}
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
    </>
  );
};

export default Confirmation;
