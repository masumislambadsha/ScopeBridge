"use client";

import React from "react";

type AnimatedButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  showUnderline?: boolean;
};

const CustomButton: React.FC<AnimatedButtonProps> = ({
  children,
  className = "",
  showUnderline = false,
  ...props
}) => {
  return (
    <button
      className={`relative inline-flex items-center justify-center gap-2 border-2 border-black bg-black px-4 py-3 font-black uppercase tracking-wide text-white cursor-pointer overflow-hidden group ${className}`}
      {...props}
    >
      {showUnderline && (
        <>
          <span className="pointer-events-none absolute left-8 right-8 top-2 h-px bg-white transition-transform duration-300 origin-center group-hover:scale-x-0" />
          <span className="pointer-events-none absolute left-8 right-8 bottom-2 h-px bg-white transition-transform duration-300 origin-center group-hover:scale-x-0" />
        </>
      )}

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 scale-x-0 origin-center bg-white transition-transform duration-300 group-hover:scale-x-100"
      />

      <span className="relative z-10">{children}</span>
    </button>
  );
};

export default CustomButton;
