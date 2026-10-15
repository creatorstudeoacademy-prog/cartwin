import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { BlockStack, Button, Card, Layout, Page, Text } from "@shopify/polaris";
import { authenticate, MONTHLY_PLAN, MONTHLY_PRICE, FREE_TRIAL_DAYS } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing } = await authenticate.admin(request);
  const { hasActivePayment, appSubscriptions } = await billing.check({
    plans: [MONTHLY_PLAN],
    isTest: process.env.NODE_ENV !== "production",
  });
  return json({ hasActivePayment, subscription: appSubscriptions?.[0] ?? null });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing } = await authenticate.admin(request);
  await billing.request({
    plan: MONTHLY_PLAN,
    isTest: process.env.NODE_ENV !== "production",
    returnUrl: `${process.env.SHOPIFY_APP_URL}/app`,
  });
  return json({ ok: true });
};

export default function BillingPage() {
  const { hasActivePayment } = useLoaderData<typeof loader>();

  return (
    <Page title="Billing">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                {MONTHLY_PLAN} — ${MONTHLY_PRICE}/month
              </Text>
              <Text as="p">
                Unlimited recovery popups, exit-intent + timed triggers, automatic
                discount code creation, and design customization. {FREE_TRIAL_DAYS}-day
                free trial included.
              </Text>
              {hasActivePayment ? (
                <Text as="p" tone="success">
                  Your subscription is active.
                </Text>
              ) : (
                <Form method="post">
                  <Button submit variant="primary">
                    Start {FREE_TRIAL_DAYS}-day free trial
                  </Button>
                </Form>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
