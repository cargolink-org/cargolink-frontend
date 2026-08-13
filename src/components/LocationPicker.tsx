import React from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';

import { searchPlaces, type GeocodeResult } from '../api/geocoding';
import type { GeoPoint } from '../state/types';

const SEARCH_DEBOUNCE_MS = 400;

export interface LocationPickerProps {
  /** Field label shown above the input, e.g. "Pickup location". */
  label: string;
  /** The currently-selected point, if any (controlled). */
  value?: GeoPoint;
  /** Fired with a structured {lat, lng, label} — never a raw string. */
  onSelect: (point: GeoPoint) => void;
  placeholder?: string;
  /** Field-level validation error to display, if any. */
  error?: string;
  /** Prefix used to build stable, unique testIDs for this instance. */
  testIDPrefix: string;
}

/**
 * Reusable, prop-driven location picker (task D.1).
 *
 * Search-driven only for now, by deliberate scope decision: `@rnmapbox/maps`
 * is the project's named highest-risk area (technical spec, reserved for
 * Cluster E's dedicated performance spike), so this component doesn't embed
 * an interactive map. A pin-drop-on-map mode can be layered on top of this
 * same `onSelect({lat, lng, label})` contract later without changing any
 * caller.
 *
 * All geocoding calls are isolated in `api/geocoding.ts` — this component
 * never calls `fetch` directly.
 */
export function LocationPicker({
  label,
  value,
  onSelect,
  placeholder,
  error,
  testIDPrefix,
}: LocationPickerProps) {
  const [query, setQuery] = React.useState(value?.label ?? '');
  const [results, setResults] = React.useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  // Tracks whether the visible query text still matches a confirmed
  // selection, so results aren't shown again after a pick, and so a
  // selection made "stale" by further typing doesn't silently linger.
  const [hasSearchedOnce, setHasSearchedOnce] = React.useState(false);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against a slow, earlier search response overwriting the results
  // of a faster, more recent one.
  const requestIdRef = React.useRef(0);

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const runSearch = React.useCallback((text: string) => {
    const requestId = ++requestIdRef.current;
    setIsSearching(true);
    setSearchError(null);

    searchPlaces(text)
      .then((found) => {
        if (requestIdRef.current !== requestId) return; // superseded by a newer search
        setResults(found);
        setHasSearchedOnce(true);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) return;
        setResults([]);
        setHasSearchedOnce(true);
        setSearchError("Couldn't search right now. Check your connection and try again.");
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setIsSearching(false);
        }
      });
  }, []);

  const handleChangeText = (text: string) => {
    setQuery(text);
    setHasSearchedOnce(false);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = text.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    debounceRef.current = setTimeout(() => runSearch(trimmed), SEARCH_DEBOUNCE_MS);
  };

  const handleSelect = (result: GeocodeResult) => {
    setQuery(result.label);
    setResults([]);
    setHasSearchedOnce(false);
    onSelect({ lat: result.lat, lng: result.lng, label: result.label });
  };

  const showDropdown = query.trim().length > 0 && (isSearching || hasSearchedOnce);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder ?? 'Search for a place…'}
        value={query}
        onChangeText={handleChangeText}
        accessibilityLabel={label}
        testID={`${testIDPrefix}-location-input`}
      />

      {showDropdown && (
        <View style={styles.dropdown} testID={`${testIDPrefix}-location-dropdown`}>
          {isSearching && (
            <View style={styles.dropdownRow}>
              <ActivityIndicator size="small" testID={`${testIDPrefix}-location-loading`} />
            </View>
          )}

          {!isSearching && searchError && (
            <Text style={styles.searchError} testID={`${testIDPrefix}-location-error`}>
              {searchError}
            </Text>
          )}

          {!isSearching && !searchError && results.length === 0 && (
            <Text style={styles.emptyText} testID={`${testIDPrefix}-location-empty`}>
              No matches found, try a different search.
            </Text>
          )}

          {!isSearching &&
            !searchError &&
            results.map((result) => (
              <Pressable
                key={result.id}
                style={styles.dropdownRow}
                onPress={() => handleSelect(result)}
                accessibilityRole="button"
                testID={`${testIDPrefix}-location-result-${result.id}`}
              >
                <Text style={styles.resultLabel}>{result.label}</Text>
              </Pressable>
            ))}
        </View>
      )}

      {error && (
        <Text style={styles.error} testID={`${testIDPrefix}-location-field-error`}>
          {error}
        </Text>
      )}
    </View>
  );
}

export default LocationPicker;

const styles = StyleSheet.create({
  container: { marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#D8DBE0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#D8DBE0',
    borderRadius: 8,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EDEEF1',
  },
  resultLabel: { fontSize: 14, color: '#1A1D21' },
  emptyText: { fontSize: 13, color: '#5B6270', padding: 12 },
  searchError: { fontSize: 13, color: '#B3261E', padding: 12 },
  error: { color: '#B3261E', fontSize: 12, marginTop: 4 },
});
