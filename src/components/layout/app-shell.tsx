"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Sidebar } from "./sidebar";
import { StatusBar } from "./status-bar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { hydrate, cleanup, isLoading } = useAuthStore();

  useEffect(() => {
    hydrate();
    return () => cleanup();
  }, [hydrate, cleanup]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFBFC]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4A90A4] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <StatusBar />
      <main className="ml-[var(--sidebar-width)] mt-[var(--statusbar-height)] flex-1 overflow-y-auto bg-[#FAFBFC] p-6">
        {children}
      </main>
    </div>
  );
}
