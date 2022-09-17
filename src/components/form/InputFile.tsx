import { FC, useRef } from "react";
import Button from "./Button";

const InputFile: FC<HTMLInputElement> = ({
  label = "Choose Files",
  disabled = false,
  ...props
}: {
  label?: string;
  disabled?: boolean;
}) => {
  const inputRef = useRef(null);

  return (
    <>
      <Button disabled={disabled} onClick={() => inputRef.current?.click()}>
        {label}
      </Button>
      <input ref={inputRef} type="file" {...props} className="hidden" />
    </>
  );
};

export default InputFile;
