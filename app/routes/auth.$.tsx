import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { login } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await login(request);
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  // After login completes, go to the app dashboard
  throw redirect(shop ? `/app?shop=${shop}` : "/app");
};
