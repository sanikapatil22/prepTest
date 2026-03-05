import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  return (
    <div className="min-h-screen">
      {/* Full-width header sits above everything */}
      <Topbar user={user} />
      {/* Sidebar starts below the header */}
      <Sidebar role={user.role} />
      {/* Content offset for sidebar + header */}
      <div className="md:pl-64 pt-16 min-h-screen">
        <main className="p-6 md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
