import { useState } from "react";
import Confirmation from "./Confirmation";
import Paper from "@/components/form/Paper";
import useScrollToDivOnVisibilityToggle from "@/hooks/useScrollToDivOnVisibilityToggle";
import PageDescription from "../templates/PageDescription";
import useStepForm from "@/hooks/useStepForm";
import MyCollapse from "../form/MyCollapse";
import SharedSubmissionDataForm, {
  INITIAL_SHARED_SUBMISSION_DATA,
  SharedSubmissionData,
} from "../templates/SharedSubmissionData";
import Uploads, { FileError } from "../templates/Uploads";
import { fasta } from "bioinformatics-parser";

const approvedFileTypes = ["fa", "fasta", "txt"];

const approvedFileTypesDisplay = approvedFileTypes
  .map((type) => `.${type}`)
  .join(", ");

export default function IntactnessPage() {
  const [state, setState] = useState<SharedSubmissionData>(
    INITIAL_SHARED_SUBMISSION_DATA,
  );
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<FileError[]>([]);

  // Let user keep error files, should be filtered out on coreceptor server
  const isFileSelectionValid = files.length > 0;

  const { step, stepBack, ContinueButton } = useStepForm();

  const [scrollToRef] = useScrollToDivOnVisibilityToggle(step > 0, "start");

  const customAddFiles = (files: File[]) => asyncCustomAddFiles(files);
  const asyncCustomAddFiles = async (files: File[]) => {
    for (const file of files) {
      const name = file.name || "Unnamed file";

      const addToFileErrors = (error: string) =>
        setFileErrors((prev) => [...prev, { name, error }]);

      if (!approvedFileTypes.includes(name.split(".").pop() || "")) {
        addToFileErrors(`File type not supported`);
        // return;
      }

      const text = await file.text();
      const parsed = fasta.parse(text);

      if (parsed?.error?.message) {
        addToFileErrors(`Error parsing file: ${parsed.error?.message}`);
        // return;
      }

      if (!parsed?.ok || !parsed?.result || parsed.result.length === 0) {
        addToFileErrors(`No valid sequences found in "${file.name}".`);
        // return;
      }
    }

    setFiles((prev) => [...prev, ...files]);
  };

  return (
    <div className="flex flex-col gap-4 m-4">
      <Paper className="flex flex-col gap-8">
        <PageDescription
          title="Geno2Pheno Coreceptor Pipeline"
          description="Upload multiple unaligned sequences to run through Geno2Pheno Coreceptor using a significance level of 15%."
          files={`should be uncompressed and in one of the following formats: ${approvedFileTypesDisplay}. Submissions cannot exceed 16MB.`}
          results="include ID, V3 Loop, Subtype, FPR, Percentage."
          extra={
            <>
              More details can be found at the{" "}
              <a
                href="https://coreceptor.geno2pheno.org/"
                target="_BLANK"
                rel="noreferrer"
                className="underline ml-1"
              >
                Geno2Pheno Coreceptor page
              </a>
              .
            </>
          }
        />
      </Paper>
      <Paper className="flex flex-col gap-4">
        <div className="text-center text-lg">
          Upload uncompressed files with an extension of{" "}
          {approvedFileTypesDisplay}
        </div>
        <Uploads
          files={files}
          setFiles={setFiles}
          uniqueID="coreceptor"
          error=""
          fileErrors={fileErrors}
          customAddFiles={customAddFiles}
        />
        <ContinueButton level={1} disabled={!isFileSelectionValid} />
      </Paper>
      <div ref={scrollToRef} className="w-full">
        <MyCollapse show={step > 0} className="flex flex-col gap-4">
          <SharedSubmissionDataForm
            state={state}
            setState={setState}
            defaultJobID="coreceptor"
          />
          <ContinueButton
            level={2}
            disabled={!state.email || !isFileSelectionValid}
          />
        </MyCollapse>
      </div>
      <Confirmation
        open={step > 1}
        onClose={stepBack}
        state={state}
        files={files}
      />
    </div>
  );
}
