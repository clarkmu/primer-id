import { INITIAL_OGV, ogvType } from "@/utils/constants/INITIAL_OGV";
import axios from "axios";
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";

type OGVContextType = {
  state: ogvType;
  setState: Dispatch<SetStateAction<ogvType>>;
  addFiles: (files: File[]) => string;
  removeFile: (filename: string) => void;
  filesByLib: () => object;
  submitOGV: () => Promise<string>;
  isMissingStart2ART: () => boolean;
};

export const OGVContext = createContext<OGVContextType>({
  state: INITIAL_OGV,
  setState: () => null,
  addFiles: (files: File[]) => "",
  removeFile: (filename: string) => {},
  filesByLib: () => ({}),
  submitOGV: () => Promise.resolve(""),
  isMissingStart2ART: () => true,
});

export function useOGVContext(): OGVContextType {
  return useContext(OGVContext);
}

function whitelistCharsInFilenames(file) {
  const filteredName = file.name
    .replace(/-/gi, "_")
    .replace(/[^a-zA-Z0-9_.]/g, "");

  if (filteredName === file.name) {
    return file;
  }

  return new File([file], filteredName, {
    name: filteredName,
    ...file,
  });
}

export default function OGVContextProvider({
  children,
  pipeline = "{}",
}: {
  children: ReactNode;
  pipeline: any;
}): JSX.Element {
  const [state, setState] = useState<ogvType>(INITIAL_OGV);

  useEffect(() => {
    const p = JSON.parse(pipeline);

    if (p.id) {
      setState((s) => ({
        ...s,
        ...JSON.parse(pipeline),
        showConversion: true,
        showSubmit: true,
      }));
    }
  }, []);

  const addFiles = async (files: File[]) => {
    // return isError

    if (!files?.length) {
      return "No files selected.";
    }

    const newFiles = Array.from(files)
      .filter(
        (f) =>
          f.name.indexOf(".fast") !== -1 &&
          !state.files.find((fi) => fi.name === f.name)?.name,
      )
      .map((f) => whitelistCharsInFilenames(f));

    if (newFiles.length < 1) {
      return "No files selected (removed duplicates and only allow .fasta)";
    }

    if (newFiles.filter((f) => f.name.indexOf("_") === -1).length > 0) {
      return "Please name files as {subject}_{sample}.fasta";
    }

    setState((s) => ({ ...s, files: [...s.files, ...newFiles] }));

    return "";
  };

  const removeFile = (fileName: string) =>
    setState((s) => ({
      ...s,
      files: s.files.filter((fi) => fi.name !== fileName),
    }));

  const filesByLib = () =>
    state.files.reduce((acc, file) => {
      // const lib = state.uploads.find((u) => u.fileName === file.name)?.libName;
      const lib = file.name.split("_")[0];

      return {
        ...acc,
        [lib]: [...(acc[lib] || []), file.name],
      };
    }, {});

  const submitOGV = async () => {
    const { files, ...body } = state;

    let data;

    try {
      data = await (
        await fetch("/api/ogv", {
          method: "POST",
          body: JSON.stringify(body),
        })
      ).json();
    } catch (e) {
      console.log(e);
      return "Database error. Check connection and try again.";
    }

    try {
      const { signedURLs } = data;

      for (const signedURL of signedURLs) {
        const file = files.find((f) => f.name === signedURL.name);

        const config = {
          onUploadProgress: (p) => {
            setState((s) => ({
              ...s,
              uploads: s.uploads.map((u) =>
                u.name === signedURL.name
                  ? { ...u, progress: parseInt((p.loaded / p.total) * 100) }
                  : u,
              ),
            }));
          },
          headers: {
            "Content-Type": file?.type || "",
            // "x-goog-resumable": "start",
          },
        };

        await axios.put(signedURL.signedURL, file, config);
      }

      await axios.delete(`/api/ogv/submit/${data.id}`);
    } catch (e) {
      console.log(e);
      return "File upload error. Please try again later.";
    }

    return "";
  };

  const isMissingStart2ART = () =>
    !!(
      Object.keys(state.conversion).length !==
        Object.keys(filesByLib()).length ||
      Object.keys(
        //make an object of conversions with empty strings
        Object.fromEntries(
          Object.entries(state.conversion).filter(([key, value]) => !value),
        ),
      ).length
    );

  return (
    <OGVContext.Provider
      value={{
        state,
        setState,
        addFiles,
        removeFile,
        filesByLib,
        submitOGV,
        isMissingStart2ART,
      }}
    >
      {children}
    </OGVContext.Provider>
  );
}
