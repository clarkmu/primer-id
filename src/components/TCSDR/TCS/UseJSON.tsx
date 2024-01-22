import React, { useState } from "react";
import { useTCSDRContext } from "@/contexts/TCSDRContext";
import { variablesFromViralSeqCLI } from "@/utils/translateVariablesForCLI";
import syntaxHighlight from "@/utils/syntaxHighlight";
import Button from "@/components/form/Button";
import Paper from "@/components/form/Paper";
import Alert from "@/components/form/Alert";
import Input from "@/components/form/Input";
import InputFile from "@/components/form/InputFile";
import INITIAL_TCSDR from "@/utils/constants/INITIAL_TCSDR";
import parse from "html-react-parser";

const testData = { email: "tester@test.com" };

export default function UseJSON() {
  const { state, editState } = useTCSDRContext();

  const [input, setInput] = useState(JSON.stringify(testData));
  const [data, setData] = useState(testData);
  const [errors, setErrors] = useState([]);

  const finishJSON = () => {
    const pipeline = variablesFromViralSeqCLI(data);

    editState({
      showUploads: true,
      pipeline: { ...INITIAL_TCSDR, ...pipeline },
    });
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
    JSON.stringify(data, null, 2).replace(/\\"/g, "").replace(/\\n/g, "")
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="text-lg font-lg mx-auto my-8">
        If you are using the <code>`tcs`</code> CLI, you can also paste your
        output here.
      </div>
      <InputFile
        label="Use a .json file"
        data-cy="use_json_input_file"
        onChange={(files) => {
          const reader = new FileReader();
          reader.onload = (e) => handleChange(e.target.result);
          reader.readAsText(files[0]);
        }}
      />
      <Input
        textArea={true}
        rows={3}
        label="JSON Input"
        name="json-input"
        data-cy="use-json-input"
        placeholder="Paste JSON here that you recieved from the TCS CLI tool"
        value={input}
        onChange={(e) => handleChange(e.target.value)}
      />
      {errors.length > 0 ? (
        errors.map((error, i) => <Alert key={`error_${i}`} msg={error} />)
      ) : (
        <Paper>
          <div>Verify JSON below:</div>
          <pre
            className="whitespace-pre-wrap break-words"
            name="json-output"
            data-cy="use-json-output"
          >
            {parse(preHTML)}
          </pre>
        </Paper>
      )}
      <Button name="submit-json-button" fullWidth onClick={finishJSON}>
        Continue
      </Button>
    </div>
  );
}
