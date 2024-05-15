import Button from "@/components/form/Button";
import Modal from "@/components/form/Modal";
import { useEffect, useState } from "react";
import { useTCSDRContext } from "@/contexts/TCSDRContext";

export default function SavedPrimersModal({ open, onClose }) {
  const {
    state: { primers, savedPrimers },
    setState,
    addPrimer,
  } = useTCSDRContext();

  const [primersToUse, setPrimersToUse] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const addPrimersToSubmission = () => {
    if (primers.length === 1) {
      setState((s) => ({
        ...s,
        pipeline: { ...s.pipeline, primers: primersToUse },
      }));
    } else {
      primersToUse.forEach((primer) => {
        addPrimer(primer);
      });
    }
    setState((s) => ({ ...s, showUploads: true, expandedPrimer: -1 }));
    onClose();
  };

  useEffect(() => {
    if (!open) {
      setPrimersToUse([]);
    }
  }, [open]);

  useEffect(() => {
    if (confirmDelete) {
      setTimeout(() => {
        if (confirmDelete) {
          setConfirmDelete(false);
        }
      }, 3000);
    }
  }, [confirmDelete]);

  const deleteSelected = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
    } else {
      setState((s) => ({
        ...s,
        savedPrimers: s.savedPrimers.filter((p) => !primersToUse.includes(p)),
      }));
      setPrimersToUse([]);
      setConfirmDelete(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col gap-8 m-8">
        <div className="flex justify-end gap-2 items-center">
          <span className=" underline">
            {confirmDelete ? "Click again to confirm delete." : ""}
          </span>
          <Button
            disabled={primersToUse.length < 1}
            onClick={deleteSelected}
            className="!bg-amber-800"
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
              key={`saved_primer_${primer.region}`}
              // disabled={primersToUse.includes(primer)}
              onClick={() =>
                setPrimersToUse((p) =>
                  p.includes(primer)
                    ? p.filter((pr) => pr.region !== primer.region)
                    : [...p, primer]
                )
              }
              variant={primersToUse.includes(primer) ? "primary" : "outlined"}
            >
              {primer.region}
            </Button>
          ))}
        </div>
        <div className="self-start">
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
