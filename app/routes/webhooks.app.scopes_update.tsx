import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/** APP_SCOPES_UPDATE — refresh stored session scopes. */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  if (topic !== "APP_SCOPES_UPDATE") {
    return new Response("Unhandled topic", { status: 200 });
  }

  const current = payload as { current?: string[] };
  console.log(`Scopes updated for ${shop}:`, current.current);

  return new Response("OK", { status: 200 });
};
