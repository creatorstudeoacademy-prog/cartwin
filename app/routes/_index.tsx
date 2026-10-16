import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  // Preserve shop/host params when redirecting to /app
  const params = new URLSearchParams();
  for (const [key, value] of url.searchParams) {
    params.set(key, value);
  }
  // Ensure we have a valid session, then go to the dashboard
  await authenticate.admin(request);
  return redirect(`/app?${params.toString()}`);
};
