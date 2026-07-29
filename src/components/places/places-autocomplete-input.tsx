"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type InputHTMLAttributes,
} from "react";
import { Input } from "@/components/ui/input";
import { loadGoogleMaps } from "@/lib/places/load-google-maps";
import {
  isGooglePlacesEnabled,
  parseGooglePlace,
  type ParsedPlace,
} from "@/lib/places/parse-place";
import { cn } from "@/lib/utils";

export type { ParsedPlace };

type PlacesAutocompleteInputProps = {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: ParsedPlace) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  style?: CSSProperties;
  /** When false, render a plain <input> instead of the shared Input component (storefront themes). */
  useUiInput?: boolean;
  id?: string;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | "value"
  | "onChange"
  | "disabled"
  | "required"
  | "name"
  | "placeholder"
  | "id"
  | "style"
  | "className"
>;

export function PlacesAutocompleteInput({
  value,
  onChange,
  onPlaceSelect,
  label,
  hint,
  disabled,
  required,
  name,
  placeholder = "Search address…",
  className,
  inputClassName,
  style,
  useUiInput = true,
  id: idProp,
  ...rest
}: PlacesAutocompleteInputProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const placesEnabled = isGooglePlacesEnabled();

  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onPlaceSelect]);

  useEffect(() => {
    if (!placesEnabled || disabled) return;
    let cancelled = false;
    let listener: google.maps.MapsEventListener | null = null;

    if (!document.getElementById("bizgrid-places-pac-style")) {
      const style = document.createElement("style");
      style.id = "bizgrid-places-pac-style";
      style.textContent = ".pac-container{z-index:100000 !important;}";
      document.head.appendChild(style);
    }

    void loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !inputRef.current) return;
        const autocomplete = new maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "address_components", "name", "place_id"],
          componentRestrictions: { country: "ng" },
          types: ["geocode"],
        });
        autocompleteRef.current = autocomplete;
        listener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place?.address_components?.length && !place?.formatted_address) return;
          const parsed = parseGooglePlace(place);
          onPlaceSelectRef.current(parsed);
        });
        setReady(true);
        setLoadError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Places unavailable");
        setReady(false);
      });

    return () => {
      cancelled = true;
      if (listener) listener.remove();
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
      autocompleteRef.current = null;
    };
  }, [placesEnabled, disabled]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <label htmlFor={id} className="block text-sm font-semibold">
          {label}
        </label>
      ) : null}
      {useUiInput ? (
        <Input
          id={id}
          name={name}
          ref={inputRef}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          autoComplete={placesEnabled ? "off" : "street-address"}
          className={inputClassName}
          style={style}
          {...rest}
        />
      ) : (
        <input
          id={id}
          name={name}
          ref={inputRef}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          autoComplete={placesEnabled ? "off" : "street-address"}
          className={inputClassName}
          style={style}
          {...rest}
        />
      )}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {placesEnabled && ready ? (
        <p className="text-[11px] text-muted-foreground">Powered by Google Places</p>
      ) : null}
      {placesEnabled && loadError ? (
        <p className="text-[11px] text-muted-foreground">
          Address search unavailable — type the address manually.
        </p>
      ) : null}
    </div>
  );
}
