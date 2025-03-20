import Input from "../form/Input";
import RadioGroup from "../form/RadioGroup";

export default function SharedSubmissionDataForm({
  state,
  setState,
  defaultJobID,
}) {
  const { email, jobID, resultsFormat } = state;

  const updateField = (obj) => {
    setState((prev) => ({ ...prev, ...obj }));
  };

  return (
    <>
      <Input
        data-cy="emailInput"
        name="email"
        label="Email"
        placeholder="Email to receive results"
        value={email}
        onChange={(e) => updateField({ email: e.target.value.trim() })}
      />
      <Input
        name="jobID"
        label="Name output (optional* whitespace is replaced by _)"
        placeholder=""
        value={jobID}
        onChange={(e) =>
          updateField({ jobID: e.target.value.replace(/\s/g, "_") })
        }
      />
      <RadioGroup
        label={`${defaultJobID}_${jobID || "{id}"}${resultsFormat === "tar" ? ".tar.gz" : ".zip"}`}
        value={resultsFormat}
        radios={[
          { label: ".tar.gz", value: "tar" },
          { label: ".zip", value: "zip" },
        ]}
        onChange={(e) => updateField({ resultsFormat: e.target.value })}
      />
    </>
  );
}
