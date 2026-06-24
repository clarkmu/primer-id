type SliderProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (newValue: number) => void;
  minLabel?: string;
  maxLabel?: string;
  tooltip?: string;
  dataCy?: string;
  showValueBadge?: boolean;
};

export default function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  minLabel,
  maxLabel,
  tooltip,
  dataCy,
  showValueBadge = false,
}: SliderProps) {
  return (
    <div className="w-full flex flex-col gap-3 px-4">
      <div className="flex items-center justify-between w-full">
        <label className="font-lg text-lg">{label}</label>
        {showValueBadge ? (
          <span className="inline-flex items-center justify-center rounded-full bg-primary px-3 py-1 text-sm font-medium text-white">
            {value.toFixed(2)}
          </span>
        ) : (
          <span className="font-medium text-sm text-gray-700">
            {value.toFixed(2)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 w-full">
        <span className="text-sm text-gray-500">{minLabel ?? min}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(parseFloat(event.target.value))}
          className="w-full accent-primary"
          data-cy={dataCy}
        />
        <span className="text-sm text-gray-500">{maxLabel ?? max}</span>
      </div>
      {tooltip ? <div className="text-xs text-gray-500">{tooltip}</div> : null}
    </div>
  );
}
