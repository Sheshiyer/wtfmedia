"use client";

type DatePickerProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const field =
  "min-h-11 rounded-control border-2 border-foreground bg-canvas px-3 font-body text-body tabular-nums";

export function DatePicker({ id, label, value, onChange, disabled }: DatePickerProps) {
  return (
    <label className="grid min-w-[10rem] flex-1 gap-1" htmlFor={id}>
      <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">
        {label}
      </span>
      <input
        id={id}
        type="date"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={field}
      />
    </label>
  );
}
