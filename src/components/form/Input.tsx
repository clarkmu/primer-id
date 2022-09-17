import { ReactNode } from "react";
import Tooltip from "./Tooltip";

export default function Input({
  label,
  error = "",
  type = "text",
  disabled = false,
  tooltip = "",
  textArea = false,
  ...props
}: {
  label: string;
  error?: string;
  type: string;
  disabled?: boolean;
  tooltip?: string | ReactNode;
  textArea?: boolean;
}) {
  const inputClassName =
    "w-full bg-transparent border-0 border-b-2 appearance-none focus:outline-none focus:ring-0 focus:border-black dark:focus:border-white " +
    (disabled ? " cursor-not-allowed border-gray-500" : "border-gray-200");

  return (
    <div className="z-0 w-full relative flex flex-col items-start justify-start">
      <label
        className={
          ""
          // "absolute duration-300 top-3 -z-1 origin-0 " +
          // disabled ? "text-gray-500" : "text-gray-600 dark:text-gray-100"
        }
      >
        {label}
      </label>
      {textArea ? (
        <textarea {...props} disabled={disabled} className={inputClassName} />
      ) : (
        <input
          {...props}
          disabled={disabled}
          type={type}
          className={inputClassName}
        />
      )}
      {tooltip && (
        <div className="absolute right-2 bottom-1">
          <Tooltip tooltip={tooltip} />
        </div>
      )}
      {error && (
        <span className="text-sm text-red absolute bottom-0 translate-y-[110%] left-0">
          {error}
        </span>
      )}
    </div>
  );
}
