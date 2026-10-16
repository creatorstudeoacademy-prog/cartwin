import { shopifyApp, BillingInterval } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

// Monthly pricing — competitive for the cart-recovery category
export const MONTHLY_PLAN = "Cart Recovery Pro";
export const MONTHLY_PRICE = 9.99;
export const FREE_TRIAL_DAYS = 7;

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: "2026-01",
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: undefined, // set to AppDistribution.AppStore after review passes
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  billing: {
    [MONTHLY_PLAN]: {
      amount: MONTHLY_PRICE,
      currencyCode: "USD",
      interval: BillingInterval.Every30Days,
      trialDays: FREE_TRIAL_DAYS,
    },
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = "2026-01";
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
