/// <reference types="google.maps" />
import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: { address: string; lat?: number; lng?: number }) => void;
  placeholder?: string;
  className?: string;
}

let googleMapsLoaded = false;
let googleMapsLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadGoogleMaps(): Promise<void> {
  if (googleMapsLoaded) return Promise.resolve();
  return new Promise((resolve) => {
    if (googleMapsLoading) {
      loadCallbacks.push(resolve);
      return;
    }
    googleMapsLoading = true;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=fr`;
    script.async = true;
    script.onload = () => {
      googleMapsLoaded = true;
      googleMapsLoading = false;
      resolve();
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

export const AddressAutocomplete = ({ value, onChange, onPlaceSelect, placeholder = "Rechercher une adresse...", className }: AddressAutocompleteProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGoogleMaps().then(() => {
      if (inputRef.current) {
        serviceRef.current = new google.maps.places.AutocompleteService();
        const dummyDiv = document.createElement("div");
        placesServiceRef.current = new google.maps.places.PlacesService(dummyDiv);
      }
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback((input: string) => {
    if (!serviceRef.current || input.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    serviceRef.current.getPlacePredictions({ input, types: ["geocode", "establishment"] }, (predictions, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
        setSuggestions(predictions);
        setShowDropdown(true);
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    });
  }, []);

  const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    onChange(prediction.description);
    setShowDropdown(false);
    if (placesServiceRef.current && onPlaceSelect) {
      placesServiceRef.current.getDetails({ placeId: prediction.place_id, fields: ["geometry", "formatted_address"] }, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          onPlaceSelect({
            address: place.formatted_address || prediction.description,
            lat: place.geometry?.location?.lat(),
            lng: place.geometry?.location?.lng(),
          });
        }
      });
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            fetchSuggestions(e.target.value);
          }}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className={`pl-9 ${className || ""}`}
        />
      </div>
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((s) => (
            <button
              key={s.place_id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => handleSelect(s)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <span>{s.description}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
