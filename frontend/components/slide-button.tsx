"use client";

import React from "react";

interface SlideButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export default function SlideButton({
  children,
  onClick,
  className = "",
  disabled = false,
}: SlideButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden rounded-full border-2 border-black bg-black text-white font-black uppercase px-12 py-3 cursor-pointer disabled:cursor-default transition-all hover:shadow-lg ${className}`}
    >
      <span className="relative block overflow-hidden mix-blend-difference">
        <span className="block relative hover:animate-move-up-alternate">
          {children}
        </span>
      </span>

      <span className="absolute block h-[102%] w-full bg-white pointer-events-none top-[-104%] left-[calc(-50%-50%*0.2)] skew-x-[-30deg] transition-transform duration-200 ease-in-out hover:translate-y-full" />
      <span className="absolute block h-[102%] w-full bg-white pointer-events-none top-[102%] left-[calc(50%+50%*0.2)] skew-x-[-30deg] transition-transform duration-200 ease-in-out -z-[1] hover:-translate-y-[102%]" />
    </button>
  );
}
