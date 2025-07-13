import Alert from "@/components/form/Alert";
import Button from "@/components/form/Button";
import Input from "@/components/form/Input";
import { useState } from "react";
import Confirmation from "@/components/intactness/Confirmation";
import RadioGroup from "@/components/form/RadioGroup";
import Paper from "@/components/form/Paper";
import useScrollToDivOnVisibilityToggle from "@/hooks/useScrollToDivOnVisibilityToggle";
import useSequenceFile from "@/hooks/useSequenceFile";
import PageDescription from "../templates/PageDescription";
import SharedSubmissionDataForm, {
  INITIAL_SHARED_SUBMISSION_DATA,
  SharedSubmissionData,
} from "../templates/SharedSubmissionData";
import useStepForm from "@/hooks/useStepForm";
import MyCollapse from "../form/MyCollapse";

export default function IntactnessPage() {
  const [state, setState] = useState<SharedSubmissionData>(
    INITIAL_SHARED_SUBMISSION_DATA,
  );

  const [error, setError] = useState("");

  const { step, stepBack, ContinueButton } = useStepForm();

  const {
    SequenceFileInput,
    parseError,
    filename,
    sequences,
    approvedFileTypesDisplay,
  } = useSequenceFile();

  const [scrollToRef] = useScrollToDivOnVisibilityToggle(step > 0, "start");

  const onSubmit = () => {
    // check email seqs
    if (!email) {
      setError("Email is required.");
      return;
    }

    if (!sequences) {
      setError("Sequences are required.");
      return;
    }

    setError("");

    setOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 m-4">
      <Paper className="flex flex-col gap-8">
        <PageDescription
          title="Intactness Pipeline"
          description="This pipeline is a proviral intactness checker for HIV-1 sequences. Pipeline runs sequences through primer and alignment checks, hypermut, premature stop codons, and 5' defects."
          files={`should be uncompressed and in one of the following formats: ${approvedFileTypesDisplay}. Submissions cannot exceed 16MB.`}
          results="include alignment views, Gene Cutter results, and a summary of large deletions, internal inversions, and inferred intactness."
          extra={
            <>
              <div>
                <a
                  href="https://github.com/clarkmu/intactness-pipeline"
                  target="_BLANK"
                  rel="noreferrer"
                  className="underline"
                >
                  This pipeline
                </a>{" "}
                was adapted from the{" "}
                <a
                  href="https://github.com/BWH-Lichterfeld-Lab/Intactness-Pipeline"
                  target="_BLANK"
                  rel="noreferrer"
                  className="underline"
                >
                  Intactness Pipeline
                </a>{" "}
                made by{" "}
                <a
                  href="https://ragoninstitute.org/lichterfeld/"
                  target="_BLANK"
                  rel="noreferrer"
                  className="underline"
                >
                  Lichterfield Lab at BWH
                </a>
                .
              </div>
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
          <Alert severity="info" msg={parseError} />
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
        <MyCollapse show={step > 0}>
          <SharedSubmissionDataForm
            state={state}
            setState={setState}
            defaultJobID="intactness-results"
          />
          <ContinueButton
            level={2}
            disabled={!state.email || !sequences?.ok}
            onClick={onSubmit}
          />
        </MyCollapse>
      </div>
      <Confirmation
        open={step > 1}
        onClose={stepBack}
        sequences={sequences}
        filename={filename}
        state={state}
      />
    </div>
  );
}
