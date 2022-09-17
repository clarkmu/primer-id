import { PrimerInterface } from "@/models/TCSDR";
import INITIAL_PRIMER from "@/utils/constants/INITIAL_PRIMER";
import React, {
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
} from "react";
import { createContext } from "react";
import { useTCSDRContext } from "./TCSDRContext";

type ContextType = {
  primer: PrimerInterface;
  page: number;
  errors: object;
  setErrors: Dispatch<SetStateAction<object>>;
  addPrimer: (priemr: PrimerInterface | boolean) => void;
  updatePrimer: (key: string, value: any) => void;
  deletePrimer: (i: number) => void;
  finish: () => void;
  handleNextPage: () => void;
  handleBackPage: () => void;
};

const PrimerContext = createContext<ContextType>({
  primer: INITIAL_PRIMER,
  page: 1,
  errors: {},
  setErrors: () => null,
  addPrimer: () => null,
  updatePrimer: () => null,
  deletePrimer: () => null,
  finish: () => null,
  handleNextPage: () => null,
  handleBackPage: () => null,
});

export function usePrimerContext(): ContextType {
  return useContext(PrimerContext);
}

export default function PrimerContextProvider({
  children,
  primer,
  index,
  finish,
}: {
  children: ReactNode;
  primer: PrimerInterface;
  index: number;
  finish: () => void;
}) {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [page, setPage] = useState(1);

  const {
    addPrimer,
    updatePrimer: updateParentPrimer,
    deletePrimer: deleteParentPrimer,
  } = useTCSDRContext();

  const updatePrimer = (key, value) => updateParentPrimer(key, value, index);

  const deletePrimer = () => deleteParentPrimer(index);

  const handleNextPage = () => {
    const e = validatePrimer();

    setErrors(e);

    if (Object.keys(e).length === 0) {
      if (page === 2 && !primer.endJoin) {
        setPage(5);
      } else if (page === 3 && !primer.qc) {
        setPage(5);
      } else {
        setPage((p) => p + 1);
      }
    }
  };

  const handleBackPage = () => {
    if (page === 5 && !primer.endJoin) {
      setPage(2);
    } else if (page === 5 && !primer.qc) {
      setPage(3);
    } else {
      setPage((p) => p - 1);
    }
  };

  const validatePrimer = () => {
    const validInt = function (i) {
      return !!(parseInt(i) || parseInt(i) === 0);
    };
    const refRange = function (i) {
      i = parseInt(i);
      return i >= 0 && i <= 10000;
    };

    let e = {};
    if (page === 1) {
      if (!primer.region.length) {
        e.region = "Required*";
      }
      if (!primer.supermajority || NaN === parseFloat(primer.supermajority)) {
        e.supermajority = "Invalid number";
      } else if (primer.majority < 0.5 || primer.supermajority > 0.9) {
        e.supermajority = "Valid range is 0.5 to 0.9";
      }
      if (!primer.forward.length) {
        e.forward = "Required*";
      }
      if (!primer.cdna.length) {
        e.cdna = "Required*";
      } else if (primer.cdna.indexOf("NNNNNNNN") === -1) {
        e.cdna = "Primer ID not located, check the primer.";
      }
    } else if (page === 2) {
      if (primer.endJoin && !primer.endJoinOption) {
        e.endJoinOption = "Required*";
      } else if (
        primer.endJoin &&
        primer.endJoinOption === 2 &&
        !primer.endJoinOverlap.length
      ) {
        e.endJoinOverlap = "Required*";
      }
    } else if (page === 3) {
      if (primer.qc) {
        if (!primer.refGenome?.length) {
          e.refGenome = "Please choose a reference genome.";
        }
        if (!validInt(primer.refStart)) {
          e.refStart = "Invalid number.";
        } else if (!refRange(primer.refStart)) {
          e.refStart = "Valid range is between 0 and 10,000.";
        }
        if (!validInt(primer.refEnd)) {
          e.refStart = "Invalid number.";
        } else if (!refRange(primer.refEnd)) {
          e.refStart = "Valid range is between 0 and 10,000.";
        }
      }
    } else if (page === 4) {
      if (primer.trim) {
        if (!primer.trimGenome?.length) {
          e.trimGenome = "Please choose a reference genome.";
        }
        if (!validInt(primer.trimStart)) {
          e.trimStart = "Invalid number.";
        } else if (!refRange(primer.trimStart)) {
          e.trimStart = "Valid range is between 0 and 10,000.";
        }
        if (!validInt(primer.trimEnd)) {
          e.trimStart = "Invalid number.";
        } else if (!refRange(primer.trimEnd)) {
          e.trimStart = "Valid range is between 0 and 10,000.";
        }
      }
    }

    return e;
  };

  return (
    <PrimerContext.Provider
      value={{
        primer,
        page,
        errors,
        setErrors,
        addPrimer,
        updatePrimer,
        deletePrimer,
        finish,
        handleNextPage,
        handleBackPage,
      }}
    >
      {children}
    </PrimerContext.Provider>
  );
}
