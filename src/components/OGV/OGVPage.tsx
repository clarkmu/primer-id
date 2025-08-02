import ConfirmModal from "@/components/OGV/Confirmation";
import Conversion from "@/components/OGV/Conversion";
import Uploads from "@/components/templates/Uploads";
import Paper from "@/components/form/Paper";
import PageDescription from "../templates/PageDescription";
import { useMemo, useState } from "react";
import useScrollToDivOnVisibilityToggle from "@/hooks/useScrollToDivOnVisibilityToggle";
import useStepForm from "@/hooks/useStepForm";
import MyCollapse from "../form/MyCollapse";
import SharedSubmissionDataForm, {
  INITIAL_SHARED_SUBMISSION_DATA,
  SharedSubmissionData,
} from "../templates/SharedSubmissionData";
import Alert from "../form/Alert";

export type Conversion = {
  [subject: string]: number | string;
};

export function subjectFromFilename(filename: string): string {
  return filename.split("_")[0];
}

function whitelistCharsInFilenames(file: File): File {
  const filteredName = file.name
    .replace(/-/gi, "_")
    .replace(/[^a-zA-Z0-9_.]/g, "");

  if (filteredName === file.name) {
    return file;
  }

  return new File([file], filteredName);
}

export default function OGVPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [conversion, setConversion] = useState<Conversion>({});
  const [fileError, setFileError] = useState("");

  const [state, setState] = useState<SharedSubmissionData>(
    INITIAL_SHARED_SUBMISSION_DATA,
  );

  const { step, stepBack, ContinueButton } = useStepForm();

  const [scrollToConversion] = useScrollToDivOnVisibilityToggle(
    step > 0,
    "end",
  );
  const [scrollToShared] = useScrollToDivOnVisibilityToggle(step > 1, "end");

  // whitelist problematic filenames
  const handleAddFiles = (f: File[]) => {
    const whitelistedFiles = Array.from(f)
      .filter(
        (f) =>
          f.name.indexOf(".fasta") !== -1 &&
          !files.find((fi) => fi.name === f.name)?.name,
      )
      .map((f) => whitelistCharsInFilenames(f));

    let msg = "";

    const filesWithoutSubject = whitelistedFiles.filter(
      (f) => f.name.indexOf("_") === -1,
    );

    if (f.length !== whitelistedFiles.length) {
      msg = "Some files were removed (duplicates or not in .fasta format). ";
    } else if (filesWithoutSubject.length > 0) {
      msg += `The following files do not have the name format of {subject}_{sample}: ${filesWithoutSubject
        .map((f) => f.name)
        .join(", ")}`;

      // remove filesWithoutSubject from whitelistedFiles
      whitelistedFiles.splice(
        0,
        whitelistedFiles.length,
        ...whitelistedFiles.filter((f) => f.name.indexOf("_") !== -1),
      );
    }

    setFileError(msg);

    setFiles((f) => [...f, ...whitelistedFiles]);
  };

  // list of unique subjects
  const subjects: string[] = useMemo(() => {
    const subs: string[] = [];
    files.forEach((f) => {
      const sub = subjectFromFilename(f.name);
      if (sub && !subs.includes(sub)) {
        subs.push(sub);
      }
    });
    return subs;
  }, [files]);

  const isMissingStart2ART: boolean = useMemo(() => {
    if (subjects.length < 1) {
      return false;
    }

    const valuesMissing = subjects
      .map((subject) => {
        if (
          !conversion[subject] ||
          isNaN(conversion[subject]) ||
          conversion[subject] <= 0
        ) {
          return subject;
        }
        return null;
      })
      .filter((s) => s !== null) as string[];

    return valuesMissing.length > 0;
  }, [conversion, subjects]);

  return (
    <div className="flex flex-col gap-8 items-center justify-center">
      <Paper className="flex flex-col gap-8">
        <PageDescription
          title="Outgrowth Virus Dating Pipeline"
          description="This pipeline times outgrowth virus (OGV) strains from a single host using serially sampled RNA data. Four different approaches are used to assign dates to unobserved strains. First, each tree is rooted to maximize the root-to-tip to sampling time correlation coefficient."
          files="File names should be formatted as {subject}_{sample}.fasta. Special characters (-/*) in filename will be filtered out."
          extra={
            <div>
              <a
                href="https://github.com/clarkmu/ogv-dating"
                target="_BLANK"
                rel="noreferrer"
                className="underline"
              >
                This pipeline
              </a>{" "}
              was adapted from the{" "}
              <a
                href="https://github.com/veg/ogv-dating"
                target="_BLANK"
                rel="noreferrer"
                className="underline"
              >
                Outgrowth Virus Dating pipeline
              </a>{" "}
              created by{" "}
              <a
                href="http://sdcsb.ucsd.edu/igem/"
                target="_BLANK"
                rel="noreferrer"
                className="underline"
              >
                iGEM/UCSD evolutionary biology and bioinformatics group
              </a>
              .
            </div>
          }
        />
      </Paper>
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
        <ContinueButton level={1} disabled={files.length < 1 || step > 0} />
      </Paper>
      <div ref={scrollToConversion} className="w-full">
        <MyCollapse show={step > 0} className="flex flex-col gap-8">
          <Conversion
            conversion={conversion}
            setConversion={setConversion}
            subjects={subjects}
            attemptedSubmit={step > 1}
          />
          <ContinueButton level={2} disabled={isMissingStart2ART || step > 1} />
        </MyCollapse>
      </div>
      <MyCollapse show={step > 1}>
        <div ref={scrollToShared} className="flex flex-col gap-8">
          <SharedSubmissionDataForm
            state={state}
            setState={setState}
            defaultJobID="ogv-dating"
          />
          <ContinueButton
            level={3}
            disabled={!state.email || isMissingStart2ART}
          />
        </div>
      </MyCollapse>
      <ConfirmModal
        show={step > 2}
        stepBack={stepBack}
        body={{ files, conversion, ...state }}
      />
    </div>
  );
}
