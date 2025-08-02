import Button from "@/components/form/Button";
import Checkbox from "@/components/form/Checkbox";
import SavedPrimersModal from "./SavedPrimersModal";
import Paper from "@/components/form/Paper";
import { useEffect, useState } from "react";
import { TcsdrsPrimers } from "@prisma/client";
import { parse } from "path";

const USE_SAVED_PRIMERS_KEY = "primer-id-use-saved-primers";
export const STORAGE_SAVED_PRIMERS_KEY = "primer-id-saved-primers";

export default function SavedPrimers() {
  const [modalOpen, setModalOpen] = useState(false);
  const [useSaved, setUseSaved] = useState(false);
  const [savedPrimers, setSavedPrimers] = useState<TcsdrsPrimers[]>([]);

  const isValidPrimers = (p: TcsdrsPrimers[]) => {
    const isArray = Array.isArray(p);
    const hasRequiredFields = p.every((x) => x.region && x.forward && x.cdna);
    return isArray && hasRequiredFields;
  };

  useEffect(() => {
    const localUseSaved = localStorage.getItem(USE_SAVED_PRIMERS_KEY);
    const localPrimers = localStorage.getItem(STORAGE_SAVED_PRIMERS_KEY);

    if (localUseSaved !== null) {
      let parsedUseSaved: unknown;
      try {
        parsedUseSaved = JSON.parse(localUseSaved);
        setUseSaved(parsedUseSaved);
      } catch (e) {
        console.error("Failed to parse useSaved from localStorage", e);
        localStorage.removeItem(USE_SAVED_PRIMERS_KEY);
      }
    }

    if (localUseSaved === "true" && localPrimers) {
      try {
        const parsedPrimers: TcsdrsPrimers[] = JSON.parse(
          localPrimers,
        ) as TcsdrsPrimers[];
        if (isValidPrimers(parsedPrimers)) {
          setSavedPrimers(parsedPrimers);
        } else {
          alert("Invalid saved primer data.");
        }
      } catch (e) {
        console.error("Failed to parse saved primers from localStorage", e);
        localStorage.removeItem(STORAGE_SAVED_PRIMERS_KEY);
      }
    }
  }, []);

  const onChangeUseSaved = (newUseSaved: boolean) => {
    if (!newUseSaved) {
      const c = confirm("Are you sure you want to clear saved amplicons?");

      if (c) {
        setSavedPrimers([]);
        localStorage.removeItem(STORAGE_SAVED_PRIMERS_KEY);
        setUseSaved(false);
        localStorage.removeItem(USE_SAVED_PRIMERS_KEY);
      }
    } else {
      localStorage.setItem(USE_SAVED_PRIMERS_KEY, "true");
      setUseSaved(true);
    }
  };

  return (
    <Paper className="flex flex-col justify-start w-full gap-4">
      <Checkbox
        label="Save amplicons for later use on this computer.  Only use on personal computers."
        checked={useSaved}
        onChange={(v) => onChangeUseSaved(v)}
        id="useSavedPrimers"
        data-cy="useSavedPrimers"
      />
      {!useSaved ? null : savedPrimers.length > 0 ? (
        <Button
          className=" w-fit mx-auto"
          onClick={() => setModalOpen(true)}
          data-cy="openSavedPrimersModal"
        >
          View Saved Amplicons
        </Button>
      ) : (
        <div className="flex justify-start" data-cy="noSavedPrimers">
          No saved amplicons yet. They will show up after the next submission.
        </div>
      )}
      <SavedPrimersModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
        }}
        savedPrimers={savedPrimers}
        setSavedPrimers={setSavedPrimers}
        isValidPrimers={isValidPrimers}
      />
    </Paper>
  );
}
