import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * APP_UNINSTALLED — clean up the shop's data when the app is removed.
 * shop/redact (GDPR) arrives ~48h later as the final sweep.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  if (topic !== "APP_UNINSTALLED") {
    return new Response("Unhandled topic", { status: 200 });
  }

  console.log(`App uninstalled for ${shop}, cleaning up settings`);
  await prisma.popupSettings.deleteMany({ where: { shop } });
  await prisma.session.deleteMany({ where: { shop } });

  return new Response("OK", { status: 200 });
};
