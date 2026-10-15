import prisma from "../db.server";

export interface PopupSettings {
  enabled: boolean;
  /** exit_intent | timed | exit_only */
  trigger: string;
  delaySeconds: number;
  discountCode: string;
  discountPercent: number;
  heading: string;
  subheading: string;
  buttonText: string;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  showOncePerSession: boolean;
}

export const defaultSettings: PopupSettings = {
  enabled: true,
  trigger: "exit_intent",
  delaySeconds: 15,
  discountCode: "COMEBACK10",
  discountPercent: 10,
  heading: "Wait — don't leave empty-handed!",
  subheading: "Complete your order now and take {percent}% off with this code:",
  buttonText: "Claim my discount",
  backgroundColor: "#0B0E17",
  accentColor: "#00E5FF",
  textColor: "#FFFFFF",
  showOncePerSession: true,
};

export async function getSettings(shop: string): Promise<PopupSettings> {
  const row = await prisma.popupSettings.findUnique({ where: { shop } });
  if (!row) return { ...defaultSettings };
  return {
    enabled: row.enabled,
    trigger: row.trigger,
    delaySeconds: row.delaySeconds,
    discountCode: row.discountCode,
    discountPercent: row.discountPercent,
    heading: row.heading,
    subheading: row.subheading,
    buttonText: row.buttonText,
    backgroundColor: row.backgroundColor,
    accentColor: row.accentColor,
    textColor: row.textColor,
    showOncePerSession: row.showOncePerSession,
  };
}

export async function saveSettings(shop: string, s: PopupSettings): Promise<void> {
  await prisma.popupSettings.upsert({
    where: { shop },
    create: { shop, ...s },
    update: { ...s },
  });
}

/** Public config consumed by the storefront popup (no secrets). */
export async function getPublicConfig(shop: string): Promise<PopupSettings | null> {
  const s = await getSettings(shop);
  return s.enabled ? s : null;
}
