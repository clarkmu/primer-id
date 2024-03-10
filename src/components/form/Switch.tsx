import Tooltip from "./Tooltip";

export default function Switch({
  title,
  checked,
  onChange,
  disabled = false,
  tooltip,
}: {
  title: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  tooltip?: string;
}) {
  return (
    <label
      className={
        "flex items-center cursor-pointer justify-between w-full" +
        (disabled ? " cursor-not-allowed" : "")
      }
    >
      <div className="font-medium flex gap-2">
        {title}
        {tooltip && <Tooltip tooltip={tooltip} />}
      </div>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          disabled={disabled}
          checked={!!checked}
          onChange={() => onChange(!checked)}
        />
        <div
          className={
            "w-10 h-4 rounded-full shadow-inner " +
            (disabled ? "bg-gray-100" : "bg-gray-400")
          }
        ></div>
        <div
          className={
            "absolute w-6 h-6 shadow-md shadow-red-600 rounded-full -left-1 -top-1 transition " +
            (disabled ? "bg-gray-400" : "bg-white") +
            (checked ? " translate-x-full !bg-secondary" : "")
          }
        ></div>
      </div>
    </label>
  );
}
