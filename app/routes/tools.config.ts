import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import crypto from "crypto";
import { getPublicConfig } from "../models/settings.server";

/**
 * App proxy endpoint. Storefront path: GET /tools/cart-recovery/config?shop=xxx.myshopify.com
 * Shopify's app proxy strips /tools/cart-recovery and forwards the remainder
 * to the proxy URL (/tools), so this route serves /tools/config on the app.
 * Returns the public popup config for the storefront script.
 * Verifies Shopify's proxy signature (HMAC-SHA256 of sorted query params).
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const params = url.searchParams;

  const shop = params.get("shop");
  if (!shop || !shop.endsWith(".myshopify.com")) {
    return json({ error: "invalid shop" }, { status: 400 });
  }

  if (!verifyProxySignature(params)) {
    return json({ error: "invalid signature" }, { status: 401 });
  }

  const config = await getPublicConfig(shop);
  if (!config) {
    return json({ enabled: false });
  }
  return json(config, {
    headers: { "Cache-Control": "public, max-age=60" },
  });
};

function verifyProxySignature(params: URLSearchParams): boolean {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) return false; // fail closed in production
  const signature = params.get("signature");
  if (!signature) return false;

  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key !== "signature") pairs.push(`${key}=${value}`);
  });
  pairs.sort();
  const digest = crypto
    .createHmac("sha256", secret)
    .update(pairs.join(""))
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}
