import Button from "@/components/form/Button";
import { useState } from "react";

export default function useUploadsOrHTSF() {
  const [useUploads, setUseUploads] = useState(true);
  const [useHTSF, setUseHTSF] = useState(false);

  const toggle = (b: boolean) => {
    if (b !== useUploads) {
      setUseUploads(b);
      setUseHTSF(!b);
    }
  };

  // this would be a lot more useful if i could pass in Uploads and HTSF
  // without it rerendering and losing focus on Inputs
  const UploadOrHTSFButtons = () => (
    <div className="flex gap-8 mx-8">
      <Button
        fullWidth={true}
        onClick={() => toggle(true)}
        variant={useUploads ? "primary" : "outlined"}
        data-cy="useUploadsButton"
      >
        Upload
      </Button>
      <Button
        fullWidth={true}
        onClick={() => toggle(false)}
        variant={useHTSF ? "primary" : "outlined"}
        data-cy="useHTSFButton"
      >
        HTSF
      </Button>
    </div>
  );

  return { useUploads, useHTSF, UploadOrHTSFButtons };
}
