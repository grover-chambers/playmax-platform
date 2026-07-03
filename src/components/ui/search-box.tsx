"use client";

import React, { useState } from "react";

interface SearchBoxProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

function SearchBox({
  placeholder = "Search…",
  value: controlledValue,
  onChange,
  className = "",
}: SearchBoxProps) {
  const [internalValue, setInternalValue] = useState("");
  const value = controlledValue ?? internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    if (controlledValue === undefined) setInternalValue(newVal);
    onChange?.(newVal);
  };

  return (
    <div className={`search-box ${className}`}>
      <svg
        className="w-3.5 h-3.5 text-gray-5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
      />
    </div>
  );
}

export default SearchBox;
