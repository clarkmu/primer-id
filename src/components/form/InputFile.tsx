import Button from "./Button";
import { useDropzone } from "react-dropzone";

const InputFile = ({
  onChange = () => null,
  disabled = false,
  multiple = true,
  ...inputProps
}: {
  onChange: () => void;
  disabled?: boolean;
  multiple?: boolean;
}) => {
  const { getRootProps, getInputProps, open } = useDropzone({
    // Disable click and keydown behavior
    noClick: true,
    noKeyboard: true,
    multiple,
    onDrop: onChange,
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
      <input {...getInputProps()} {...inputProps} />
      <p>
        Drag and drop {multiple ? "files and directories" : "a file"} here or
        click the button below to use selector
      </p>
      <Button disabled={disabled} onClick={open}>
        Choose Files
      </Button>
    </div>
  );
};

export default InputFile;
