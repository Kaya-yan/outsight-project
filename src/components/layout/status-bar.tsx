import { Breadcrumb } from "./breadcrumb";
import { UserMenu } from "./user-menu";

export function StatusBar() {
  return (
    <header className="fixed top-0 left-[var(--sidebar-width)] right-0 h-[var(--statusbar-height)] bg-white border-b border-[#E2E5E9] z-20 flex items-center justify-between px-4">
      <Breadcrumb />
      <UserMenu />
    </header>
  );
}
