import Input from "@/components/form/Input";
import type { Conversion } from "./OGVPage";

export default function Conversion({
  conversion,
  setConversion,
  subjects,
  attemptedSubmit,
}: {
  conversion: Conversion;
  setConversion: React.Dispatch<Conversion>;
  subjects: string[];
  attemptedSubmit: boolean;
}) {
  const setStart2ART = (subject: string, start2ART: string) =>
    setConversion((prev: Conversion) => ({
      ...prev,
      [subject]: start2ART ? parseInt(start2ART, 10) : "",
    }));

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center w-full text-lg">
        Add start to ART per subject (# of weeks)
      </div>
      <div className="flex flex-col gap-4">
        {subjects.map((subject) => (
          <div
            data-cy={subject}
            key={subject}
            className="flex gap-4 items-center justify-center"
          >
            <div className="">{subject}</div>
            <Input
              error={
                attemptedSubmit && !conversion[subject]
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
    </div>
  );
}
