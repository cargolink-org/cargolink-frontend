import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import LoadPostingScreen from './LoadPostingScreen';
import { postLoad, isLoadPostError } from '../../api/loads';
import { useLoadStore } from '../../state/loadStore';

jest.mock('../../api/loads', () => ({
  ...jest.requireActual('../../api/loads'),
  postLoad: jest.fn(),
}));

// LocationPicker has its own dedicated test file (search debounce, empty
// state, selection callback). Here it's replaced with a minimal fake so
// these tests can drive LoadPostingScreen's own orchestration (validation,
// confirmation, submit/navigate, error handling) without re-exercising
// LocationPicker's internals.
jest.mock(
  '../../components/LocationPicker',
  () => {
    const { Pressable, Text, View } = require('react-native');
    const points: Record<string, { lat: number; lng: number; label: string }> = {
      source: { lat: 18.5204, lng: 73.8567, label: 'Pune, Maharashtra' },
      destination: { lat: 19.076, lng: 72.8777, label: 'Mumbai, Maharashtra' },
    };
    return {
      LocationPicker: ({ label, onSelect, testIDPrefix }: any) => (
        <View>
          <Pressable
            testID={`${testIDPrefix}-location-mock-select`}
            onPress={() => onSelect(points[testIDPrefix])}
          >
            <Text>{label}</Text>
          </Pressable>
          {/* Lets tests exercise the source === destination guard by
              selecting the same underlying point regardless of which
              field this instance represents. */}
          <Pressable
            testID={`${testIDPrefix}-location-mock-select-duplicate-of-source`}
            onPress={() => onSelect(points.source)}
          >
            <Text>{label} (same as source)</Text>
          </Pressable>
        </View>
      ),
    };
  }
);

const mockPostLoad = postLoad as jest.Mock;
const mockNavigate = jest.fn();
const navigation = { navigate: mockNavigate } as any;
const route = { params: undefined, key: 'LoadPosting', name: 'LoadPosting' } as any;

const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);
const futureDateText = futureDate.toISOString().slice(0, 10);

function fillValidForm() {
  fireEvent.changeText(screen.getByTestId('load-weight-input'), '1200');
  fireEvent(screen.getByTestId('cargo-type-picker'), 'valueChange', 'general');
  fireEvent.press(screen.getByTestId('source-location-mock-select'));
  fireEvent.press(screen.getByTestId('destination-location-mock-select'));
  fireEvent.changeText(screen.getByTestId('load-deadline-date-input'), futureDateText);
  fireEvent.changeText(screen.getByTestId('load-deadline-time-input'), '09:00');
  fireEvent(screen.getByTestId('preferred-vehicle-type-picker'), 'valueChange', 'truck');
}

