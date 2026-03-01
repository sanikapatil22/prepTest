import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap,
  ClipboardList,
  BarChart3,
  Shield,
  Clock,
  CheckCircle,
  FileText,
  ArrowRight,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <FileText className="size-6 text-primary" />
            <span className="text-xl font-bold">PrepZero</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register/student">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center py-20 md:py-32 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-balance">
            College Placement Tests,{" "}
            <span className="text-primary">Simplified</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            PrepZero helps colleges create, manage, and conduct placement drives
            with automated MCQ assessments and instant grading.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/register/student">
                Register as Student
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/register">Register as College Admin</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/50 px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything you need for placement drives
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: ClipboardList,
                title: "Create Tests Easily",
                desc: "Build MCQ tests with single and multi-select questions, set time limits, and manage marks.",
              },
              {
                icon: Clock,
                title: "Timed Assessments",
                desc: "Server-side timers ensure fair testing. Auto-submit prevents overtime. Auto-save prevents data loss.",
              },
              {
                icon: BarChart3,
                title: "Instant Results",
                desc: "Automatic grading with detailed score breakdowns. College admins see all results in one view.",
              },
              {
                icon: GraduationCap,
                title: "Student Portal",
                desc: "Students register with a college code, browse drives, take tests, and view their results.",
              },
              {
                icon: Shield,
                title: "Role-Based Access",
                desc: "Three distinct roles — Super Admin, College Admin, and Student — each with scoped access.",
              },
              {
                icon: CheckCircle,
                title: "Drive Management",
                desc: "Organize tests under placement drives. Track company-wise assessment history.",
              },
            ].map((feature) => (
              <Card key={feature.title}>
                <CardContent className="pt-6">
                  <feature.icon className="h-10 w-10 text-primary mb-4" />
                  <h3 className="font-semibold text-lg mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground mb-8">
            Register your college or join as a student to start preparing for
            placements.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/register/student">Student Registration</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/register">College Admin Registration</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>PrepZero — College Placement Test Platform</p>
        </div>
      </footer>
    </div>
  );
}
