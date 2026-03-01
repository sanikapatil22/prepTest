import "dotenv/config";

const API_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function main() {
  const res = await fetch(`${API_URL}/api/auth/register-college-admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Nitish",
      email: "some@gmail.com",
      password: "admin12345",
      collegeCode: "DEMO2026",
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Registration failed:", data);
    process.exit(1);
  }

  console.log("Registered successfully:", data);
}

main();
