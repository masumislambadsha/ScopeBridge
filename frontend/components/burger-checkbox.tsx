"use client";

import React from "react";

interface BurgerCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const BurgerCheckbox: React.FC<BurgerCheckboxProps> = ({
  checked,
  onChange,
}) => {
  return (
    <label htmlFor="burger" className="burger">
      <input
        id="burger"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span />
      <span />
      <span />
    </label>
  );
};

export default BurgerCheckbox;
