import Button from "@/components/form/Button";
import { useState } from "react";

export default function useStepForm() {
  const [step, setStep] = useState(0);

  const stepBack = () => setStep((s) => s - 1);

  const ContinueButton = ({
    disabled = false,
    level,
    label = "Continue",
  }: {
    disabled?: boolean;
    level: number;
    label?: string;
  }) => (
    <Button
      data-cy="nextStepButton"
      onClick={() => {
        if (step < level) {
          setStep((s) => s + 1);
        }
      }}
      fullWidth={true}
      disabled={disabled}
    >
      {label}
    </Button>
  );

  return { step, stepBack, ContinueButton };
}
