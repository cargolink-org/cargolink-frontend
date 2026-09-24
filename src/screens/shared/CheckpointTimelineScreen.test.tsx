import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import CheckpointTimelineScreen from '../../../src/screens/shared/CheckpointTimelineScreen';
import { getCheckpoints, postCheckpoint } from '../../../src/api/checkpoints';
import { useAuthStore } from '../../../src/state/authStore';
import { useLoadStore } from '../../../src/state/loadStore';

jest.mock('../../../src/api/checkpoints');
jest.mock('../../../src/state/authStore', () => ({
  useAuthStore: jest.fn(),
}));

const mockedUseAuthStore = useAuthStore as unknown as jest.Mock;

function setRole(role: 'shipper' | 'transporter') {
  mockedUseAuthStore.mockImplementation((selector: (s: { role: string }) => unknown) =>
    selector({ role })
  );
}

function routeFor(loadId: string) {
  return { params: { loadId }, key: 'CheckpointTimeline', name: 'CheckpointTimeline' } as any;
}

describe('CheckpointTimelineScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLoadStore.setState({ checkpoints: {}, checkpointsLoading: {}, checkpointsError: {} });
  });

  it('renders the timeline from fetched checkpoint history', async () => {
    (getCheckpoints as jest.Mock).mockResolvedValue([
      { checkpoint_id: 'cp-1', checkpoint_name: 'origin_warehouse', status: 'completed', timestamp: '2026-09-01T08:00:00Z' },
    ]);
    setRole('shipper');

    render(<CheckpointTimelineScreen route={routeFor('load-1')} />);

    await waitFor(() => {
      expect(screen.getByTestId('checkpoint-timeline-step-origin_warehouse')).toBeTruthy();
    });
    expect(screen.getByTestId('checkpoint-timeline-step-destination')).toBeTruthy();
  });

  it('renders out-of-order checkpoint data without crashing', async () => {
    (getCheckpoints as jest.Mock).mockResolvedValue([
      { checkpoint_name: 'origin_warehouse', status: 'completed' },
      { checkpoint_name: 'cleared', status: 'completed' },
    ]);
    setRole('shipper');

    render(<CheckpointTimelineScreen route={routeFor('load-ooo')} />);

    await waitFor(() => {
      expect(screen.getByTestId('checkpoint-timeline-step-cleared')).toBeTruthy();
    });
    expect(screen.getByTestId('checkpoint-timeline-step-customs_hold')).toBeTruthy();
    expect(screen.getByTestId('checkpoint-timeline-step-destination')).toBeTruthy();
  });

  it('does NOT render the Update Status action for a shipper session', async () => {
    (getCheckpoints as jest.Mock).mockResolvedValue([]);
    setRole('shipper');

    render(<CheckpointTimelineScreen route={routeFor('load-2')} />);

    await waitFor(() => screen.getByTestId('checkpoint-timeline'));
    expect(screen.queryByTestId('checkpoint-update-open-button')).toBeNull();
  });

  it('renders the Update Status action for a transporter session', async () => {
    (getCheckpoints as jest.Mock).mockResolvedValue([]);
    setRole('transporter');

    render(<CheckpointTimelineScreen route={routeFor('load-3')} />);

    await waitFor(() => {
      expect(screen.getByTestId('checkpoint-update-open-button')).toBeTruthy();
    });
  });

  it('submits a checkpoint update restricted to the enum, with no optimistic update before confirmation', async () => {
    (getCheckpoints as jest.Mock).mockResolvedValue([]);
    (postCheckpoint as jest.Mock).mockResolvedValue({ checkpoint_id: 'cp-new' });
    setRole('transporter');

    render(<CheckpointTimelineScreen route={routeFor('load-4')} />);

    await waitFor(() => screen.getByTestId('checkpoint-update-open-button'));
    fireEvent.press(screen.getByTestId('checkpoint-update-open-button'));

    const picker = await waitFor(() => screen.getByTestId('checkpoint-name-picker'));
    fireEvent(picker, 'valueChange', 'port_border');

    // Before submission resolves, the timeline must not have already
    // reflected the new status (no optimistic update).
    expect(screen.getByTestId('checkpoint-timeline-step-port_border').props.accessibilityLabel).not.toContain(
      'Completed'
    );

    fireEvent.press(screen.getByTestId('checkpoint-update-submit-button'));

    await waitFor(() => {
      expect(postCheckpoint).toHaveBeenCalledWith('load-4', 'port_border', 'completed');
    });

    await waitFor(() => {
      expect(
        screen.getByTestId('checkpoint-timeline-step-port_border').props.accessibilityLabel
      ).toContain('Completed');
    });
  });

  it('shows a retry-capable error state when the fetch fails', async () => {
    (getCheckpoints as jest.Mock).mockRejectedValue(new Error('network error'));
    setRole('shipper');

    render(<CheckpointTimelineScreen route={routeFor('load-5')} />);

    await waitFor(() => {
      expect(screen.getByTestId('checkpoint-timeline-error')).toBeTruthy();
    });
    expect(screen.getByTestId('checkpoint-timeline-retry-button')).toBeTruthy();
  });
});
