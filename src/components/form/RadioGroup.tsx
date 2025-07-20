import { FormEvent } from "react";
import Tooltip from "./Tooltip";

export default function RadioGroup({
  label,
  radios,
  onChange,
  value,
  error = "",
  row = false,
  showLabel = true,
  uniqueKey = "",
  ...props
}: {
  label: string;
  radios: { label: string; value: any; tooltip?: string }[];
  onChange: (e: FormEvent<HTMLInputElement>) => void;
  value: any;
  error?: string;
  row?: boolean;
  showLabel?: boolean;
  uniqueKey?: string;
}) {
  const uniqueId = `radio_${uniqueKey ? `${uniqueKey}_` : ""}`;

  return (
    <div className={`flex flex-col gap-4 w-full relative`} {...props}>
      {showLabel && <div className="font-lg text-lg">{label}</div>}
      <div
        className={`flex gap-2 ${row !== true ? "flex-col" : "justify-around"}`}
      >
        {radios.map((radio, i) => {
          const uniqueRadioId = `${uniqueId}${i}`;

          return (
            <div
              className="flex gap-2 justify-start items-center"
              key={uniqueRadioId}
            >
              <input
                type="radio"
                name={label}
                onChange={onChange}
                value={radio.value}
                data-cy={uniqueRadioId}
                checked={value === radio.value}
                id={uniqueRadioId}
                className=" bg-primary cursor-pointer"
              />
              <label className="cursor-pointer" htmlFor={uniqueRadioId}>
                {radio.label}
              </label>
              {radio.tooltip && <Tooltip tooltip={radio.tooltip} />}
            </div>
          );
        })}
      </div>
      {error && (
        <div className="font-sm text-red absolute bottom-0 translate-y-[110%] left-0">
          {error}
        </div>
      )}
    </div>
  );
}
