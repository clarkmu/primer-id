import Button from "@/components/form/Button";
import Checkbox from "@/components/form/Checkbox";
import { useState } from "react";
import { useTCSDRContext } from "@/contexts/TCSDRContext";
import SavedPrimersModal from "./SavedPrimersModal";

export default function SavedPrimers() {
  const {
    state: { useSaved, savedPrimers },
    handleLocalPrimersCheckboxChange,
  } = useTCSDRContext();

  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col justify-start w-full gap-4">
      <Checkbox
        label="Save amplicons for later use on this computer.  Only use on personal computers."
        checked={useSaved}
        onChange={handleLocalPrimersCheckboxChange}
        id="useSavedPrimers"
      />
      {!useSaved ? null : savedPrimers.length > 0 ? (
        <Button className=" w-fit mx-auto" onClick={() => setOpen(true)}>
          View Saved Amplicons
        </Button>
      ) : (
        <div className="flex justify-start">
          No saved amplicons yet. They will show up after the next submission.
        </div>
      )}
      <SavedPrimersModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
