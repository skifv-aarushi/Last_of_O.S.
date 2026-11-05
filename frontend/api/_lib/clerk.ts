import { createClerkClient, verifyToken } from "@clerk/backend";

export interface ClerkIdentity {
  email: string;
  name: string;
}

/** Verifies a Clerk session token and returns the user's verified primary email and name. */
async function verify(token: string): Promise<ClerkIdentity> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is not set");
  const claims = await verifyToken(token, { secretKey });
  const user = await createClerkClient({ secretKey }).users.getUser(claims.sub);
  const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
  if (!primary || primary.verification?.status !== "verified") throw new Error("Email address is not verified");
  return {
    email: primary.emailAddress.toLowerCase(),
    name: [user.firstName, user.lastName].filter(Boolean).join(" "),
  };
}

// indirection so the API tests can stub out the network call to Clerk
export const clerkImpl = { verify };
