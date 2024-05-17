import Alert from "@/components/form/Alert";
import Button from "@/components/form/Button";
import Input from "@/components/form/Input";
import InputFile from "@/components/form/InputFile";
import { useState } from "react";
import Confirmation from "@/components/intactness/Confirmation";
import RadioGroup from "@/components/form/RadioGroup";
import Paper from "@/components/form/Paper";
import useScrollToDivOnVisibilityToggle from "@/hooks/useScrollToDivOnVisibilityToggle";
import { fasta } from "bioinformatics-parser";

export type BioinformaticsParserType = {
  ok?: boolean;
  result?: { id: string; seq: string; description: string }[];
  error?: { message: string };
};

export default function IntactnessPage() {
  const [email, setEmail] = useState("");
  const [sequences, setSequences] = useState<BioinformaticsParserType>({});
  const [open, setOpen] = useState(false);
  const [parseError, setParseError] = useState("");
  const [error, setError] = useState("");
  const [jobID, setJodID] = useState("");
  const [resultsFormat, setResultsFormat] = useState<"tar" | "zip">("tar");
  const [continued, setContinued] = useState(false);
  const [filename, setFilename] = useState("");

  const [scrollToRef] = useScrollToDivOnVisibilityToggle(continued);

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
    const file = Array.from(files)[0];

    setFilename("");
    setParseError("");

    if (!file) {
      return;
    }

    if (!file.name.includes(".fasta")) {
      setParseError("Please use .fasta files.");
    }

    const text = await file.text();
    const parsed = fasta.parse(text);

    if (parsed?.error?.message) {
      setParseError(parsed.error.message);
    }

    if (parsed.result?.length > 100 || file.size > 16000000) {
      setParseError(
        "Maximum exceeded of 100 sequences or 16MB per submission."
      );
      return;
    }

    setFilename(file.name);
    setSequences(parsed);
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
          Upload a .fastq file (uncompressed)
        </div>
        <InputFile onChange={loadFiles} multiple={false} />
        {!!parseError && filename.length ? (
          <Alert severity="info" msg={parseError} />
        ) : !!sequences?.result?.length && filename.length ? (
          <div className="flex flex-col gap-2 font-bold my-2">
            <div className="">Files: {filename}</div>
            <div className="">
              {sequences?.result?.length || ""} sequences found.
            </div>
          </div>
        ) : null}
        <Button disabled={!sequences?.ok} onClick={() => setContinued(true)}>
          Continue
        </Button>
      </Paper>
      {continued && (
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
              disabled={!sequences || !email || !sequences?.ok}
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
        filename={filename}
        resultsFormat={resultsFormat}
        jobID={jobID}
      />
    </div>
  );
}
