import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * MANDATORY GDPR compliance webhooks — app review auto-rejects without these.
 * All handlers: verify HMAC (done by authenticate.webhook), act idempotently,
 * respond 200 fast.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  switch (topic) {
    case "CUSTOMERS_DATA_REQUEST": {
      const p = payload as { customer?: { id?: number; email?: string } };
      // This app stores no customer PII (settings are shop-level).
      // Log for audit; merchant forwards the (empty) result to the customer.
      console.log(
        `GDPR data request: shop=${shop} customer=${p.customer?.id} — no customer data stored`,
      );
      return new Response("OK", { status: 200 });
    }

    case "CUSTOMERS_REDACT": {
      const p = payload as { customer?: { id?: number } };
      // No customer-level records exist; nothing to delete. Idempotent by design.
      console.log(`GDPR customer redact: shop=${shop} customer=${p.customer?.id} — nothing stored`);
      return new Response("OK", { status: 200 });
    }

    case "SHOP_REDACT": {
      // Final sweep ~48h after uninstall: delete ALL shop data.
      console.log(`GDPR shop redact: deleting all data for ${shop}`);
      await prisma.popupSettings.deleteMany({ where: { shop } });
      await prisma.session.deleteMany({ where: { shop } });
      return new Response("OK", { status: 200 });
    }

    default:
      return new Response("Unhandled compliance topic", { status: 200 });
  }
};
