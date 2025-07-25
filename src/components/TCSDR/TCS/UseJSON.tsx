import React, { useState } from "react";
import { variablesFromViralSeqCLI } from "@/utils/translateVariablesForCLI";
import syntaxHighlight from "@/utils/syntaxHighlight";
import Button from "@/components/form/Button";
import Paper from "@/components/form/Paper";
import Alert from "@/components/form/Alert";
import Input from "@/components/form/Input";
import InputFile from "@/components/form/InputFile";
import parse from "html-react-parser";
import { ParamTypes, useTCS } from "@/contexts/TCSContext";

const testData = { email: "tester@test.com" };

export default function UseJSON() {
  const { setState, stepForward, setProcedure } = useTCS();

  const [input, setInput] = useState(JSON.stringify(testData));
  const [data, setData] = useState(testData);
  const [errors, setErrors] = useState([]);

  const finishJSON = () => {
    const pipeline = variablesFromViralSeqCLI(data);

    setState((s) => ({ ...s, ...pipeline }));
    setProcedure(ParamTypes.NEW);
    stepForward();
  };

  const addError = (e) => setErrors((a) => [...a, e]);

  const handleChange = (json) => {
    setInput(json);
    setErrors([]);
    try {
      const d = JSON.parse(json);

      let hasError = false;

      if (d.primer_pairs) {
        d.primer_pairs.forEach((primer, i) => {
          const { region } = primer;

          if (!region) {
            addError(`Missing region in primer #${i}`);
            hasError = true;
            return false;
          }
          if (!primer.forward) {
            addError(`Missing forward in primer #${region}`);
            hasError = true;
            return false;
          }
          if (!primer.cdna) {
            addError(`Missing cDNA in primer #${region}`);
            hasError = true;
            return false;
          }
        });
      }

      if (!hasError) {
        setData(d);
      }
    } catch (e) {
      addError("Invalid JSON object.");
    }
  };

  const preHTML = syntaxHighlight(
    JSON.stringify(data, null, 2).replace(/\\"/g, "").replace(/\\n/g, ""),
  );

  return (
    <div data-cy="use_json_input" className="flex flex-col gap-4">
      <div className="text-lg font-lg mx-auto my-8">
        If you are using the <code>`tcs`</code> CLI, you can also paste your
        output here.
      </div>
      <InputFile
        label="Use a .json file"
        multiple={false}
        onChange={(files) => {
          const reader = new FileReader();
          reader.onload = (e) => handleChange(e.target.result);
          reader.readAsText(files[0]);
        }}
      />
      <Paper>
        <Input
          textArea={true}
          rows={10}
          label="JSON Input (editable)"
          name="json-input"
          data-cy="use-json-input"
          placeholder="Paste JSON here that you recieved from the TCS CLI tool"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
        />
      </Paper>
      {errors.length > 0 ? (
        errors.map((error, i) => <Alert key={`error_${i}`} msg={error} />)
      ) : (
        <Paper>
          <div>Verify JSON below:</div>
          <pre
            className="whitespace-pre-wrap break-words max-h-[60vh] overflow-y-auto"
            name="json-output"
            data-cy="use-json-output"
          >
            {parse(preHTML)}
          </pre>
        </Paper>
      )}
      <Button data-cy="nextStepButton" fullWidth onClick={finishJSON}>
        Continue
      </Button>
    </div>
  );
}
