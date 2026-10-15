import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  BlockStack,
  Card,
  Layout,
  List,
  Page,
  Text,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getSettings } from "../models/settings.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await getSettings(session.shop);
  return json({ shop: session.shop, settings });
};

export default function Dashboard() {
  const { shop, settings } = useLoaderData<typeof loader>();

  return (
    <Page title="Cart Recovery Popup">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                How it works
              </Text>
              <List type="number">
                <List.Item>
                  Activate the <strong>Cart Recovery Popup</strong> app embed in your
                  theme editor (Customize &gt; Theme settings &gt; App embeds).
                </List.Item>
                <List.Item>
                  When a shopper with items in their cart moves to leave (or after
                  your timer), the popup offers them <strong>{settings.discountCode || "your discount code"}</strong> to
                  complete checkout.
                </List.Item>
                <List.Item>
                  Tune the trigger, discount and design on the Popup Settings page.
                </List.Item>
              </List>
              <Text as="p" tone="subdued">
                Installed on {shop}. Popup is {settings.enabled ? "enabled" : "disabled"}.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
