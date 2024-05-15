import React, {
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { createContext } from "react";
import axios from "axios";
import { INITIAL_TCSDR, tcsdrType } from "@/utils/constants/INITIAL_TCSDR";
import INITIAL_PRIMER from "@/utils/constants/INITIAL_PRIMER";
import { variablesToViralSeqCLI } from "@/utils/translateVariablesForCLI";
import { useRouter } from "next/router";
import { PrimerInterface } from "@/models/TCSDR";

const USE_SAVED_PRIMERS_KEY = "primer-id-use-saved-primers";
const STORAGE_SAVED_PRIMERS_KEY = "primer-id-saved-primers";

export enum UPLOAD_PROCEDURES {
  HTSF = "HTSF",
  UPLOAD = "Upload",
  DROPBOX = "DropBox",
}

type ContextType = {
  state: tcsdrType;
  setState: Dispatch<SetStateAction<tcsdrType>>;
  editState: (edit: object) => void;
  editPipeline: (edit: object) => void;
  handleChange: () => void;
  addPrimer: () => void;
  deletePrimer: (index: number) => void;
  deletePrimerByRegion: (region: string) => void;
  updatePrimer: (key: string, value: any, index: number) => void;
  downloadJSON: () => void;
  submitTCSDR: () => void;
  validateFileNames: () => void;
  handleLocalPrimersCheckboxChange: (checked: boolean) => void;
};

const TCSDRContext = createContext<ContextType>({
  state: INITIAL_TCSDR,
  setState: () => null,
  editState: () => null,
  editPipeline: () => null,
  handleChange: () => null,
  addPrimer: () => null,
  deletePrimer: () => null,
  deletePrimerByRegion: () => null,
  updatePrimer: () => null,
  downloadJSON: () => null,
  submitTCSDR: () => null,
  validateFileNames: () => null,
  handleLocalPrimersCheckboxChange: () => null,
});

export function useTCSDRContext(): ContextType {
  return useContext(TCSDRContext);
}

export default function TCSDRContextProvider({
  children,
  isDR,
  pipeline = "{}",
}: {
  children: ReactNode;
  isDR: boolean;
  pipeline?: any;
}) {
  const [state, setState] = useState<tcsdrType>({
    ...INITIAL_TCSDR,
    isDR,
  });

  const router = useRouter();

  const editState = (edit: object) => setState((s) => ({ ...s, ...edit }));

  const editPipeline = (edit: object) =>
    setState((s) => ({ ...s, pipeline: { ...s.pipeline, ...edit } }));

  const patchPipeline = (_id: string, patch: object) => {
    axios.patch("/api/tcsdr", { _id, patch });
  };

  useEffect(() => {
    const p = JSON.parse(pipeline);

    if (p.id) {
      if (p.primers?.length && router.pathname.indexOf("/tcs") === -1) {
        router.push(`/tcs/${p.id}`);
        return;
      }

      let uploadProcedure = UPLOAD_PROCEDURES.UPLOAD;
      if (p.htsf) {
        uploadProcedure = UPLOAD_PROCEDURES.HTSF;
      } else if (p.dropbox) {
        uploadProcedure = UPLOAD_PROCEDURES.DROPBOX;
      }

      setState((s) => ({
        ...s,
        uploadProcedure,
        showSubmit: true,
        showUploads: true,
        pipeline: { ...s.pipeline, ...p },
      }));
    } else if (!isDR) {
      addPrimer(false);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    editPipeline({ [name]: value });
  };

  const addPrimer = (primer: PrimerInterface | false) => {
    setState((s) => ({
      ...s,
      pipeline: {
        ...s.pipeline,
        primers: [...s.pipeline.primers, primer || INITIAL_PRIMER],
      },
      expandedPrimer: s.pipeline.primers.length,
    }));
  };

  const deletePrimerByRegion = (region: string) => {
    setState((s) => ({
      ...s,
      pipeline: {
        ...s.pipeline,
        primers: s.pipeline.primers.filter((p) => p.region !== region),
      },
      expandedPrimer: s.pipeline.primers.length - 2,
    }));
  };

  const updatePrimer = (key: string, value: any, index: number) => {
    setState((s) => ({
      ...s,
      pipeline: {
        ...s.pipeline,
        primers: s.pipeline.primers.map((p, i) =>
          i === index ? { ...p, [key]: value } : p
        ),
      },
    }));
  };

  const deletePrimer = (index: number) => {
    setState((s) => ({
      ...s,
      pipeline: {
        ...s.pipeline,
        primers: s.pipeline.primers.filter((p, i) => i !== index),
      },
      expandedPrimer: s.pipeline.primers.length - 2,
    }));
  };

  const downloadJSON = () => {
    if (!state.pipeline.email) {
      return "";
    }

    const data = variablesToViralSeqCLI(state);
    const output = encodeURIComponent(JSON.stringify(data, null, 2));

    return `data:text/plain;charset=utf-8,${output}`;
  };

  const initUploads = async (uploads) => {
    const promises = uploads.map(
      (upload) =>
        new Promise((resolve, reject) => {
          if (!upload) {
            resolve(true);
          }

          (async () => {
            const { signedURL } = upload;

            const file = state.files.find(
              (f) => f.file.name === upload.fileName
            );

            if (!file) {
              return;
            }

            const config = {
              onUploadProgress: (p) => {
                setState((s) => ({
                  ...s,
                  uploadedFiles: {
                    ...s.uploadedFiles,
                    [file.file.name]: parseInt((p.loaded / p.total) * 100),
                  },
                }));
              },
              headers: {
                "Content-Type": file.file.type,
                //resumable uploads too slow
                // "x-goog-resumable": "start",
              },
            };

            try {
              await axios.put(signedURL, file.file, config);
            } catch (e) {
              editState({
                submittingError: "Network error. Please try again.",
                submitting: false,
              });
              reject();
              return false;
            }

            setState((s) => ({
              ...s,
              uploadedFiles: {
                ...s.uploadedFiles,
                [file.file.name]: true,
              },
            }));

            resolve(true);
          })();
        })
    );

    await Promise.all(promises);
    // await run(promises);
  };

  // async function run(array, batch = 2) {
  //   let i = 0;
  //   while (i < array.length) {
  //     await Promise.all(array.slice(i, i + batch).map((fn) => fn()));
  //     console.log(`finished [${i} - ${i + batch}]`);
  //     i += batch;
  //   }
  // }

  const submitTCSDR = async () => {
    editState({ submitting: true, submittingError: false });

    const data = {
      ...state.pipeline,
      files: [],
      uploads: state.files.map((file) => ({
        fileName: file.file.name,
        type: file.file.type,
        poolName: file.poolName,
      })),
    };

    let res;

    try {
      res = await axios.post("/api/tcsdr", data);
    } catch (e) {
      editState({
        submittingError: "Network error. Please try again.",
        submitting: false,
      });
      return;
    }

    const { uploads } = res.data;

    if (uploads && uploads.length) {
      let uploadedFiles = {};

      uploads
        .filter((f) => !!f.signedURL)
        .forEach((file) => {
          uploadedFiles[file.fileName] = false;
        });

      editState({ uploadedFiles, submitting: true });

      await initUploads(uploads);

      editState({ submitting: false });

      patchPipeline(res.data._id, { submit: true });
    }

    editState({ submitted: true, submitting: false });

    if (!isDR && state.useSaved) {
      saveLocalPrimers();
    }
  };

  const validateFileNames = async () => {
    const fileNames = state.files.map((f) => f.file.name);
    let response;
    await axios
      .post("/api/tcsdr/validateFiles", { fileNames })
      .then((res) => {
        response = res.data;
      })
      .catch((r) => {
        response = { error: "Network error. Please try again." };
      });
    return response;
  };

  // SAVED PRIMERS

  useEffect(() => {
    const storedSavedPrimers = localStorage.getItem(USE_SAVED_PRIMERS_KEY);
    if (storedSavedPrimers && storedSavedPrimers === "true") {
      const savedPrimers =
        localStorage.getItem(STORAGE_SAVED_PRIMERS_KEY) || "[]";

      setState((s) => ({
        ...s,
        useSaved: true,
        savedPrimers: JSON.parse(savedPrimers),
      }));
    }
  }, []);

  const handleLocalPrimersCheckboxChange = (checked: boolean) => {
    localStorage.setItem(USE_SAVED_PRIMERS_KEY, checked ? "true" : "");
    setState((s) => ({ ...s, useSaved: checked }));

    // todo ? delete saved primers if prevChecked === true
  };

  const saveLocalPrimers = () => {
    if (!state.useSaved) {
      return;
    }

    const locallySaved = state.savedPrimers;

    state.pipeline.primers.forEach((p) => {
      if (locallySaved.find((sp) => sp.region === p.region) === undefined) {
        locallySaved.push(p);
      }
    });

    localStorage.setItem(
      STORAGE_SAVED_PRIMERS_KEY,
      JSON.stringify(locallySaved)
    );
  };

  // END SAVED PRIMERS

  return (
    <TCSDRContext.Provider
      value={{
        state,
        setState,
        editState,
        editPipeline,
        handleChange,
        addPrimer,
        deletePrimer,
        deletePrimerByRegion,
        updatePrimer,
        downloadJSON,
        submitTCSDR,
        validateFileNames,
        handleLocalPrimersCheckboxChange,
      }}
    >
      {children}
    </TCSDRContext.Provider>
  );
}
