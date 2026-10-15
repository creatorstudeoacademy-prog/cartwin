import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import {
  BlockStack,
  Button,
  Card,
  Checkbox,
  InlineStack,
  Layout,
  Page,
  RangeSlider,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import {
  defaultSettings,
  getSettings,
  saveSettings,
  type PopupSettings,
} from "../models/settings.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await getSettings(session.shop);
  return json({ settings });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const settings: PopupSettings = {
    enabled: formData.get("enabled") === "on",
    trigger: String(formData.get("trigger") || "exit_intent"),
    delaySeconds: Number(formData.get("delaySeconds") || 15),
    discountCode: String(formData.get("discountCode") || "").trim().toUpperCase(),
    discountPercent: Number(formData.get("discountPercent") || 10),
    heading: String(formData.get("heading") || defaultSettings.heading),
    subheading: String(formData.get("subheading") || defaultSettings.subheading),
    buttonText: String(formData.get("buttonText") || defaultSettings.buttonText),
    backgroundColor: String(formData.get("backgroundColor") || "#0B0E17"),
    accentColor: String(formData.get("accentColor") || "#00E5FF"),
    textColor: String(formData.get("textColor") || "#FFFFFF"),
    showOncePerSession: formData.get("showOncePerSession") === "on",
  };

  // Validate discount code exists (or create it) via Admin API
  if (settings.enabled && settings.discountCode) {
    const result = await ensureDiscountCode(admin, settings.discountCode, settings.discountPercent);
    if (!result.ok) {
      return json({ ok: false, error: result.error, settings }, { status: 400 });
    }
  }

  await saveSettings(session.shop, settings);
  return json({ ok: true, settings });
};

/** Ensure the discount code exists in the shop; create a % off code if missing. */
async function ensureDiscountCode(
  admin: { graphql: (q: string, o?: object) => Promise<Response> },
  code: string,
  percent: number,
): Promise<{ ok: boolean; error?: string }> {
  // 1. Check if the code already exists
  const lookup = await admin.graphql(
    `#graphql
    query FindCode($q: String!) {
      codeDiscountNodes(first: 1, query: $q) { nodes { id } }
    }`,
    { variables: { q: `code:${code}` } },
  );
  const lookupJson = await lookup.json();
  if (lookupJson.data?.codeDiscountNodes?.nodes?.length) return { ok: true };

  // 2. Create a basic % off discount code valid on the whole store
  const create = await admin.graphql(
    `#graphql
    mutation CreateCode($basicCodeDiscount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
        userErrors { field message }
      }
    }`,
    {
      variables: {
        basicCodeDiscount: {
          title: `Cart Recovery ${code}`,
          code,
          startsAt: new Date().toISOString(),
          customerSelection: { all: true },
          customerGets: {
            value: { percentage: Math.min(Math.max(percent, 1), 90) / 100 },
            items: { all: true },
          },
        },
      },
    },
  );
  const createJson = await create.json();
  const errors = createJson.data?.discountCodeBasicCreate?.userErrors ?? [];
  if (errors.length) {
    return { ok: false, error: errors.map((e: { message: string }) => e.message).join("; ") };
  }
  return { ok: true };
}

export default function SettingsPage() {
  const { settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const current = actionData?.settings ?? settings;

  const [trigger, setTrigger] = useState(current.trigger);
  const [delay, setDelay] = useState(current.delaySeconds);

  return (
    <Page title="Popup Settings" backAction={{ content: "Dashboard", url: "/app" }}>
      <Layout>
        <Layout.Section>
          <Form method="post">
            <BlockStack gap="400">
              {actionData && !actionData.ok && (
                <Card>
                  <Text as="p" tone="critical">
                    {actionData.error}
                  </Text>
                </Card>
              )}
              {actionData?.ok && (
                <Card>
                  <Text as="p" tone="success">
                    Settings saved.
                  </Text>
                </Card>
              )}

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Behaviour
                  </Text>
                  <Checkbox
                    label="Enable recovery popup"
                    name="enabled"
                    checked={current.enabled}
                    // uncontrolled fallback handled by form data
                  />
                  <Select
                    label="Trigger"
                    name="trigger"
                    options={[
                      { label: "Exit intent (desktop) + timer (mobile)", value: "exit_intent" },
                      { label: "Timed only", value: "timed" },
                      { label: "Exit intent only", value: "exit_only" },
                    ]}
                    value={trigger}
                    onChange={setTrigger}
                  />
                  {(trigger === "exit_intent" || trigger === "timed") && (
                    <RangeSlider
                      label="Delay before popup can appear (seconds)"
                      name="delaySeconds"
                      value={delay}
                      min={5}
                      max={120}
                      step={5}
                      onChange={setDelay}
                      output
                    />
                  )}
                  <Checkbox
                    label="Show only once per session"
                    name="showOncePerSession"
                    checked={current.showOncePerSession}
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Discount
                  </Text>
                  <TextField
                    label="Discount code shown in the popup"
                    name="discountCode"
                    defaultValue={current.discountCode}
                    helpText="If the code does not exist, we create it automatically."
                    autoComplete="off"
                  />
                  <RangeSlider
                    label="Discount percentage"
                    name="discountPercent"
                    value={current.discountPercent}
                    min={5}
                    max={50}
                    step={5}
                    output
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Design
                  </Text>
                  <TextField label="Heading" name="heading" defaultValue={current.heading} autoComplete="off" />
                  <TextField label="Subheading" name="subheading" defaultValue={current.subheading} autoComplete="off" />
                  <TextField label="Button text" name="buttonText" defaultValue={current.buttonText} autoComplete="off" />
                  <InlineStack gap="400">
                    <TextField label="Background" name="backgroundColor" defaultValue={current.backgroundColor} autoComplete="off" />
                    <TextField label="Accent" name="accentColor" defaultValue={current.accentColor} autoComplete="off" />
                    <TextField label="Text" name="textColor" defaultValue={current.textColor} autoComplete="off" />
                  </InlineStack>
                </BlockStack>
              </Card>

              <InlineStack>
                <Button submit variant="primary">
                  Save settings
                </Button>
              </InlineStack>
            </BlockStack>
          </Form>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
