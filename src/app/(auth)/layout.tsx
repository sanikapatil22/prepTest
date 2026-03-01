import { GraduationCap, CheckCircle2 } from "lucide-react";

const features = [
  "Proctored test environments",
  "Multi-language code execution",
  "Automated scoring & analytics",
  "Bulk student management",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh grid lg:grid-cols-2">
      {/* Brand panel — visible only on large screens */}
      <div className="hidden lg:flex flex-col bg-primary text-primary-foreground p-10 relative overflow-hidden">
        {/* Decorative radial glow */}
        <div className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 size-64 rounded-full bg-white/5 blur-2xl" />

        <div className="relative flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur-sm">
              <GraduationCap className="size-5" aria-hidden="true" />
            </div>
            <span className="text-xl font-bold tracking-tight">PrepZero</span>
          </div>

          {/* Headline + features */}
          <div className="flex flex-1 flex-col justify-center">
            <h2 className="text-3xl font-bold leading-snug mb-3">
              Campus Placement,{" "}
              <span className="opacity-75">Simplified.</span>
            </h2>
            <p className="mb-8 text-sm text-primary-foreground/70 leading-relaxed">
              Streamline your placement process with AI-powered assessments,
              real-time proctoring, and detailed analytics.
            </p>
            <ul className="space-y-3">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm">
                  <CheckCircle2
                    className="size-4 shrink-0 text-primary-foreground/70"
                    aria-hidden="true"
                  />
                  <span className="text-primary-foreground/85">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-primary-foreground/40">
            © {new Date().getFullYear()} PrepZero. All rights reserved.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center bg-background px-6 py-12 sm:px-12">
        {/* Mobile logo */}
        <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-5" aria-hidden="true" />
          </div>
          <span className="text-xl font-bold tracking-tight">PrepZero</span>
        </div>

        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
