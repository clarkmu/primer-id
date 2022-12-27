import { useOGVContext } from "@/contexts/OGVContext";
import { useState } from "react";
import Button from "@/components/form/Button";
import Input from "@/components/form/Input";
import useScrollToDivOnVisibilityToggle from "@/hooks/useScrollToDivOnVisibilityToggle";
import Alert from "../form/Alert";
import RadioGroup from "../form/RadioGroup";

export default function Submit() {
  const {
    state: { email, jobID, resultsFormat, showSubmit, conversion },
    setState,
    isMissingStart2ART,
  } = useOGVContext();

  const [scrollToRef] = useScrollToDivOnVisibilityToggle(showSubmit);

  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (email.indexOf("@") === -1) {
      setError("Please enter a valid email address.");
    } else {
      setError("");
      setState((s) => ({ ...s, showConfirm: true }));
    }
  };

  return (
    <div className="flex flex-col gap-6" ref={scrollToRef}>
      <Input
        name="email"
        label="Email"
        placeholder="Email to receive results"
        value={email}
        onChange={(e) =>
          setState((s) => ({ ...s, email: e.target.value.trim() }))
        }
        type="email"
      />
      <Input
        name="jobID"
        label="Name Output (optional* whitespace is replaced by _)"
        placeholder=""
        value={jobID}
        onChange={(e) =>
          setState((s) => ({
            ...s,
            jobID: e.target.value.replace(/\s/g, "_"),
          }))
        }
      />
      <RadioGroup
        label={`Results Format: ogv-results_${jobID || "{id}"}${
          resultsFormat === "tar" ? ".tar.gz" : ".zip"
        }`}
        value={resultsFormat}
        radios={[
          { label: ".tar.gz", value: "tar" },
          { label: ".zip", value: "zip" },
        ]}
        onChange={(e) =>
          setState((s) => ({ ...s, resultsFormat: e.target.value }))
        }
      />
      <Alert msg={error} />
      <Button onClick={handleSubmit} disabled={!email || isMissingStart2ART()}>
        Submit
      </Button>
    </div>
  );
}
