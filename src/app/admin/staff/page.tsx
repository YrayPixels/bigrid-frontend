"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { MerchantStaffMember, StoreLocation } from "@/lib/api/types";
import { useLocationScope } from "@/lib/location-scope";
import { PlacesAutocompleteInput } from "@/components/places/places-autocomplete-input";
import { isGooglePlacesEnabled, type ParsedPlace } from "@/lib/places/parse-place";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LocationFormState = {
  name: string;
  city: string;
  state: string;
  area: string;
  placesQuery: string;
  deliveryFee: string;
  freeShippingEnabled: boolean;
  freeShippingMinSubtotal: string;
};

const emptyLocationForm = (): LocationFormState => ({
  name: "",
  city: "",
  state: "",
  area: "",
  placesQuery: "",
  deliveryFee: "",
  freeShippingEnabled: false,
  freeShippingMinSubtotal: "",
});

function formatMoney(value: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function locationAreaSummary(location: StoreLocation): string | null {
  const parts: string[] = [];
  if (location.city?.trim()) parts.push(location.city.trim());
  if (location.state?.trim()) parts.push(location.state.trim());
  const headline = parts.join(", ");
  const area = location.area?.trim();
  if (headline && area) return `${headline} · ${area}`;
  return headline || area || null;
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function placesQueryFromParts(city: string, state: string, area: string): string {
  return [area, city, state].map((part) => part.trim()).filter(Boolean).join(", ");
}

function locationToForm(location: StoreLocation): LocationFormState {
  const city = location.city ?? "";
  const state = location.state ?? "";
  const area = location.area ?? "";
  return {
    name: location.name,
    city,
    state,
    area,
    placesQuery: placesQueryFromParts(city, state, area),
    deliveryFee:
      location.delivery_fee != null && Number.isFinite(location.delivery_fee)
        ? String(location.delivery_fee)
        : "",
    freeShippingEnabled: location.free_shipping_enabled ?? false,
    freeShippingMinSubtotal:
      location.free_shipping_min_subtotal != null &&
      Number.isFinite(location.free_shipping_min_subtotal)
        ? String(location.free_shipping_min_subtotal)
        : "",
  };
}

function buildLocationPayload(form: LocationFormState) {
  return {
    name: form.name.trim(),
    city: form.city.trim() || null,
    state: form.state.trim() || null,
    area: form.area.trim() || null,
    delivery_fee: parseOptionalNumber(form.deliveryFee),
    free_shipping_enabled: form.freeShippingEnabled,
    free_shipping_min_subtotal: form.freeShippingEnabled
      ? parseOptionalNumber(form.freeShippingMinSubtotal)
      : null,
  };
}

function applyPlaceToLocationForm(
  form: LocationFormState,
  place: ParsedPlace,
): LocationFormState {
  const city = place.city;
  const state = place.state;
  const area = place.area || place.streetAddress || "";
  return {
    ...form,
    name: form.name.trim() || area || city || form.name,
    city,
    state,
    area,
    placesQuery: place.formattedAddress || placesQueryFromParts(city, state, area),
  };
}

function LocationShippingFields({
  form,
  onChange,
  idPrefix,
}: {
  form: LocationFormState;
  onChange: (next: LocationFormState) => void;
  idPrefix: string;
}) {
  const placesEnabled = isGooglePlacesEnabled();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-name`}>Name</Label>
        <Input
          id={`${idPrefix}-name`}
          required
          placeholder="e.g. Ikeja store"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </div>

      {placesEnabled ? (
        <div className="space-y-2 sm:col-span-2">
          <PlacesAutocompleteInput
            id={`${idPrefix}-places`}
            label="Service area / delivery zone"
            hint="Search a Google Place. City, state, and area are filled for checkout matching."
            placeholder="Search Ikeja, Lekki, Abuja…"
            value={form.placesQuery}
            onChange={(placesQuery) => onChange({ ...form, placesQuery })}
            onPlaceSelect={(place) => onChange(applyPlaceToLocationForm(form, place))}
          />
          {form.city || form.state || form.area ? (
            <div className="flex flex-wrap gap-2">
              {form.area ? <Badge variant="secondary">Area: {form.area}</Badge> : null}
              {form.city ? <Badge variant="secondary">City: {form.city}</Badge> : null}
              {form.state ? <Badge variant="secondary">State: {form.state}</Badge> : null}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Pick a place so checkout can match free shipping and delivery fees.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-city`}>City</Label>
            <Input
              id={`${idPrefix}-city`}
              placeholder="e.g. Lagos"
              value={form.city}
              onChange={(e) => onChange({ ...form, city: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-state`}>State</Label>
            <Input
              id={`${idPrefix}-state`}
              placeholder="e.g. Lagos"
              value={form.state}
              onChange={(e) => onChange({ ...form, state: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`${idPrefix}-area`}>Area</Label>
            <Input
              id={`${idPrefix}-area`}
              placeholder="e.g. Lekki Phase 1"
              value={form.area}
              onChange={(e) => onChange({ ...form, area: e.target.value })}
            />
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-delivery-fee`}>Delivery fee</Label>
        <Input
          id={`${idPrefix}-delivery-fee`}
          type="number"
          min={0}
          step="1"
          placeholder="0"
          value={form.deliveryFee}
          onChange={(e) => onChange({ ...form, deliveryFee: e.target.value })}
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border px-3 py-2 sm:col-span-2">
        <div>
          <Label htmlFor={`${idPrefix}-free-shipping`} className="cursor-pointer">
            Free shipping
          </Label>
          <p className="text-xs text-muted-foreground">
            Waive delivery when order subtotal meets the minimum.
          </p>
        </div>
        <Switch
          id={`${idPrefix}-free-shipping`}
          checked={form.freeShippingEnabled}
          onCheckedChange={(checked) =>
            onChange({
              ...form,
              freeShippingEnabled: checked,
              freeShippingMinSubtotal: checked ? form.freeShippingMinSubtotal : "",
            })
          }
        />
      </div>
      {form.freeShippingEnabled ? (
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-free-shipping-min`}>Min subtotal for free shipping</Label>
          <Input
            id={`${idPrefix}-free-shipping-min`}
            type="number"
            min={0}
            step="1"
            placeholder="e.g. 10000"
            value={form.freeShippingMinSubtotal}
            onChange={(e) =>
              onChange({ ...form, freeShippingMinSubtotal: e.target.value })
            }
          />
        </div>
      ) : null}
    </div>
  );
}

export default function StaffAdminPage() {
  const { refreshLocations } = useLocationScope();
  const [staff, setStaff] = useState<MerchantStaffMember[]>([]);
  const [owner, setOwner] = useState<{ name: string; email: string } | null>(null);
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingLocationId, setSavingLocationId] = useState<string | null>(null);
  const [creatingLocation, setCreatingLocation] = useState(false);
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);
  const [newLocationForm, setNewLocationForm] = useState<LocationFormState>(emptyLocationForm);
  const [editForms, setEditForms] = useState<Record<string, LocationFormState>>({});

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"cashier" | "manager">("cashier");
  const [locationId, setLocationId] = useState<string>("");

  const refresh = useCallback(async () => {
    const staffRes = await api.getStaff();
    setStaff(Array.isArray(staffRes.data) ? staffRes.data : []);
    setOwner(staffRes.owner ?? null);
    try {
      const locs = await api.getLocations();
      setLocations(locs);
      setLocationId((current) => current || locs[0]?.id || "");
      await refreshLocations();
    } catch {
      // Locations are helpful but shouldn't block the team list.
    }
  }, [refreshLocations]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Failed to load staff");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await api.createStaff({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        location_id: locationId || null,
      });
      setName("");
      setEmail("");
      setPassword("");
      setRole("cashier");
      setStaff((prev) => {
        if (prev.some((member) => member.id === created.id)) return prev;
        return [...prev, created];
      });
      toast.success("Staff member added");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add staff");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (member: MerchantStaffMember) => {
    try {
      await api.updateStaff(member.id, {
        status: member.status === "active" ? "disabled" : "active",
      });
      toast.success(member.status === "active" ? "Staff disabled" : "Staff enabled");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const addLocation = async (e: FormEvent) => {
    e.preventDefault();
    if (!newLocationForm.name.trim()) return;
    setCreatingLocation(true);
    try {
      await api.createLocation(buildLocationPayload(newLocationForm));
      setNewLocationForm(emptyLocationForm());
      toast.success("Location added");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add location");
    } finally {
      setCreatingLocation(false);
    }
  };

  const toggleEditLocation = (location: StoreLocation) => {
    if (expandedLocationId === location.id) {
      setExpandedLocationId(null);
      return;
    }
    setEditForms((prev) => ({
      ...prev,
      [location.id]: locationToForm(location),
    }));
    setExpandedLocationId(location.id);
  };

  const saveLocation = async (locationIdToSave: string) => {
    const form = editForms[locationIdToSave];
    if (!form?.name.trim()) return;
    setSavingLocationId(locationIdToSave);
    try {
      await api.updateLocation(locationIdToSave, buildLocationPayload(form));
      toast.success("Location updated");
      setExpandedLocationId(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update location");
    } finally {
      setSavingLocationId(null);
    }
  };

  if (loading) {
    return <div className="bg-canvas p-6 text-sm text-ink-soft">Loading staff…</div>;
  }

  return (
    <div className="w-full bg-canvas px-4 py-6 text-ink sm:px-6 lg:px-8">
      <section className="space-y-8 overflow-hidden rounded-[28px] border border-border/70 bg-canvas-raised p-5 shadow-elevated sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Staff & locations</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Invite cashiers and managers to sell from their phones at{" "}
          <span className="font-medium text-ink">/sell</span>.
        </p>
      </div>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
            Locations
          </h2>
          <p className="mt-1 text-xs text-ink-soft">
            At checkout, the customer&apos;s Google Place (city/state/area) is matched to a
            location to set delivery fee and free shipping.
          </p>
        </div>
        <ul className="space-y-2">
          {locations.map((location) => {
            const summary = locationAreaSummary(location);
            const isEditing = expandedLocationId === location.id;
            const editForm = editForms[location.id];

            return (
              <li key={location.id} className="rounded-lg border border-border bg-secondary/20">
                <div className="flex flex-wrap items-start justify-between gap-3 px-3 py-3 text-sm">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{location.name}</span>
                      {location.is_default ? (
                        <Badge variant="secondary">Default</Badge>
                      ) : null}
                      {location.free_shipping_enabled ? (
                        <Badge variant="outline">Free shipping</Badge>
                      ) : null}
                    </div>
                    {summary ? (
                      <p className="text-muted-foreground">{summary}</p>
                    ) : (
                      <p className="text-muted-foreground">No area set</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Delivery:{" "}
                      {location.delivery_fee != null && Number.isFinite(location.delivery_fee)
                        ? formatMoney(location.delivery_fee)
                        : "Not set"}
                      {location.free_shipping_enabled &&
                      location.free_shipping_min_subtotal != null &&
                      Number.isFinite(location.free_shipping_min_subtotal)
                        ? ` · Free over ${formatMoney(location.free_shipping_min_subtotal)}`
                        : null}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => toggleEditLocation(location)}
                  >
                    {isEditing ? "Close" : "Edit"}
                  </Button>
                </div>
                {isEditing && editForm ? (
                  <div className="space-y-3 border-t px-3 py-3">
                    <LocationShippingFields
                      idPrefix={`edit-${location.id}`}
                      form={editForm}
                      onChange={(next) =>
                        setEditForms((prev) => ({ ...prev, [location.id]: next }))
                      }
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedLocationId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={savingLocationId === location.id || !editForm.name.trim()}
                        onClick={() => saveLocation(location.id)}
                      >
                        {savingLocationId === location.id ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <form onSubmit={addLocation} className="space-y-3 rounded-lg border border-dashed border-border p-4">
          <p className="text-sm font-medium">Add location</p>
          <LocationShippingFields
            idPrefix="new-location"
            form={newLocationForm}
            onChange={setNewLocationForm}
          />
          <Button type="submit" variant="outline" disabled={creatingLocation}>
            {creatingLocation ? "Adding…" : "Add location"}
          </Button>
        </form>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Team
        </h2>
        {owner ? (
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-3 text-sm">
            <div>
              <p className="font-medium">{owner.name}</p>
              <p className="text-ink-soft">{owner.email}</p>
            </div>
            <Badge>Owner</Badge>
          </div>
        ) : null}
        {staff.map((member) => (
          <div
            key={member.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-3 text-sm"
          >
            <div>
              <p className="font-medium">{member.name}</p>
              <p className="text-ink-soft">{member.email}</p>
              <p className="mt-1 text-xs capitalize text-ink-soft">
                {member.role}
                {member.default_location_name ? ` · ${member.default_location_name}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={member.status === "active" ? "default" : "secondary"}>
                {member.status}
              </Badge>
              <Button size="sm" variant="outline" onClick={() => toggleStatus(member)}>
                {member.status === "active" ? "Disable" : "Enable"}
              </Button>
            </div>
          </div>
        ))}
        {staff.length === 0 ? (
          <p className="text-sm text-ink-soft">No staff yet. Add a cashier below.</p>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Add staff
        </h2>
        <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2">
          <Input
            required
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            required
            type="password"
            placeholder="Temporary password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
          />
          <Select value={role} onValueChange={(v) => setRole(v as "cashier" | "manager")}>
            <SelectTrigger>
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cashier">Cashier</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
            </SelectContent>
          </Select>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger>
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={submitting} className="sm:col-span-2">
            {submitting ? "Adding…" : "Add staff member"}
          </Button>
        </form>
      </section>
      </section>
    </div>
  );
}
