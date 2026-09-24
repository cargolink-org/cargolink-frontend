import { computeTimelineSteps } from './checkpointTimeline';
import type { CheckpointUpdate } from '../state/types';

describe('computeTimelineSteps', () => {
  it('marks all five stages upcoming for an empty history, with the first as current', () => {
    const steps = computeTimelineSteps([]);
    expect(steps).toHaveLength(5);
    expect(steps[0].state).toBe('current');
    expect(steps.slice(1).every((s) => s.state === 'upcoming')).toBe(true);
  });

  it('marks reached stages completed, next stage current, rest upcoming for in-order history', () => {
    const history: CheckpointUpdate[] = [
      { checkpoint_name: 'origin_warehouse', status: 'completed', timestamp: '2026-09-01T08:00:00Z' },
      { checkpoint_name: 'port_border', status: 'completed', timestamp: '2026-09-02T10:00:00Z' },
    ];
    const steps = computeTimelineSteps(history);
    expect(steps.find((s) => s.key === 'origin_warehouse')?.state).toBe('completed');
    expect(steps.find((s) => s.key === 'port_border')?.state).toBe('completed');
    expect(steps.find((s) => s.key === 'customs_hold')?.state).toBe('current');
    expect(steps.find((s) => s.key === 'cleared')?.state).toBe('upcoming');
    expect(steps.find((s) => s.key === 'destination')?.state).toBe('upcoming');
  });

  it('marks the final stage completed once the full sequence has been reached', () => {
    const history: CheckpointUpdate[] = [
      'origin_warehouse',
      'port_border',
      'customs_hold',
      'cleared',
      'destination',
    ].map((name) => ({
      checkpoint_name: name as CheckpointUpdate['checkpoint_name'],
      status: 'completed',
    }));
    const steps = computeTimelineSteps(history);
    expect(steps.every((s) => s.state === 'completed')).toBe(true);
  });

  it('does not throw and renders every stage on out-of-order data', () => {
    // 'cleared' (position 4 of 5) completed before 'customs_hold' (position 3).
    const history: CheckpointUpdate[] = [
      { checkpoint_name: 'origin_warehouse', status: 'completed' },
      { checkpoint_name: 'port_border', status: 'completed' },
      { checkpoint_name: 'cleared', status: 'completed' },
    ];
    expect(() => computeTimelineSteps(history)).not.toThrow();
    const steps = computeTimelineSteps(history);
    expect(steps).toHaveLength(5);
    // The earliest not-yet-completed stage in canonical order is 'current'...
    expect(steps.find((s) => s.key === 'customs_hold')?.state).toBe('current');
    // ...while 'cleared' still correctly shows completed, even though it
    // precedes 'customs_hold' in the canonical sequence.
    expect(steps.find((s) => s.key === 'cleared')?.state).toBe('completed');
    expect(steps.find((s) => s.key === 'destination')?.state).toBe('upcoming');
  });

  it('ignores a non-completed status update for a stage (still shows as not-yet-reached)', () => {
    const history: CheckpointUpdate[] = [
      { checkpoint_name: 'origin_warehouse', status: 'pending' },
    ];
    const steps = computeTimelineSteps(history);
    expect(steps.find((s) => s.key === 'origin_warehouse')?.state).toBe('current');
  });

  it('formats a valid timestamp and omits it when absent', () => {
    const history: CheckpointUpdate[] = [
      { checkpoint_name: 'origin_warehouse', status: 'completed', timestamp: '2026-09-01T08:00:00Z' },
    ];
    const steps = computeTimelineSteps(history);
    const origin = steps.find((s) => s.key === 'origin_warehouse');
    expect(origin?.timestamp).toBeTruthy();
    const border = steps.find((s) => s.key === 'port_border');
    expect(border?.timestamp).toBeNull();
  });
});
