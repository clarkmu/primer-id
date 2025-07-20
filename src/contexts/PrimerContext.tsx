import { TcsdrsPrimers } from "@prisma/client";
import INITIAL_PRIMER from "@/utils/constants/INITIAL_PRIMER";
import React, { ReactNode, useContext, useState } from "react";
import { createContext } from "react";
import { useTCS } from "./TCSContext";

type PrimerStringMap = {
  [K in keyof TcsdrsPrimers]?: string;
};

type ContextType =
  | {
      primer: TcsdrsPrimers;
      page: number;
      errors: PrimerStringMap;
      addPrimer: (primer: TcsdrsPrimers | boolean) => void;
      updatePrimer: <K extends keyof TcsdrsPrimers>(
        key: K,
        value: TcsdrsPrimers[K],
      ) => void;
      deletePrimer: (i: number) => void;
      handleNextPage: () => void;
      handleBackPage: () => void;
    }
  | undefined;

const PrimerContext = createContext<ContextType>(undefined);

export function usePrimerContext(): NonNullable<ContextType> {
  const context = useContext(PrimerContext);
  if (!context) {
    throw new Error(
      "usePrimerContext must be used within a PrimerContextProvider",
    );
  }
  return context;
}

export default function PrimerContextProvider({
  children,
  primer,
  index,
}: {
  children: ReactNode;
  primer: TcsdrsPrimers;
  index: number;
}) {
  const { state, setState, setExpandedPrimer } = useTCS();
  const { primers } = state;

  const [errors, setErrors] = useState<PrimerStringMap>({});
  const [page, setPage] = useState(1);

  const updatePrimer = <K extends keyof TcsdrsPrimers>(
    key: K,
    value: TcsdrsPrimers[K],
  ) => {
    setState((s) => ({
      ...s,
      primers: s.primers.map((p, i) =>
        i === index ? { ...p, [key]: value } : p,
      ),
    }));
  };

  const addPrimer = (primer: TcsdrsPrimers | boolean = false) => {
    setState((s) => {
      const newPrimer = primer ? (primer as TcsdrsPrimers) : INITIAL_PRIMER;
      const newPrimers = [...s.primers, newPrimer];
      setExpandedPrimer(newPrimers.length - 1);
      return { ...s, primers: newPrimers };
    });
  };

  const deletePrimer = (i: number) => {
    if (primers.length === 1) {
      setState((s) => ({ ...s, primers: [INITIAL_PRIMER] }));
    } else {
      const newPrimers = [...primers];
      newPrimers.splice(i, 1);
      setState((s) => ({ ...s, primers: newPrimers }));
    }
    setExpandedPrimer(-1);
  };

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

    let e: PrimerStringMap = {};
    if (page === 1) {
      if (!primer.region.length) {
        e.region = "Required*";
      }
      if (!primer.supermajority || NaN === parseFloat(primer.supermajority)) {
        e.supermajority = "Invalid number";
      } else if (primer.supermajority < 0.5 || primer.supermajority > 0.9) {
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
        !primer.endJoinOverlap
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
        addPrimer,
        updatePrimer,
        deletePrimer,
        handleNextPage,
        handleBackPage,
      }}
    >
      {children}
    </PrimerContext.Provider>
  );
}
