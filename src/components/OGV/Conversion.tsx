import { useOGVContext } from "@/contexts/OGVContext";
import useScrollToDivOnVisibilityToggle from "@/hooks/useScrollToDivOnVisibilityToggle";
import Button from "@/components/form/Button";
import Input from "@/components/form/Input";
import { useState } from "react";

export default function Conversion() {
  const {
    state: { conversion, showSubmit, showConversion },
    setState,
    filesByLib,
    isMissingStart2ART,
  } = useOGVContext();

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const [scrollToRef] = useScrollToDivOnVisibilityToggle(showConversion);

  const setStart2ART = (subject: string, start2ART: number) =>
    setState((s) => ({
      ...s,
      conversion: { ...s.conversion, [subject]: start2ART },
    }));

  const submitConversion = () => {
    setAttemptedSubmit(true);

    if (!isMissingStart2ART()) {
      setState((s) => ({ ...s, showSubmit: true }));
    }
  };

  const subjects = Object.keys(filesByLib());

  return (
    <div className="flex flex-col gap-4" ref={scrollToRef}>
      <div className="text-center w-full text-lg">
        Add start to ART per subject (# of weeks)
      </div>
      <div className="flex flex-col gap-4">
        {subjects.map((subject) => (
          <div key={subject} className="flex gap-4 items-center justify-center">
            <div className="">{subject}</div>
            <Input
              error={
                (showSubmit || attemptedSubmit) && !conversion[subject]
                  ? "Please set the number of weeks since start of ART"
                  : ""
              }
              type="number"
              value={conversion[subject] || ""}
              onChange={(e) => setStart2ART(subject, e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          fullWidth
          onClick={submitConversion}
          variant={showSubmit ? "outlined" : "primary"}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
