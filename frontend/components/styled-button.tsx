"use client";

import React from "react";

interface StyledButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
}

const StyledButton: React.FC<StyledButtonProps> = ({
  children,
  onClick,
  className,
  type = "button",
}) => {
  return (
    <div className={className}>
      <button className="btn-17" onClick={onClick} type={type}>
        <span className="text-container">
          <span className="text">{children}</span>
        </span>
      </button>
    </div>
  );
};

export default StyledButton;
