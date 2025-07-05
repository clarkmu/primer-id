import Button from "./Button";
import { useDropzone } from "react-dropzone";
import { useState } from "react";

const InputFile = ({
  onChange = () => null,
  disabled = false,
  multiple = true,
  allowReuse = true,
  ...inputProps
}: {
  onChange: () => void;
  disabled?: boolean;
  multiple?: boolean;
  allowReuse?: boolean;
}) => {
  const [inputKey, setInputKey] = useState(0);

  const { getRootProps, getInputProps, open } = useDropzone({
    noClick: true,
    noKeyboard: true,
    multiple,
    onDrop: (acceptedFiles, fileRejections, event) => {
      onChange(acceptedFiles, fileRejections, event);
      if (allowReuse) {
        // Reset input so same file can be selected again
        setInputKey((prev) => prev + 1);
      }
    },
    disabled,
  });

  return (
    <div
      {...getRootProps({
        className:
          "dropzone w-full border-secondary hover:border-primary hover:cursor-pointer border-2 border-dashed flex flex-col justify-center items-center gap-4 p-4",
      })}
      data-cy="dropzone"
    >
      <input
        key={allowReuse ? inputKey : undefined}
        {...getInputProps()}
        {...inputProps}
      />
      <p>
        Drag and drop {multiple ? "files and directories" : "a file"} here or
        click the button below to use selector
      </p>
      <Button disabled={disabled} onClick={open}>
        Choose File{multiple ? "s" : ""}
      </Button>
    </div>
  );
};

export default InputFile;
