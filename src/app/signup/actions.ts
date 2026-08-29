"use server";

import { signIn } from "@/auth";
import { createAccountWithPassword, EmailInUseError, ValidationError } from "@/lib/auth/auth-signup";

export type SignupState = { error: string | null };

export async function signupAction(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const name = formData.get("name");
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  try {
    await createAccountWithPassword({ name, email, password, confirmPassword });
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.issues[0] };
    if (error instanceof EmailInUseError) return { error: error.message };
    throw error;
  }

  // Not wrapped in try/catch: signIn's success path throws Next.js's
  // internal redirect signal by design — must propagate unhandled so the
  // framework performs the navigation, same as loginAction.
  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  return { error: null };
}
