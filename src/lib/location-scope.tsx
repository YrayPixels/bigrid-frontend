"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { StoreLocation } from "@/lib/api/types";
import { useAuth } from "@/lib/auth-context";
import { merchantInvalidators } from "@/hooks/use-merchant-queries";

const STORAGE_KEY = "bizgrid_admin_location_id";

type LocationScopeContextValue = {
  locationId: string;
  setLocationId: (id: string) => void;
  locations: StoreLocation[];
  loading: boolean;
  selectedLabel: string;
  refreshLocations: () => Promise<void>;
  createLocation: (name: string) => Promise<StoreLocation | null>;
};

const LocationScopeContext = createContext<LocationScopeContextValue | null>(null);

function readStoredLocationId(): string {
  if (typeof window === "undefined") return "all";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored && stored.trim() !== "" ? stored : "all";
  } catch {
    return "all";
  }
}

export function LocationScopeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [locationId, setLocationIdState] = useState("all");
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLocationIdState(readStoredLocationId());
    setHydrated(true);
  }, []);

  const setLocationId = useCallback((id: string) => {
    setLocationIdState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore quota / private mode
    }
  }, []);

  const refreshLocations = useCallback(async () => {
    if (!user || user.can_access_admin === false) {
      setLocations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const locs = await api.getLocations();
      setLocations(locs);
      setLocationIdState((current) => {
        if (current === "all") return current;
        if (locs.some((location) => location.id === current)) return current;
        try {
          window.localStorage.setItem(STORAGE_KEY, "all");
        } catch {
          // ignore
        }
        return "all";
      });
    } catch {
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!hydrated) return;
    void refreshLocations();
  }, [hydrated, refreshLocations]);

  const createLocation = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      try {
        const created = await api.createLocation({ name: trimmed });
        setLocations((prev) => {
          if (prev.some((location) => location.id === created.id)) return prev;
          return [...prev, created];
        });
        setLocationId(created.id);
        merchantInvalidators.dashboard(queryClient);
        toast.success(`Created ${created.name}`);
        return created;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not create store");
        return null;
      }
    },
    [queryClient, setLocationId],
  );

  const selectedLabel = useMemo(() => {
    if (locationId === "all") return "All stores";
    return locations.find((location) => location.id === locationId)?.name ?? "Store";
  }, [locationId, locations]);

  const value = useMemo(
    () => ({
      locationId,
      setLocationId,
      locations,
      loading,
      selectedLabel,
      refreshLocations,
      createLocation,
    }),
    [
      locationId,
      setLocationId,
      locations,
      loading,
      selectedLabel,
      refreshLocations,
      createLocation,
    ],
  );

  return (
    <LocationScopeContext.Provider value={value}>{children}</LocationScopeContext.Provider>
  );
}

export function useLocationScope() {
  const ctx = useContext(LocationScopeContext);
  if (!ctx) {
    throw new Error("useLocationScope must be used within LocationScopeProvider");
  }
  return ctx;
}
