export type ConfirmCheckbox = {
  id: string;
  label: string;
  checked?: boolean;
};

export type ConfirmPayload = {
  title: string;
  body?: string;
  checkboxes?: ConfirmCheckbox[];
  phrase?: string;
  confirmLabel: string;
  danger?: boolean;
};

export type ConfirmValues = {
  checks: Record<string, boolean>;
};

export function readConfirmPayload(value: unknown): ConfirmPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.title !== "string" || typeof raw.confirmLabel !== "string") return null;
  const checkboxes = Array.isArray(raw.checkboxes)
    ? raw.checkboxes.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const box = item as Record<string, unknown>;
      if (typeof box.id !== "string" || typeof box.label !== "string") return [];
      return [{ id: box.id, label: box.label, checked: box.checked === true }];
    })
    : [];
  return {
    title: raw.title,
    body: typeof raw.body === "string" ? raw.body : undefined,
    checkboxes,
    phrase: typeof raw.phrase === "string" && raw.phrase ? raw.phrase : undefined,
    confirmLabel: raw.confirmLabel,
    danger: raw.danger === true,
  };
}

export function readConfirmValues(value: unknown): ConfirmValues {
  const checks: Record<string, boolean> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return { checks };
  const raw = (value as Record<string, unknown>).checks;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { checks };
  for (const [key, checked] of Object.entries(raw)) checks[key] = checked === true;
  return { checks };
}
