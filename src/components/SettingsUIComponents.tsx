import { ReactNode, useState } from "react";
import { Checkbox as UICheckbox } from "./ui/checkbox";

/* ===== CHECKBOX ===== */
interface CheckboxProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Checkbox({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: CheckboxProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-[#2f3136] rounded border border-[#202225] hover:border-[#34373c] transition-colors">
      <UICheckbox
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="mt-1 flex-shrink-0"
      />
      <div className="flex-1">
        <label className="text-sm font-medium text-[#dcddde] block cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-[#72767d] mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}

/* ===== CONTROL GROUP ===== */
interface ControlGroupProps {
  children: ReactNode;
  spacing?: "sm" | "md" | "lg";
}

export function ControlGroup({
  children,
  spacing = "md",
}: ControlGroupProps) {
  const spacingClass =
    spacing === "sm" ? "mb-3" : spacing === "lg" ? "mb-8" : "mb-6";
  return <div className={spacingClass}>{children}</div>;
}

/* ===== LABEL & DESCRIPTION ===== */
interface LabelProps {
  label: string;
  description?: string;
}

export function ControlLabel({ label, description }: LabelProps) {
  return (
    <div className="mb-2">
      <label className="text-sm font-medium text-[#dcddde]">{label}</label>
      {description && (
        <p className="text-xs text-[#72767d] mt-0.5">{description}</p>
      )}
    </div>
  );
}

/* ===== TOGGLE SWITCH ===== */
interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4 p-3 bg-[#2f3136] rounded border border-[#202225] hover:border-[#34373c] transition-colors">
      <div>
        <label className="text-sm font-medium text-[#dcddde] block cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-[#72767d] mt-1">{description}</p>
        )}
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`w-11 h-6 rounded-full flex items-center transition-colors flex-shrink-0 ${
          checked ? "bg-[#57F287]" : "bg-[#4f545c]"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

/* ===== TEXT INPUT ===== */
interface InputProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  badge?: string;
}

export function TextInput({
  label,
  description,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled = false,
  readOnly = false,
  badge,
}: InputProps) {
  return (
    <ControlGroup>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium uppercase text-[#b9bbbe]">
          {label}
        </label>
        {badge && (
          <span className="text-xs px-2 py-1 bg-[#5865F2] text-white rounded">
            {badge}
          </span>
        )}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || readOnly}
        readOnly={readOnly}
        className="w-full bg-[#202225] border border-[#202225] rounded px-3 py-2 text-[#dcddde] placeholder:text-[#72767d] focus:outline-none focus:border-[#5865F2] transition-colors disabled:opacity-50"
      />
      {description && (
        <p className="text-xs text-[#72767d] mt-1">{description}</p>
      )}
    </ControlGroup>
  );
}

/* ===== NUMBER INPUT ===== */
interface NumberInputProps {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}

export function NumberInput({
  label,
  description,
  value,
  onChange,
  min = 1,
  max = 999,
  suffix,
}: NumberInputProps) {
  return (
    <ControlGroup>
      <label className="text-xs font-medium uppercase text-[#b9bbbe] block mb-2">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
          min={min}
          max={max}
          className="w-24 bg-[#202225] border border-[#202225] rounded px-3 py-2 text-[#dcddde] focus:outline-none focus:border-[#5865F2] transition-colors"
        />
        {suffix && <span className="text-sm text-[#72767d]">{suffix}</span>}
      </div>
      {description && (
        <p className="text-xs text-[#72767d] mt-2">{description}</p>
      )}
    </ControlGroup>
  );
}

/* ===== DROPDOWN SELECT ===== */
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  description?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

export function Select({
  label,
  description,
  value,
  options,
  onChange,
}: SelectProps) {
  return (
    <ControlGroup>
      <label className="text-xs font-medium uppercase text-[#b9bbbe] block mb-2">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#202225] border border-[#202225] rounded px-3 py-2 text-[#dcddde] focus:outline-none focus:border-[#5865F2] transition-colors cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#2f3136]">
            {opt.label}
          </option>
        ))}
      </select>
      {description && (
        <p className="text-xs text-[#72767d] mt-2">{description}</p>
      )}
    </ControlGroup>
  );
}

/* ===== RADIO GROUP ===== */
interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioGroupProps {
  label: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
}

export function RadioGroup({
  label,
  options,
  value,
  onChange,
}: RadioGroupProps) {
  return (
    <ControlGroup spacing="lg">
      <label className="text-xs font-medium uppercase text-[#b9bbbe] block mb-3">
        {label}
      </label>
      <div className="space-y-2">
        {options.map((option) => (
          <div
            key={option.value}
            className="flex items-center gap-3 p-3 bg-[#2f3136] rounded border border-[#202225] hover:border-[#34373c] cursor-pointer transition-colors"
            onClick={() => onChange(option.value)}
          >
            <div className="flex items-center">
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                  value === option.value
                    ? "border-[#5865F2] bg-[#5865F2]"
                    : "border-[#72767d]"
                }`}
              >
                {value === option.value && (
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#dcddde]">
                {option.label}
              </p>
              {option.description && (
                <p className="text-xs text-[#72767d]">{option.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </ControlGroup>
  );
}

/* ===== BUTTON ===== */
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  description?: string;
}

export function SettingsButton({
  label,
  onClick,
  variant = "primary",
  disabled = false,
  description,
}: ButtonProps) {
  const baseClass =
    "px-10 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClass =
    variant === "danger"
      ? "bg-[#ED4245] text-white hover:bg-[#c03537]"
      : variant === "secondary"
        ? "bg-[#4f545c] text-[#dcddde] hover:bg-[#5d6269]"
        : "bg-[#5865F2] text-white hover:bg-[#4752C4]";

  return (
    <div>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${baseClass} ${variantClass}`}
      >
        {label}
      </button>
      {description && (
        <p className="text-xs text-[#72767d] mt-2">{description}</p>
      )}
    </div>
  );
}

/* ===== SECTION HEADER ===== */
interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export function SectionHeader({
  icon,
  title,
  description,
}: SectionHeaderProps) {
  return (
    <div className="flex items-start gap-3 mb-8 pb-8 border-b border-[#202225]">
      <div className="text-[#5865F2] flex-shrink-0 mt-1">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-sm text-[#72767d]">{description}</p>
        </div>
      </div>
    </div>
  );
}

/* ===== COLOR SWATCH ===== */
interface ColorSwatchProps {
  color: string;
  label: string;
  isSelected: boolean;
  onSelect: () => void;
}

export function ColorSwatch({
  color,
  label,
  isSelected,
  onSelect,
}: ColorSwatchProps) {
  return (
    <button
      onClick={onSelect}
      className={`flex flex-col items-center gap-2 p-3 rounded transition-all ${
        isSelected ? "ring-2 ring-[#5865F2]" : "hover:opacity-80"
      }`}
    >
      <div
        className="w-12 h-12 rounded-lg"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-[#dcddde]">{label}</span>
    </button>
  );
}

/* ===== EXPANDABLE SECTION ===== */
interface ExpandableSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function ExpandableSection({
  title,
  children,
  defaultOpen = false,
}: ExpandableSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-[#2f3136] rounded border border-[#202225]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#34373c] transition-colors"
      >
        <span className="text-sm font-medium text-[#dcddde]">{title}</span>
        <div
          className={`text-[#72767d] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          ▼
        </div>
      </button>
      {isOpen && <div className="px-4 py-3 border-t border-[#202225]">{children}</div>}
    </div>
  );
}
