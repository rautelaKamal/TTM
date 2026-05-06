import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";

export async function serverFetch<T>(path: string): Promise<T> {
  const session = await getServerSession(authOptions);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const res = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: session?.apiToken
        ? `Bearer ${session.apiToken}`
        : "",
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }

  return res.json();
}
