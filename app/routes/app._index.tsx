import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  Divider,
  InlineGrid,
  InlineStack,
  Layout,
  List,
  Page,
  Text,
} from "@shopify/polaris";
import { authenticate, MONTHLY_PLAN } from "../shopify.server";
import { getSettings } from "../models/settings.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const settings = await getSettings(session.shop);
  // Check subscription status (non-blocking - no redirect)
  let hasActivePayment = false;
  try {
    const result = await billing.check({
      plans: [MONTHLY_PLAN],
      isTest: process.env.NODE_ENV !== "production",
    });
    hasActivePayment = result.hasActivePayment;
  } catch {
    // If billing check fails, assume no subscription
    hasActivePayment = false;
  }
  return json({ shop: session.shop, settings, hasActivePayment });
};

const TRIGGER_LABELS: Record<string, string> = {
  exit_intent: "Exit intent + timer",
  timed: "Timed",
  exit_only: "Exit intent only",
};

export default function Dashboard() {
  const { shop, settings, hasActivePayment } = useLoaderData<typeof loader>();
  const storeHandle = shop.replace(".myshopify.com", "");
  const themeEditorUrl = `https://admin.shopify.com/store/${storeHandle}/themes/current/editor?context=apps`;

  return (
    <Page
      title="Recover lost sales"
      subtitle="CartWin shows a discount popup to shoppers about to abandon their cart — turning exits into orders."
      primaryAction={{ content: "Customize popup", url: "/app/settings" }}
    >
      <Layout>
        {!hasActivePayment && (
          <Layout.Section>
            <Banner
              title="Start your free trial"
              tone="info"
              action={{ content: "View plans", url: "/app/billing" }}
            >
              <p>
                You're on a trial. Subscribe to keep recovering abandoned carts
                after your trial ends.
              </p>
            </Banner>
          </Layout.Section>
        )}
        <Layout.Section>
          {settings.enabled ? (
            <Banner title="Your recovery popup is live" tone="success">
              <p>
                Shoppers who try to leave with items in their cart will see your{" "}
                {settings.discountPercent}% off offer.
              </p>
            </Banner>
          ) : (
            <Banner
              title="Your recovery popup is paused"
              tone="warning"
              action={{ content: "Turn it on", url: "/app/settings" }}
            >
              <p>Enable the popup to start recovering abandoned carts.</p>
            </Banner>
          )}
        </Layout.Section>

        <Layout.Section>
          <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm" tone="subdued">
                  Status
                </Text>
                <Badge tone={settings.enabled ? "success" : "attention"}>
                  {settings.enabled ? "Active" : "Paused"}
                </Badge>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm" tone="subdued">
                  Offer
                </Text>
                <Text as="p" variant="headingMd">
                  {settings.discountPercent}% off
                </Text>
                <Text as="p" tone="subdued">
                  Code: {settings.discountCode || "—"}
                </Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm" tone="subdued">
                  Trigger
                </Text>
                <Text as="p" variant="headingMd">
                  {TRIGGER_LABELS[settings.trigger] ?? settings.trigger}
                </Text>
                <Text as="p" tone="subdued">
                  {settings.delaySeconds}s delay
                </Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm" tone="subdued">
                  Frequency
                </Text>
                <Text as="p" variant="headingMd">
                  {settings.showOncePerSession ? "Once per visit" : "Every exit"}
                </Text>
                <Text as="p" tone="subdued">
                  per shopper session
                </Text>
              </BlockStack>
            </Card>
          </InlineGrid>
        </Layout.Section>

        <Layout.Section>
          <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Why it recovers sales
                </Text>
                <List type="bullet">
                  <List.Item>
                    <strong>Exit intent catches leavers</strong> — the popup appears
                    the moment a desktop shopper moves to close the tab.
                  </List.Item>
                  <List.Item>
                    <strong>A small discount removes doubt</strong> — 10–15% off is
                    often enough to turn &ldquo;maybe later&rdquo; into
                    &ldquo;buy now&rdquo;.
                  </List.Item>
                  <List.Item>
                    <strong>Zero manual work</strong> — CartWin creates the discount
                    code in your store automatically.
                  </List.Item>
                </List>
                <Divider />
                <Text as="p" tone="subdued">
                  Nearly 7 in 10 online carts are abandoned before checkout
                  (Baymard Institute). Recovering even a small fraction pays for
                  itself.
                </Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Get set up in 2 minutes
                </Text>
                <List type="number">
                  <List.Item>
                    Open the <strong>theme editor</strong> and enable the{" "}
                    <strong>Cart Recovery Popup</strong> app embed under{" "}
                    <strong>App embeds</strong>.
                  </List.Item>
                  <List.Item>
                    Pick your <strong>discount</strong> — {settings.discountPercent}%
                    with code <strong>{settings.discountCode || "COMEBACK10"}</strong>{" "}
                    is a proven starting point.
                  </List.Item>
                  <List.Item>
                    <strong>Test it yourself</strong>: add a product to cart on your
                    storefront, then move your mouse toward the browser tab bar —
                    the popup should appear.
                  </List.Item>
                </List>
                <InlineStack gap="300">
                  <Button
                    onClick={() => window.open(themeEditorUrl, "_blank", "noopener")}
                  >
                    Open theme editor
                  </Button>
                  <Button url="/app/settings">Tune the popup</Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </InlineGrid>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                Recovery stats
              </Text>
              <Text as="p" tone="subdued">
                Installed on {shop}. Once shoppers start seeing the popup, your
                recovery numbers will appear here.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
