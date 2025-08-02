import Alert from "@/components/form/Alert";
import { useState } from "react";
import Confirmation from "./Confirmation";
import Paper from "@/components/form/Paper";
import useScrollToDivOnVisibilityToggle from "@/hooks/useScrollToDivOnVisibilityToggle";
import useSequenceFile from "@/hooks/useSequenceFile";
import PageDescription from "../templates/PageDescription";
import useStepForm from "@/hooks/useStepForm";
import MyCollapse from "../form/MyCollapse";
import SharedSubmissionDataForm, {
  INITIAL_SHARED_SUBMISSION_DATA,
  SharedSubmissionData,
} from "../templates/SharedSubmissionData";

const approvedFileTypes = ["fa", "fasta", "txt"];

export default function IntactnessPage() {
  const [state, setState] = useState<SharedSubmissionData>(
    INITIAL_SHARED_SUBMISSION_DATA,
  );

  const { step, stepBack, ContinueButton } = useStepForm();

  const {
    SequenceFileInput,
    sequences,
    parseError,
    filename,
    approvedFileTypesDisplay,
  } = useSequenceFile(approvedFileTypes);

  const [scrollToRef] = useScrollToDivOnVisibilityToggle(step > 0, "start");

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
          Upload an uncompressed file with an extension of{" "}
          {approvedFileTypesDisplay}
        </div>
        <SequenceFileInput />
        {!!parseError ? (
          <Alert severity="info" msg={parseError} data-cy="fileErrorAlert" />
        ) : !!sequences?.result?.length && filename.length ? (
          <div className="flex flex-col gap-2 font-bold my-2">
            <div className="">Files: {filename}</div>
            <div className="" data-cy="num_sequences_parsed">
              {sequences?.result?.length || ""} sequences found.
            </div>
          </div>
        ) : null}
        <ContinueButton level={1} disabled={!sequences?.ok} />
      </Paper>
      <div ref={scrollToRef} className="w-full">
        <MyCollapse show={step > 0} className="flex flex-col gap-4">
          <SharedSubmissionDataForm
            state={state}
            setState={setState}
            defaultJobID="Geno2Pheno"
          />
          <ContinueButton level={2} disabled={!state.email || !sequences?.ok} />
        </MyCollapse>
      </div>
      <Confirmation
        open={step > 1}
        onClose={stepBack}
        state={state}
        sequences={sequences}
        filename={filename}
      />
    </div>
  );
}
