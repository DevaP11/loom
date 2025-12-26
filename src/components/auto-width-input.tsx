"use client";

import React, { useRef, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface AutoWidthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string | number;
  minWidth?: number;
  maxWidth?: number;
}

export function AutoWidthInput({
  value,
  minWidth = 200,
  maxWidth = 600,
  className,
  ...props
}: AutoWidthInputProps) {
  const [width, setWidth] = useState(minWidth);
  const measureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (measureRef.current) {
      const measuredWidth = measureRef.current.offsetWidth + 40; // Add padding
      setWidth(Math.min(Math.max(measuredWidth, minWidth), maxWidth));
    }
  }, [value, minWidth, maxWidth]);

  return (
    <>
      <span
        ref={measureRef}
        className="absolute invisible whitespace-pre"
        style={{ fontSize: '14px', fontFamily: 'inherit' }}
      >
        {value}
      </span>
      <Input
        value={value}
        className={className}
        style={{ width: `${width}px` }}
        {...props}
      />
    </>
  );
}
