import { useState } from "react";
import dynamic from "next/dynamic";
import useStepForm from "@/hooks/useStepForm";
import SharedSubmissionDataForm, {
  INITIAL_SHARED_SUBMISSION_DATA,
  SharedSubmissionData,
} from "../templates/SharedSubmissionData";
import useScrollToDivOnVisibilityToggle from "@/hooks/useScrollToDivOnVisibilityToggle";
import MyCollapse from "../form/MyCollapse";
import PageDescription from "../templates/PageDescription";
import Paper from "../form/Paper";
import Uploads from "../templates/Uploads";
import Alert from "../form/Alert";
import RadioGroup from "../form/RadioGroup";

const Confirmation = dynamic(() => import("./Confirmation"));

export type refGenomeType = "HXB2" | "SIVmm239";

const maxFileSize = 10 * 1024 * 1024 * 1024;

export default function Page() {
  const [state, setState] = useState<SharedSubmissionData>(
    INITIAL_SHARED_SUBMISSION_DATA,
  );

  const [refGenome, setrefGenome] = useState<refGenomeType>("HXB2");

  const { step, stepBack, ContinueButton } = useStepForm();

  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");

  const [scrollToUploads] = useScrollToDivOnVisibilityToggle(step > 0, "end");
  const [scrollToShared] = useScrollToDivOnVisibilityToggle(step > 1, "end");

  const handleAddFiles = (f: File[]) => {
    const incomingFiles = Array.from(f);
    const duplicates = incomingFiles.filter((file) =>
      files.some((existing) => existing.name === file.name),
    );
    const invalidFormat = incomingFiles.filter(
      (file) => file.name.indexOf(".fasta") === -1,
    );
    const oversizedFiles = incomingFiles.filter(
      (file) => file.size >= maxFileSize,
    );
    const whitelistedFiles = incomingFiles.filter(
      (file) =>
        file.name.indexOf(".fasta") !== -1 &&
        !files.find((fi) => fi.name === file.name)?.name &&
        file.size < maxFileSize,
    );
    const maxFiles = 255;
    const availableSlots = Math.max(0, maxFiles - files.length);
    const acceptedFiles = whitelistedFiles.slice(0, availableSlots);

    let msg = "";

    if (acceptedFiles.length < whitelistedFiles.length) {
      msg = "Maximum 255 files per submission. ";
    }
    if (duplicates.length > 0) {
      msg += `${duplicates.length} file name duplicates were not added. `;
    }
    if (invalidFormat.length > 0) {
      msg += `${invalidFormat.length} file(s) not in .fasta format. `;
    }
    if (oversizedFiles.length > 0) {
      msg += `${oversizedFiles.length} file(s) over 10GB. `;
    }

    setFileError(msg);

    setFiles((f) => [...f, ...acceptedFiles]);
  };

  return (
    <div className="flex flex-col gap-8 items-center justify-center">
      <Paper className="flex flex-col gap-8">
        <PageDescription
          title="Sequence Locator for HIV/SIV"
          description="The UNC Sequence Locator maps HIV-1 and SIV sequences to reference genomes HXB2 and SIVmm239."
          files="Format .fasta only, uncompressed.  Max file size 10Gb each. Accepts up to 255 files per submission."
          extra={
            <div className="">
              <div className=""></div>
              <div className="">
                Link to{" "}
                <a
                  className="underline!"
                  href="https://www.hiv.lanl.gov/content/sequence/LOCATE/locate.html"
                  target="_blank"
                >
                  LANL Sequence Locator
                </a>
                .
              </div>
            </div>
          }
        />
      </Paper>
      <Paper className="flex flex-col gap-8">
        <Paper className="flex align-center justify-center text-center">
          <RadioGroup
            label="Reference Genome:"
            radios={[
              { label: "HXB2 (Default)", value: "HXB2" },
              { label: "SIVmm239", value: "SIVmm239" },
            ]}
            onChange={(e) => setrefGenome(e.target.value as refGenomeType)}
            value={refGenome}
            uniqueKey="refGenome"
            direction="row"
          />
        </Paper>
        <ContinueButton level={1} disabled={step > 1} />
      </Paper>
      <div ref={scrollToUploads} className="w-full">
        <MyCollapse show={step > 0}>
          <Paper className="flex flex-col gap-8">
            <Uploads
              files={files}
              setFiles={setFiles}
              error=""
              fileErrors={[]}
              showSubject={true}
              customAddFiles={handleAddFiles}
            />
            <Alert severity="error" msg={fileError} data-cy="fileErrorAlert" />
            <ContinueButton level={2} disabled={files.length < 1 || step > 1} />
          </Paper>
        </MyCollapse>
      </div>
      <div ref={scrollToShared} className="w-full">
        <MyCollapse show={step > 1}>
          <div ref={scrollToShared} className="flex flex-col gap-8">
            <SharedSubmissionDataForm
              state={state}
              setState={setState}
              defaultJobID="sequence-locator"
            />
            <ContinueButton level={3} disabled={!state.email} />
          </div>
        </MyCollapse>
      </div>
      <Confirmation
        show={step > 2}
        stepBack={stepBack}
        body={{ files, refGenome, ...state }}
      />
    </div>
  );
}
