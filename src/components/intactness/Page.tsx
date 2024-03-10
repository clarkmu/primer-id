import Alert from "@/components/form/Alert";
import Button from "@/components/form/Button";
import Input from "@/components/form/Input";
import InputFile from "@/components/form/InputFile";
import { useState } from "react";
import Confirmation from "@/components/intactness/Confirmation";
import RadioGroup from "@/components/form/RadioGroup";
import Paper from "@/components/form/Paper";
import useScrollToDivOnVisibilityToggle from "@/hooks/useScrollToDivOnVisibilityToggle";

const getFilesContents = async (files: File[]) => {
  const contents = await Promise.all(
    files.map((file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result?.trim());
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    })
  )
    .then((fileContents) => fileContents.join("\n"))
    .catch((error) => {
      alert("Error reading files", error);
    });

  return contents;
};

export default function IntactnessPage() {
  const [email, setEmail] = useState("");
  const [sequences, setSequences] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [jobID, setJodID] = useState("");
  const [resultsFormat, setResultsFormat] = useState<"tar" | "zip">("tar");

  const [scrollToRef] = useScrollToDivOnVisibilityToggle(sequences.length > 0);

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

  const loadFiles = async (files: FileList) => {
    const acceptedFiles = Array.from(files)
      .filter((f) => f.name[0] !== ".")
      .filter((f) => f.name.indexOf(".fast") !== -1);

    const text = await getFilesContents(acceptedFiles);

    setSequences((s) => s + text + "\n");
  };

  return (
    <div className="flex flex-col gap-4 m-4">
      <Paper className="flex flex-col gap-8">
        <h1 className=" text-lg font-bold mx-auto">Intactness Pipeline</h1>
        <div>
          <b>DESCRIPTION</b> This pipeline is a proviral intactness checker for
          HIV-1 sequences. Pipeline runs sequences through primer and alignment
          checks, hypermut, premature stop codons, and 5&apos; defects.
        </div>
        <div>
          <b>RESULTS</b> include alignment views, Gene Cutter results, and a
          summary of large deletions, internal inversions, and inferred
          intactness.
        </div>
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
      </Paper>
      <Paper className="flex flex-col gap-4">
        <div className="text-center text-lg">
          Upload .fastq or .fastq.gz Files
        </div>
        <InputFile onChange={loadFiles} />
        <Input
          label="Sequence"
          value={sequences}
          onChange={(e) => setSequences(e.target.value + "\n")}
          textArea={true}
          rows={10}
          className="p-1 shadow-lg"
          placeholder="Or paste sequences here."
          wrap="off"
        />
      </Paper>
      {sequences.length > 0 && (
        <div className="" ref={scrollToRef}>
          <Paper className="flex flex-col gap-4">
            <Input
              label="Email"
              placeholder="example@uni.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              name="jobID"
              label="Name Output (optional* whitespace is replaced by _)"
              placeholder=""
              value={jobID}
              onChange={(e) => setJodID(e.target.value.replace(/\s/g, "_"))}
            />
            <RadioGroup
              label={`Results Format: intactness-results_${jobID || "{id}"}${
                resultsFormat === "tar" ? ".tar.gz" : ".zip"
              }`}
              value={resultsFormat}
              radios={[
                { label: ".tar.gz", value: "tar" },
                { label: ".zip", value: "zip" },
              ]}
              onChange={(e) => setResultsFormat(e.target.value)}
            />
            {!!error && <Alert severity="error" msg={error} />}
            <Button
              onClick={onSubmit}
              disabled={!sequences || !email}
              fullWidth
            >
              Submit
            </Button>
          </Paper>
        </div>
      )}
      <Confirmation
        open={open}
        onClose={() => setOpen(false)}
        email={email}
        sequences={sequences}
        resultsFormat={resultsFormat}
        jobID={jobID}
      />
    </div>
  );
}
