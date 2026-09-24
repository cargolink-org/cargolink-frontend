// src/components/Timeline.tsx
//
// Task F.1 — a standalone, prop-driven stepper. Accepts an ordered list of
// steps with a precomputed state each; renders whatever it's given without
// assuming the states are in a "sane" monotonic order (completed steps can
// appear after a "current" step, upcoming steps can appear before a
// completed one) — this is what lets `CheckpointTimelineScreen` render
// out-of-order checkpoint data without the component itself needing any
// special-case handling. See `CheckpointTimelineScreen`'s
// `computeTimelineSteps` for how state is derived from raw
// `CheckpointUpdate[]` data.
//
// Accessibility: the completed/current/upcoming distinction is carried by
// an icon glyph AND a text label on every step, not color alone.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type TimelineStepState = 'completed' | 'current' | 'upcoming';

export interface TimelineStep {
  key: string;
  label: string;
  state: TimelineStepState;
  /** Optional human-readable timestamp string, already formatted by the
   * caller — Timeline does no date parsing/formatting itself. */
  timestamp?: string | null;
}

export interface TimelineProps {
  steps: TimelineStep[];
  testID?: string;
}

const STATE_CONFIG: Record<TimelineStepState, { glyph: string; label: string; fg: string; bg: string }> = {
  completed: { glyph: '\u2713', label: 'Completed', fg: '#1B7A34', bg: '#DFF6E4' },
  current: { glyph: '\u25CF', label: 'In progress', fg: '#0B5FCC', bg: '#DCEBFF' },
  upcoming: { glyph: '\u25CB', label: 'Upcoming', fg: '#5B6270', bg: '#EDEFF2' },
};

export function Timeline({ steps, testID }: TimelineProps) {
  return (
    <View testID={testID} accessibilityRole="list">
      {steps.map((step, index) => {
        const config = STATE_CONFIG[step.state];
        const isLast = index === steps.length - 1;
        return (
          <View
            key={step.key}
            style={styles.row}
            testID={testID ? `${testID}-step-${step.key}` : undefined}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${step.label}: ${config.label}${step.timestamp ? `, ${step.timestamp}` : ''}`}
          >
            <View style={styles.markerColumn}>
              <View style={[styles.marker, { backgroundColor: config.bg }]}>
                <Text style={[styles.markerGlyph, { color: config.fg }]}>{config.glyph}</Text>
              </View>
              {!isLast && <View style={styles.connector} />}
            </View>
            <View style={styles.content}>
              <Text style={styles.label}>{step.label}</Text>
              <Text style={[styles.stateText, { color: config.fg }]}>{config.label}</Text>
              {step.timestamp ? <Text style={styles.timestamp}>{step.timestamp}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  markerColumn: {
    alignItems: 'center',
    width: 32,
  },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerGlyph: {
    fontSize: 14,
    fontWeight: '700',
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: '#DDE1E6',
  },
  content: {
    flex: 1,
    paddingBottom: 20,
    paddingLeft: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1D21',
  },
  stateText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#9AA1AC',
    marginTop: 2,
  },
});
