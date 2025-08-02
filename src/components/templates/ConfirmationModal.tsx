import { useRouter } from "next/router";
import Modal from "../form/Modal";
import Alert from "../form/Alert";
import Button from "../form/Button";
import { CheckCircleIcon } from "@heroicons/react/20/solid";

export default function ConfirmationModal({
  children,
  open,
  onBack,
  onSubmit,
  isLoading,
  submitted,
  errorMessage = "",
}: {
  children: React.ReactNode;
  open: boolean;
  onBack: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  submitted: boolean;
  errorMessage?: string;
}) {
  const router = useRouter();

  const handleClose = () => {
    if (submitted) {
      router.reload();
    } else {
      onBack();
    }
  };

  return (
    <Modal open={open} onClose={handleClose} data-cy="confirmationModal">
      <div className="flex flex-col gap-4 p-4 m-4">
        <div className="font-lg text-lg">Confirm Submission</div>
        <div className="flex-1 max-h-[75vh] overflow-y-auto">{children}</div>
        <div className="flex justify-end items-end gap-4">
          <div className="flex-1">
            <Alert
              data-cy="submissionErrorAlert"
              severity="error"
              msg={errorMessage}
            />
            <Alert
              data-cy="submissionSuccessAlert"
              severity="success"
              msg={
                submitted && !errorMessage
                  ? "Submitted. You will receive a confirmation email within 5 minutes."
                  : ""
              }
            />
          </div>
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
}
