import Uploads from "./Uploads";
import TCSContainer from "./TCS/TCSContainer";
import Confirmation from "./Confirmation";
import { useTCSDRContext } from "@/contexts/TCSDRContext";
import MyCollapse from "@/components/form/MyCollapse";
import useTCSVersion from "@/hooks/useTCSVersion";
import Button from "../form/Button";
import Input from "../form/Input";
import useScrollToDivOnVisibilityToggle from "@/hooks/useScrollToDivOnVisibilityToggle";
import RadioGroup from "../form/RadioGroup";

export default function Form() {
  const [tcsVersion] = useTCSVersion();

  const {
    state: {
      isDR,
      showUploads,
      showSubmit,
      pipeline: { email, jobID, resultsFormat },
    },
    downloadJSON,
    editPipeline,
  } = useTCSDRContext();

  const [scrollToUploads] = useScrollToDivOnVisibilityToggle(
    showUploads,
    "end"
  );

  const [scrollToSubmit] = useScrollToDivOnVisibilityToggle(showSubmit, "end");

  return (
    <div className="flex flex-col gap-4">
      <div className="text-lg font-bolder text-center">
        {isDR ? "HIV-DR Pipeline for MPID-NGS Data" : "TCS Pipeline"}
      </div>
      <div className="text-center">
        <div>TCS version {tcsVersion}</div>
      </div>
      {!isDR && <TCSContainer />}
      <div ref={scrollToUploads}>
        <MyCollapse show={showUploads}>
          <Uploads />
        </MyCollapse>
      </div>
      <div ref={scrollToSubmit}>
        <MyCollapse show={showSubmit}>
          <div className="flex flex-col gap-6">
            <Input
              name="email"
              label="Email"
              placeholder="Email to receive results"
              value={email}
              onChange={(e) => editPipeline({ email: e.target.value.trim() })}
            />
            <Input
              name="jobID"
              label="Name output (optional* whitespace is replaced by _)"
              placeholder=""
              value={jobID}
              onChange={(e) =>
                editPipeline({ jobID: e.target.value.replace(/\s/g, "_") })
              }
            />
            <RadioGroup
              label={`Results Format: ${isDR ? "dr" : "tcs"}-results_${
                jobID || "{id}"
              }${resultsFormat === "tar" ? ".tar.gz" : ".zip"}`}
              value={resultsFormat}
              radios={[
                { label: ".tar.gz", value: "tar" },
                { label: ".zip", value: "zip" },
              ]}
              onChange={(e) => editPipeline({ resultsFormat: e.target.value })}
            />
            <div className="flex gap-4">
              <Button
                fullWidth
                href={downloadJSON()}
                download="params.json"
                disabled={!email}
              >
                Download params.json
              </Button>
              <Confirmation />
            </div>
          </div>
        </MyCollapse>
      </div>
    </div>
  );
}
