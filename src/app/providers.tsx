"use client";

import { SessionProvider } from "next-auth/react";
import { DataProvider } from "@/lib/DataContext";
import { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <DataProvider>{children}</DataProvider>
    </SessionProvider>
  );
}
