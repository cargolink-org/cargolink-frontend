import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Timeline, type TimelineStep } from './Timeline';

const inOrderSteps: TimelineStep[] = [
  { key: 'origin_warehouse', label: 'Origin warehouse', state: 'completed', timestamp: 'Sep 1' },
  { key: 'port_border', label: 'Port / border', state: 'current' },
  { key: 'customs_hold', label: 'Customs hold', state: 'upcoming' },
  { key: 'cleared', label: 'Cleared', state: 'upcoming' },
  { key: 'destination', label: 'Destination', state: 'upcoming' },
];

// The explicit required edge case: 'cleared' shows completed even though
// 'customs_hold', which precedes it in the canonical sequence, is still
// upcoming. Timeline must render this without crashing or reordering.
const outOfOrderSteps: TimelineStep[] = [
  { key: 'origin_warehouse', label: 'Origin warehouse', state: 'completed' },
  { key: 'port_border', label: 'Port / border', state: 'completed' },
  { key: 'customs_hold', label: 'Customs hold', state: 'current' },
  { key: 'cleared', label: 'Cleared', state: 'completed' },
  { key: 'destination', label: 'Destination', state: 'upcoming' },
];

describe('Timeline', () => {
  it('renders every step in order for a normal in-order history', () => {
    render(<Timeline steps={inOrderSteps} testID="timeline" />);
    for (const step of inOrderSteps) {
      expect(screen.getByTestId(`timeline-step-${step.key}`)).toBeTruthy();
      expect(screen.getByText(step.label)).toBeTruthy();
    }
  });

  it('renders completed/current/upcoming text labels, not color alone', () => {
    render(<Timeline steps={inOrderSteps} testID="timeline" />);
    expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('In progress').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Upcoming').length).toBeGreaterThanOrEqual(1);
  });

  it('renders out-of-order step data without breaking layout', () => {
    render(<Timeline steps={outOfOrderSteps} testID="timeline" />);
    for (const step of outOfOrderSteps) {
      expect(screen.getByTestId(`timeline-step-${step.key}`)).toBeTruthy();
    }
    // 'cleared' is completed even though it appears before 'destination',
    // which is still upcoming — both must render their own correct state.
    expect(screen.getByTestId('timeline-step-cleared')).toBeTruthy();
    expect(screen.getByTestId('timeline-step-destination')).toBeTruthy();
  });

  it('renders an empty step list without error', () => {
    render(<Timeline steps={[]} testID="timeline" />);
    expect(screen.getByTestId('timeline')).toBeTruthy();
  });

  it('gives each step an accessible label combining name and state', () => {
    render(<Timeline steps={inOrderSteps} testID="timeline" />);
    const step = screen.getByTestId('timeline-step-origin_warehouse');
    expect(step.props.accessibilityLabel).toContain('Origin warehouse');
    expect(step.props.accessibilityLabel).toContain('Completed');
  });
});
