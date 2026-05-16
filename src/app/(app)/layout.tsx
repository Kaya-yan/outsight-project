import { AppShell } from "@/components/layout/app-shell";
import { XiaoWaiCompanion } from "@/components/companion/xiaowai-companion";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      {children}
      <XiaoWaiCompanion />
    </AppShell>
  );
}
