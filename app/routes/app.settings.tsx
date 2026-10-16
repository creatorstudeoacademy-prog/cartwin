import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import {
  Banner,
  BlockStack,
  Button,
  Card,
  Checkbox,
  Divider,
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

  const [enabled, setEnabled] = useState(current.enabled);
  const [trigger, setTrigger] = useState(current.trigger);
  const [delay, setDelay] = useState(current.delaySeconds);
  const [showOnce, setShowOnce] = useState(current.showOncePerSession);
  const [discountCode, setDiscountCode] = useState(current.discountCode);
  const [discountPercent, setDiscountPercent] = useState(current.discountPercent);
  const [heading, setHeading] = useState(current.heading);
  const [subheading, setSubheading] = useState(current.subheading);
  const [buttonText, setButtonText] = useState(current.buttonText);
  const [backgroundColor, setBackgroundColor] = useState(current.backgroundColor);
  const [accentColor, setAccentColor] = useState(current.accentColor);
  const [textColor, setTextColor] = useState(current.textColor);

  const previewSubheading = subheading.replace("{percent}", String(discountPercent));

  const handleDelayChange = (value: number | [number, number]) =>
    setDelay(typeof value === "number" ? value : value[0]);
  const handlePercentChange = (value: number | [number, number]) =>
    setDiscountPercent(typeof value === "number" ? value : value[0]);

  return (
    <Page
      title="Popup Settings"
      subtitle="Tune when the popup appears, what it offers, and how it looks."
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Form method="post">
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              {actionData && !actionData.ok && (
                <Banner title="Couldn't save settings" tone="critical">
                  <p>{actionData.error}</p>
                </Banner>
              )}
              {actionData?.ok && (
                <Banner title="Settings saved" tone="success">
                  <p>Your popup will use these settings right away.</p>
                </Banner>
              )}

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Status
                  </Text>
                  <Checkbox
                    label="Enable recovery popup"
                    helpText="When on, the popup can appear for shoppers with items in their cart. Turn it off any time — for example while you redesign your theme."
                    name="enabled"
                    checked={enabled}
                    onChange={setEnabled}
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    When it appears
                  </Text>
                  <Text as="p" tone="subdued">
                    Catch shoppers at the exact moment they decide to leave.
                  </Text>
                  <Select
                    label="Trigger"
                    helpText="Exit intent watches desktop shoppers moving to close the tab. Timed works on mobile too, where there is no mouse to track — most stores use the combined option."
                    name="trigger"
                    options={[
                      { label: "Exit intent (desktop) + timer (mobile) — recommended", value: "exit_intent" },
                      { label: "Timed only", value: "timed" },
                      { label: "Exit intent only", value: "exit_only" },
                    ]}
                    value={trigger}
                    onChange={setTrigger}
                  />
                  {(trigger === "exit_intent" || trigger === "timed") && (
                    <>
                      <input type="hidden" name="delaySeconds" value={delay} />
                      <RangeSlider
                        label="Delay before the popup can appear"
                        helpText="Give shoppers 15–30 seconds to look around first — interrupting too early hurts trust, too late misses the exit."
                        value={delay}
                        min={5}
                        max={120}
                        step={5}
                        onChange={handleDelayChange}
                        output
                      />
                    </>
                  )}
                  <Checkbox
                    label="Show only once per session"
                    helpText="Recommended: one gentle nudge per visit converts better than repeated popups."
                    name="showOncePerSession"
                    checked={showOnce}
                    onChange={setShowOnce}
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    The offer
                  </Text>
                  <Text as="p" tone="subdued">
                    A small discount at the right moment turns &ldquo;maybe
                    later&rdquo; into &ldquo;buy now&rdquo;.
                  </Text>
                  <TextField
                    label="Discount code shown in the popup"
                    helpText="If the code doesn't exist in your store yet, CartWin creates it automatically when you save."
                    name="discountCode"
                    value={discountCode}
                    onChange={setDiscountCode}
                    autoComplete="off"
                  />
                  <input type="hidden" name="discountPercent" value={discountPercent} />
                  <RangeSlider
                    label="Discount percentage"
                    helpText="10–15% is the sweet spot: enough to motivate the shopper, small enough to protect your margin."
                    value={discountPercent}
                    min={5}
                    max={50}
                    step={5}
                    onChange={handlePercentChange}
                    output
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Design
                  </Text>
                  <Text as="p" tone="subdued">
                    Match the popup to your brand. The preview updates as you type.
                  </Text>
                  <TextField
                    label="Heading"
                    name="heading"
                    value={heading}
                    onChange={setHeading}
                    autoComplete="off"
                  />
                  <TextField
                    label="Subheading"
                    helpText="Use {percent} to insert the discount percentage automatically."
                    name="subheading"
                    value={subheading}
                    onChange={setSubheading}
                    autoComplete="off"
                  />
                  <TextField
                    label="Button text"
                    name="buttonText"
                    value={buttonText}
                    onChange={setButtonText}
                    autoComplete="off"
                  />
                  <InlineStack gap="400">
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <TextField
                        label="Background color"
                        name="backgroundColor"
                        value={backgroundColor}
                        onChange={setBackgroundColor}
                        autoComplete="off"
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <TextField
                        label="Accent color"
                        name="accentColor"
                        value={accentColor}
                        onChange={setAccentColor}
                        autoComplete="off"
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <TextField
                        label="Text color"
                        name="textColor"
                        value={textColor}
                        onChange={setTextColor}
                        autoComplete="off"
                      />
                    </div>
                  </InlineStack>
                  <Divider />
                  <Text as="h3" variant="headingSm">
                    Live preview
                  </Text>
                  <div
                    style={{
                      backgroundColor,
                      borderRadius: 12,
                      padding: 28,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        color: textColor,
                        fontWeight: 700,
                        fontSize: 20,
                        marginBottom: 10,
                      }}
                    >
                      {heading}
                    </div>
                    <div
                      style={{
                        color: textColor,
                        opacity: 0.85,
                        fontSize: 14,
                        marginBottom: 18,
                      }}
                    >
                      {previewSubheading}
                    </div>
                    <div
                      style={{
                        display: "inline-block",
                        backgroundColor: accentColor,
                        color: "#0B0E17",
                        fontWeight: 700,
                        fontSize: 14,
                        padding: "10px 26px",
                        borderRadius: 8,
                      }}
                    >
                      {buttonText}
                    </div>
                  </div>
                </BlockStack>
              </Card>

              <InlineStack>
                <Button submit variant="primary" size="large">
                  Save settings
                </Button>
              </InlineStack>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Form>
    </Page>
  );
}
