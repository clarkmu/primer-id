import { useOGVContext } from "@/contexts/OGVContext";
import useScrollToDivOnVisibilityToggle from "@/hooks/useScrollToDivOnVisibilityToggle";
import Button from "@/components/form/Button";
import Input from "@/components/form/Input";

export default function Conversion() {
  const {
    state: { conversion, showSubmit, showConversion },
    setState,
    filesByLib,
  } = useOGVContext();

  const [scrollToRef] = useScrollToDivOnVisibilityToggle(showConversion);

  const setStart2ART = (subject: string, start2ART: number) =>
    setState((s) => ({
      ...s,
      conversion: { ...s.conversion, [subject]: start2ART },
    }));

  const skipConversion = () =>
    setState((s) => ({
      ...s,
      showSubmit: true,
      conversion: {},
    }));

  const submitConversion = () => setState((s) => ({ ...s, showSubmit: true }));

  const subjects = Object.keys(filesByLib());

  return (
    <div className="flex flex-col gap-4" ref={scrollToRef}>
      <div className="text-center w-full text-lg">
        Add Start2ART per subject (optional)
      </div>
      <div className="flex flex-col gap-4">
        {subjects.map((subject) => (
          <div key={subject} className="flex gap-4 items-center justify-center">
            <div className="">{subject}</div>
            <Input
              type="number"
              value={conversion[subject] || ""}
              onChange={(e) => setStart2ART(subject, e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Button
            fullWidth
            onClick={skipConversion}
            disabled={showSubmit}
            variant="outlined"
          >
            Skip Conversion
          </Button>
        </div>
        <div className="flex-1">
          <Button fullWidth onClick={submitConversion} disabled={showSubmit}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
