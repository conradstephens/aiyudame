"use client";

import * as React from "react";
import { Provider } from "jotai";

interface ComponentProps {
  children: React.ReactNode;
}

export function JotaiProvider({ children }: ComponentProps) {
  return <Provider>{children}</Provider>;
}
