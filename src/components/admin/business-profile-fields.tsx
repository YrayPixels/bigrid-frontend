"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  BUSINESS_LOCATIONS,
  PAYMENT_CURRENCY_OPTIONS,
  PHYSICAL_STORE_COUNTS,
  STAFF_COUNT_RANGES,
  WEEKLY_ORDER_RANGES,
  type BusinessProfileInput,
  type PaymentCurrency,
} from "@/lib/business-profile";
import { cn } from "@/lib/utils";

type BusinessProfileFieldsProps = {
  value: BusinessProfileInput;
  onChange: (next: BusinessProfileInput) => void;
  className?: string;
};

function PillGroup<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (next: T) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition",
                active
                  ? "border-primary bg-primary/5 font-medium text-ink shadow-soft"
                  : "border-border bg-background text-ink-soft hover:border-ink/30 hover:text-ink",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {hint ? <p className="text-xs text-ink-soft">{hint}</p> : null}
    </fieldset>
  );
}

export function BusinessProfileFields({ value, onChange, className }: BusinessProfileFieldsProps) {
  function toggleCurrency(currency: PaymentCurrency, checked: boolean) {
    const next = checked
      ? [...value.payment_currencies, currency]
      : value.payment_currencies.filter((item) => item !== currency);
    onChange({ ...value, payment_currencies: next });
  }

  return (
    <div className={cn("space-y-6", className)}>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Where is your business situated?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {BUSINESS_LOCATIONS.map((location) => {
            const active = value.business_location === location.value;
            return (
              <button
                key={location.value}
                type="button"
                onClick={() => onChange({ ...value, business_location: location.value })}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition",
                  active
                    ? "border-primary bg-primary/5 font-medium text-ink shadow-soft"
                    : "border-border bg-background text-ink-soft hover:border-ink/30 hover:text-ink",
                )}
              >
                <span className="text-xl" aria-hidden>
                  {location.flag}
                </span>
                <span>{location.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-ink-soft">
          This determines the default currency on your store. You can switch website currency later.
        </p>
      </fieldset>

      <PillGroup
        label="How many orders do you get weekly?"
        options={WEEKLY_ORDER_RANGES}
        value={value.weekly_orders}
        onChange={(weekly_orders) => onChange({ ...value, weekly_orders })}
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          What currencies do you receive payment in? (Select all that apply)
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {PAYMENT_CURRENCY_OPTIONS.map((currency) => {
            const checked = value.payment_currencies.includes(currency.value);
            const id = `payment-currency-${currency.value}`;
            return (
              <label
                key={currency.value}
                htmlFor={id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition",
                  checked
                    ? "border-primary bg-primary/5 text-ink"
                    : "border-border bg-background text-ink-soft hover:border-ink/30 hover:text-ink",
                )}
              >
                <Checkbox
                  id={id}
                  checked={checked}
                  onCheckedChange={(next) => toggleCurrency(currency.value, next === true)}
                />
                <span>{currency.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <PillGroup
        label="How many staff do you have?"
        options={STAFF_COUNT_RANGES}
        value={value.staff_count}
        onChange={(staff_count) => onChange({ ...value, staff_count })}
      />

      <PillGroup
        label="How many physical stores do you have?"
        options={PHYSICAL_STORE_COUNTS}
        value={value.physical_store_count}
        onChange={(physical_store_count) => onChange({ ...value, physical_store_count })}
      />
    </div>
  );
}

export function BusinessProfileSummary({
  profile,
  className,
}: {
  profile: BusinessProfileInput;
  className?: string;
}) {
  const location = BUSINESS_LOCATIONS.find((item) => item.value === profile.business_location)?.label;
  const weeklyOrders = WEEKLY_ORDER_RANGES.find((item) => item.value === profile.weekly_orders)?.label;
  const staff = STAFF_COUNT_RANGES.find((item) => item.value === profile.staff_count)?.label;
  const stores = PHYSICAL_STORE_COUNTS.find(
    (item) => item.value === profile.physical_store_count,
  )?.label;
  const currencies = profile.payment_currencies
    .map((value) => PAYMENT_CURRENCY_OPTIONS.find((item) => item.value === value)?.label ?? value)
    .join(", ");

  return (
    <dl className={cn("grid gap-3 text-sm sm:grid-cols-2", className)}>
      <div>
        <dt className="text-ink-soft">Business location</dt>
        <dd className="mt-1 font-medium">{location ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-ink-soft">Weekly orders</dt>
        <dd className="mt-1 font-medium">{weeklyOrders ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-ink-soft">Payment currencies</dt>
        <dd className="mt-1 font-medium">{currencies || "—"}</dd>
      </div>
      <div>
        <dt className="text-ink-soft">Staff count</dt>
        <dd className="mt-1 font-medium">{staff ?? "—"}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-ink-soft">Physical stores</dt>
        <dd className="mt-1 font-medium">{stores ?? "—"}</dd>
      </div>
    </dl>
  );
}
