import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Building2, Globe, Mail, Phone, MapPin, Hash } from "lucide-react";
import { CollegeProfileSection } from "./profile-section";

export default async function CollegeSettingsPage() {
  const session = await getSession();

  if (!session) redirect("/login");

  const user = session.user as {
    id: string;
    role: string;
    collegeId: string;
  };

  const college = await prisma.college.findUnique({
    where: { id: user.collegeId },
  });

  if (!college) {
    redirect("/college");
  }

  const infoItems = [
    {
      label: "College Name",
      value: college.name,
      icon: Building2,
    },
    {
      label: "College Code",
      value: college.code,
      icon: Hash,
    },
    {
      label: "Address",
      value: college.address || "Not provided",
      icon: MapPin,
    },
    {
      label: "Website",
      value: college.website || "Not provided",
      icon: Globe,
      isLink: !!college.website,
    },
    {
      label: "Contact Email",
      value: college.contactEmail || "Not provided",
      icon: Mail,
    },
    {
      label: "Contact Phone",
      value: college.contactPhone || "Not provided",
      icon: Phone,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">College Settings</h1>
        <p className="text-muted-foreground">
          View your college information and manage your account.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>College Information</CardTitle>
          <CardDescription>
            These details are managed by the platform administrator. If you need
            to update any information, please contact the super admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {infoItems.map((item, index) => (
            <div key={item.label}>
              {index > 0 && <Separator className="mb-4" />}
              <div className="flex items-start gap-3">
                <item.icon className="mt-0.5 size-5 text-muted-foreground" />
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">
                    {item.label}
                  </Label>
                  {item.isLink ? (
                    <p className="text-sm font-medium">
                      <a
                        href={item.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {item.value}
                      </a>
                    </p>
                  ) : (
                    <p className="text-sm font-medium">{item.value}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <CollegeProfileSection />
    </div>
  );
}
