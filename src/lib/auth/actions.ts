import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";

import { safeNextPath } from "@/lib/auth/next-path";
import { createSession, deleteSession } from "@/lib/session";

// Any non-empty (after trimming) name and password are accepted. FormData.get returns
// null for a missing field and a File for a file field; both fail z.string().
const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().trim().min(1),
});

/** Form fields: `username`, `password`, `next` (all optional strings). Always ends in redirect(). */
export async function login(formData: FormData): Promise<void> {
  "use server";

  const next = safeNextPath(formData.get("next"));
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(
      next === null
        ? "/login?error=missing"
        : "/login?" + new URLSearchParams({ error: "missing", next }).toString(),
    );
  }

  // The password is validated as non-empty and then discarded: never stored, logged or passed on.
  await createSession(parsed.data.username);
  redirect(next ?? "/");
}

/** Ends in redirect("/"). */
export async function logout(): Promise<void> {
  "use server";

  await deleteSession();
  redirect("/");
}
