import Button from "@/components/form/Button";
import { useState } from "react";

export default function useStepForm() {
  const [step, setStep] = useState(0);

  const stepForward = (limit: number | false = false) => {
    setStep((s) => {
      const nextStep = s + 1;
      if (limit === false) {
        return nextStep;
      }
      if (nextStep > limit) {
        return s; // Do not exceed the limit
      }
      return nextStep;
    });
  };

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

  return { step, stepBack, stepForward, ContinueButton };
}
