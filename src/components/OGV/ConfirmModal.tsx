import { useOGVContext } from "@/contexts/OGVContext";
import { useMemo, useState } from "react";
import Button from "@/components/form/Button";
import Modal from "@/components/form/Modal";
import Alert from "../form/Alert";
import { useRouter } from "next/router";

export default function ConfirmModal() {
  const {
    state: { showConfirm, email, uploads, conversion },
    setState,
    filesByLib,
    submitOGV,
  } = useOGVContext();

  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const listedFiles = useMemo(filesByLib, [showConfirm, filesByLib]);

  const onClose = () => {
    if (submitted) {
      router.reload();
    }

    if (!submitting) {
      setState((s) => ({ ...s, showConfirm: false }));
    }
  };

  const onSubmit = async () => {
    setSubmitError("");
    setSubmitting(true);
    const error = await submitOGV();
    setSubmitting(false);
    if (error) {
      setSubmitError(error);
    } else {
      setSubmitted(true);
    }
  };

  const DisplaySubject = ({ subject, lib }) => (
    <div className="flex flex-col gap-1">
      <div className="font-bold flex gap-1">
        <span>{lib}</span>
        <span>-</span>
        <span>{`${subject.length} sample${
          subject.length > 1 ? "s" : ""
        }`}</span>
        <span>-</span>
        <span> {`Start ART: ${conversion[lib]} weeks`}</span>
      </div>
      <div className="ml-4 flex flex-col gap-1">
        {subject.map((sample) => (
          <div className="flex gap-2 justify-between" key={`confirm_${sample}`}>
            <div>{sample}</div>
            <div>
              {submitting
                ? `${uploads.find((u) => u.name === sample)?.progress}%`
                : "..."}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Modal open={showConfirm} onClose={onClose}>
      <div className="flex flex-col gap-8 m-8">
        <div className="text-center w-full text-xl font-bold">
          Please review your submission data.
        </div>
        <div className="flex gap-4">
          <b>Email:</b>
          <div>{email}</div>
        </div>
        <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
          {/* <b>Submitted files by sample:</b> */}
          {Object.keys(listedFiles).map((lib) => (
            <DisplaySubject
              subject={listedFiles[lib]}
              lib={lib}
              key={`display_${lib}`}
            />
          ))}
        </div>
        <Alert msg={submitError} />
        <div className="flex justify-end items-end gap-4">
          {submitted ? (
            <Button onClick={() => router.reload()}>
              Submitted! Click to reload page.
            </Button>
          ) : (
            <>
              <Button variant="none" onClick={onClose}>
                Back
              </Button>
              <Button onClick={onSubmit} isLoading={submitting}>
                Submit
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
