"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useLocationScope } from "@/lib/location-scope";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function LocationScopeSwitcher({ className = "" }: { className?: string }) {
  const { locationId, setLocationId, locations, selectedLabel, createLocation, loading } =
    useLocationScope();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onCreate = async () => {
    setSubmitting(true);
    const created = await createLocation(name);
    setSubmitting(false);
    if (created) {
      setName("");
      setCreateOpen(false);
    }
  };

  return (
    <>
      <div className={`flex min-w-0 items-center gap-2 ${className}`}>
        <Select
          value={locationId}
          disabled={loading}
          onValueChange={(value) => {
            if (value === "__create__") {
              setCreateOpen(true);
              return;
            }
            setLocationId(value);
          }}
        >
          <SelectTrigger
            className="h-9 w-[9.5rem] rounded-full border-border bg-card text-sm shadow-soft sm:w-[12rem]"
            aria-label="Store location"
          >
            <SelectValue placeholder="All stores">{selectedLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stores</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
            <SelectItem value="__create__">+ Create store</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="hidden h-9 w-9 rounded-full border-border bg-card shadow-soft sm:inline-flex"
          onClick={() => setCreateOpen(true)}
          aria-label="Create store"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create store location</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="e.g. Ikeja branch"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void onCreate();
              }
            }}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submitting || !name.trim()}
              onClick={() => void onCreate()}
            >
              {submitting ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
