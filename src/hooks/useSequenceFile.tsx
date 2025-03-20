/**
 *  Used to process uploaded sequences for
 *      Intactness and Coreceptor pages
 */

import { useMemo, useState } from "react";
import { fasta } from "bioinformatics-parser";
import InputFile from "@/components/form/InputFile";

export type BioinformaticsParserType = {
  ok?: boolean;
  result?: { id: string; seq: string; description: string }[];
  error?: { message: string };
};

const approvedFileTypesDefault = ["fasta", "fa", "fastq", "txt"];

export default function useSequenceFile(
  approvedFileTypes: String[] = approvedFileTypesDefault,
) {
  const [parseError, setParseError] = useState("");
  const [sequences, setSequences] = useState<BioinformaticsParserType>({});
  const [cumulativeSize, setCumulativeSize] = useState(0);
  const [filename, setFilename] = useState("");

  const approvedFileTypesDisplay: String[] = useMemo(
    () => approvedFileTypes.map((type) => `.${type}`).join(", "),
    [approvedFileTypes],
  );

  const handleFile = async (files: FileList) => {
    const file = Array.from(files)[0];

    setFilename("");
    setParseError("");

    if (!file) {
      setParseError("No file uploaded.");
      return;
    }

    const extension = file.name.split(".").pop();

    if (!extension || !approvedFileTypes.includes(extension)) {
      setParseError("Please use a supported file extension.");
      return;
    }

    if (["zip", ".gz"].includes(extension)) {
      setParseError("Please use uncompressed files.");
      return;
    }

    const text = await file.text();
    const parsed = fasta.parse(text);

    if (parsed?.error?.message) {
      setParseError("Error parsing sequences: " + parsed.error.message);
      return;
    }

    if (cumulativeSize + file.size > 16000000) {
      setParseError("Maximum cumulative file size of 16MB per submission.");
      return;
    }

    setCumulativeSize((c) => c + file.size);

    setSequences(parsed);
    setFilename(file.name);
  };

  const SequenceFileInput = () => (
    <InputFile onChange={handleFile} multiple={false} />
  );

  return {
    parseError,
    sequences,
    SequenceFileInput,
    filename,
    approvedFileTypes,
    approvedFileTypesDisplay,
  };
}
