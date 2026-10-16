import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import {
  Banner,
  BlockStack,
  Button,
  Card,
  Divider,
  InlineStack,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { authenticate, MONTHLY_PLAN, MONTHLY_PRICE, FREE_TRIAL_DAYS } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing } = await authenticate.admin(request);
  const { hasActivePayment, appSubscriptions } = await billing.check({
    plans: [MONTHLY_PLAN],
    isTest: process.env.NODE_ENV !== "production",
  });
  return json({
    hasActivePayment,
    subscription: appSubscriptions?.[0] ?? null,
    planName: MONTHLY_PLAN,
    planPrice: MONTHLY_PRICE,
    trialDays: FREE_TRIAL_DAYS,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing } = await authenticate.admin(request);
  await billing.request({
    plan: MONTHLY_PLAN,
    isTest: true,
    returnUrl: `${process.env.SHOPIFY_APP_URL}/app`,
  });
  return json({ ok: true });
};

const FEATURES = [
  "Unlimited recovery popups on every page",
  "Exit-intent + timed triggers",
  "Automatic discount code creation",
  "Full popup design customization",
  "Works with any theme via app embed",
];

export default function BillingPage() {
  const { hasActivePayment, planName, planPrice, trialDays } =
    useLoaderData<typeof loader>();

  return (
    <Page
      title="Billing"
      subtitle="One plan. Everything included."
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Layout>
        <Layout.Section variant="oneHalf">
          <BlockStack gap="400">
            {hasActivePayment ? (
              <Banner title={`${planName} is active`} tone="success">
                <p>
                  You&rsquo;re on the ${planPrice}/month plan. Your popup keeps
                  recovering abandoned carts with no limits.
                </p>
              </Banner>
            ) : (
              <Card>
                <BlockStack gap="400">
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingLg">
                      {planName}
                    </Text>
                    <InlineStack gap="200" blockAlign="baseline">
                      <Text as="p" variant="heading2xl">
                        ${planPrice}
                      </Text>
                      <Text as="p" tone="subdued">
                        / month
                      </Text>
                    </InlineStack>
                    <Text as="p" tone="subdued">
                      {trialDays}-day free trial &middot; Cancel anytime
                    </Text>
                  </BlockStack>
                  <Divider />
                  <BlockStack gap="200">
                    {FEATURES.map((feature) => (
                      <InlineStack key={feature} gap="200" blockAlign="center">
                        <Text as="span" tone="success" fontWeight="bold">
                          &#10003;
                        </Text>
                        <Text as="span">{feature}</Text>
                      </InlineStack>
                    ))}
                  </BlockStack>
                  <Divider />
                  <Text as="p" tone="subdued">
                    Recovering a single abandoned cart typically covers the
                    monthly cost. You won&rsquo;t be charged during the trial.
                  </Text>
                  <Form method="post">
                    <Button submit variant="primary" fullWidth size="large">
                      Start {trialDays}-day free trial
                    </Button>
                  </Form>
                </BlockStack>
              </Card>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
