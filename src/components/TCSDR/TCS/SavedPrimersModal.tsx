import Button from "@/components/form/Button";
import Modal from "@/components/form/Modal";
import { useEffect, useState } from "react";
import { useTCS } from "@/contexts/TCSContext";
import { TcsdrsPrimers } from "@prisma/client";
import { STORAGE_SAVED_PRIMERS_KEY } from "./SavedPrimers";

export default function SavedPrimersModal({
  open,
  onClose,
  savedPrimers,
  setSavedPrimers,
  isValidPrimers,
}: {
  open: boolean;
  onClose: () => void;
  savedPrimers: TcsdrsPrimers[];
  setSavedPrimers: (p: TcsdrsPrimers[]) => void;
  isValidPrimers: (p: TcsdrsPrimers[]) => boolean;
}) {
  const {
    state: { primers },
    setState,
    setExpandedPrimer,
    stepForward,
  } = useTCS();

  const [primersToUse, setPrimersToUse] = useState<TcsdrsPrimers[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  useEffect(() => {
    if (confirmDelete) {
      setTimeout(() => {
        if (confirmDelete) {
          setConfirmDelete(false);
        }
      }, 3000);
    }
  }, [confirmDelete]);

  const addPrimersToSubmission = () => {
    setState((s) => ({
      ...s,
      primers:
        primers.length === 1 ? primersToUse : [...primers, ...primersToUse],
    }));

    setExpandedPrimer(-1);
    onClose();
  };

  const onCloseModal = () => {
    setPrimersToUse([]);
    stepForward();
    setConfirmDelete(false);
    onClose();
  };

  const saveLocalPrimers = (p: TcsdrsPrimers[]) => {
    if (!isValidPrimers(p)) {
      alert("Failed to save local primers. Invalid format.");
    } else {
      localStorage.setItem(
        STORAGE_SAVED_PRIMERS_KEY,
        JSON.stringify(p || savedPrimers),
      );
    }
  };

  const toggleSelected = (primer: TcsdrsPrimers) =>
    setPrimersToUse((p) =>
      p.some((x) => x.region === primer.region)
        ? p.filter((x) => x.region !== primer.region)
        : [...p, primer],
    );

  const deleteSelected = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
    } else {
      const newPrimers = savedPrimers.filter((p) => !primersToUse.includes(p));
      setSavedPrimers(newPrimers);
      saveLocalPrimers(newPrimers);
      setPrimersToUse([]);
      setConfirmDelete(false);
    }
  };

  return (
    <Modal open={open} onClose={onCloseModal} data-cy="primers_modal">
      <div className="flex flex-col gap-8 m-8">
        <div className="flex justify-end gap-2 items-center">
          <span
            className=" underline"
            data-cy="deleteSavedPrimerConfirmationMessage"
          >
            {confirmDelete ? "Click again to confirm delete." : ""}
          </span>
          <Button
            disabled={primersToUse.length < 1}
            onClick={deleteSelected}
            className="!bg-amber-800"
            data-cy="deletedSavedPrimers"
          >
            Delete Selected Amplicons
          </Button>
        </div>
        <div className="font-lg font-bold underline self-start">
          Available Amplicons
        </div>
        <div className="max-h-[50vh] overflow-y-auto flex justify-around flex-wrap">
          {savedPrimers.map((primer, i) => (
            <Button
              key={`saved_primer_${i}_${primer.region}`}
              // disabled={primersToUse.includes(primer)}
              onClick={() => toggleSelected(primer)}
              variant={primersToUse.includes(primer) ? "primary" : "outlined"}
              data-cy={`saved_primer_${i}_${primer.region}`}
            >
              {primer.region || "Unnamed"}
            </Button>
          ))}
        </div>
        <div className="self-start" data-cy="usingPrimersList">
          <span className="">
            <span className="font-lg font-bold underline mr-2">
              Using the following amplicons:
            </span>
            {primersToUse.map((p) => p.region).join(", ")}
          </span>
        </div>
        <div className="flex justify-around">
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={addPrimersToSubmission}>
            Add Amplicons to Submission
          </Button>
        </div>
      </div>
    </Modal>
  );
}