describe('LoadPostingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLoadStore.setState({
      draft: {},
      activeLoadId: null,
      isPosting: false,
      postError: null,
    });
  });

  it('disables the submit button until the form is fully valid', async () => {
    render(<LoadPostingScreen navigation={navigation} route={route} />);

    expect(screen.getByTestId('load-post-submit-button').props.accessibilityState?.disabled).toBe(
      true
    );

    fillValidForm();

    await waitFor(() =>
      expect(
        screen.getByTestId('load-post-submit-button').props.accessibilityState?.disabled
      ).toBe(false)
    );
  });

  it('blocks submission and shows an inline error when source and destination match', async () => {
    render(<LoadPostingScreen navigation={navigation} route={route} />);

    fireEvent.changeText(screen.getByTestId('load-weight-input'), '1200');
    fireEvent(screen.getByTestId('cargo-type-picker'), 'valueChange', 'general');
    fireEvent.press(screen.getByTestId('source-location-mock-select'));
    await waitFor(() => expect(screen.getByTestId('source-location-mock-select')).toBeTruthy());
    fireEvent.press(screen.getByTestId('destination-location-mock-select-duplicate-of-source'));
    fireEvent.changeText(screen.getByTestId('load-deadline-date-input'), futureDateText);
    fireEvent.changeText(screen.getByTestId('load-deadline-time-input'), '09:00');
    fireEvent(screen.getByTestId('preferred-vehicle-type-picker'), 'valueChange', 'truck');

    await waitFor(() => {
      expect(screen.getByText(/cannot be the same location/i)).toBeTruthy();
    });
    expect(screen.getByTestId('load-post-submit-button').props.accessibilityState?.disabled).toBe(
      true
    );
    fireEvent.press(screen.getByTestId('load-post-submit-button'));
    expect(mockPostLoad).not.toHaveBeenCalled();
  });

  it('requires confirmation for weight above 50,000kg instead of blocking outright', async () => {
    render(<LoadPostingScreen navigation={navigation} route={route} />);

    fillValidForm();
    fireEvent.changeText(screen.getByTestId('load-weight-input'), '60000');

    await waitFor(() =>
      expect(
        screen.getByTestId('load-post-submit-button').props.accessibilityState?.disabled
      ).toBe(false)
    );

    fireEvent.press(screen.getByTestId('load-post-submit-button'));

    await waitFor(() => expect(screen.getByTestId('high-weight-confirm-banner')).toBeTruthy());
    expect(mockPostLoad).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('high-weight-confirm-button'));

    await waitFor(() => expect(mockPostLoad).toHaveBeenCalled());
  });

  it('lets the shipper cancel a high-weight confirmation without posting', async () => {
    render(<LoadPostingScreen navigation={navigation} route={route} />);

    fillValidForm();
    fireEvent.changeText(screen.getByTestId('load-weight-input'), '60000');
    await waitFor(() =>
      expect(
        screen.getByTestId('load-post-submit-button').props.accessibilityState?.disabled
      ).toBe(false)
    );

    fireEvent.press(screen.getByTestId('load-post-submit-button'));
    await waitFor(() => expect(screen.getByTestId('high-weight-confirm-banner')).toBeTruthy());

    fireEvent.press(screen.getByTestId('high-weight-cancel-button'));

    expect(screen.queryByTestId('high-weight-confirm-banner')).toBeNull();
    expect(mockPostLoad).not.toHaveBeenCalled();
  });

  it('posts a valid load and navigates to MatchResults with the returned loadId', async () => {
    mockPostLoad.mockResolvedValue({ load_id: 'load-999', status: 'posted' });

    render(<LoadPostingScreen navigation={navigation} route={route} />);

    fillValidForm();
    await waitFor(() =>
      expect(
        screen.getByTestId('load-post-submit-button').props.accessibilityState?.disabled
      ).toBe(false)
    );

    fireEvent.press(screen.getByTestId('load-post-submit-button'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('MatchResults', { loadId: 'load-999' });
    });
    expect(useLoadStore.getState().activeLoadId).toBe('load-999');
    expect(useLoadStore.getState().draft).toEqual({});
  });

  it('shows a distinct banner (not a field error) and preserves form data on a network failure', async () => {
    mockPostLoad.mockRejectedValue({ kind: 'network', message: 'No network connection. Check your connection and try again.' });

    render(<LoadPostingScreen navigation={navigation} route={route} />);

    fillValidForm();
    await waitFor(() =>
      expect(
        screen.getByTestId('load-post-submit-button').props.accessibilityState?.disabled
      ).toBe(false)
    );

    fireEvent.press(screen.getByTestId('load-post-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('load-post-error-banner')).toBeTruthy();
    });
    expect(screen.getByText(/no network connection/i)).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
    // Weight field still holds what the shipper entered — not cleared.
    expect(screen.getByTestId('load-weight-input').props.value).toBe('1200');
  });

  it('shows the server-side rejection message as a banner distinct from field errors', async () => {
    mockPostLoad.mockRejectedValue({
      kind: 'validation',
      message: 'No transporters currently service this corridor.',
    });

    render(<LoadPostingScreen navigation={navigation} route={route} />);

    fillValidForm();
    await waitFor(() =>
      expect(
        screen.getByTestId('load-post-submit-button').props.accessibilityState?.disabled
      ).toBe(false)
    );

    fireEvent.press(screen.getByTestId('load-post-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('load-post-error-banner')).toBeTruthy();
    });
    expect(screen.getByText(/no transporters currently service this corridor/i)).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows an informational, non-blocking note for hazardous/refrigerated cargo', async () => {
    render(<LoadPostingScreen navigation={navigation} route={route} />);

    fireEvent(screen.getByTestId('cargo-type-picker'), 'valueChange', 'hazardous');

    await waitFor(() => expect(screen.getByTestId('cargo-type-note')).toBeTruthy());
  });
});

// Sanity check that the shared error-classification helper is re-exported
// correctly and usable from the screen's import path.
describe('isLoadPostError re-export sanity', () => {
  it('is a function', () => {
    expect(typeof isLoadPostError).toBe('function');
  });
});
