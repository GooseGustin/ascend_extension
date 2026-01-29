"use client";

import Switch from "react-switch";

interface ToggleSwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({
  checked = false,
  onCheckedChange,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <Switch
      checked={checked}
      onChange={(val) => onCheckedChange?.(val)}
      disabled={disabled}
      onColor="#57F287"
      offColor="#72767d"
      onHandleColor="#ffffff"
      offHandleColor="#ffffff"
      handleDiameter={22}
      uncheckedIcon={false}
      checkedIcon={false}
      boxShadow="0px 1px 5px rgba(0, 0, 0, 0.6)"
      activeBoxShadow="0px 0px 1px 10px rgba(87, 242, 135, 0.2)"
      height={28}
      width={50}
    />
  );
}

export { ToggleSwitch };
