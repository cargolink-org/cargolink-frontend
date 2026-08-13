import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { LocationPicker } from './LocationPicker';
import { searchPlaces } from '../api/geocoding';

jest.mock('../api/geocoding');

const mockSearchPlaces = searchPlaces as jest.Mock;

describe('LocationPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debounces search-as-you-type: rapid keystrokes trigger only one search call', async () => {
    mockSearchPlaces.mockResolvedValue([{ id: '1', label: 'Pune, Maharashtra', lat: 18.52, lng: 73.86 }]);

    render(
      <LocationPicker label="Pickup location" onSelect={jest.fn()} testIDPrefix="source" />
    );

    const input = screen.getByTestId('source-location-input');
    fireEvent.changeText(input, 'P');
    fireEvent.changeText(input, 'Pu');
    fireEvent.changeText(input, 'Pun');
    fireEvent.changeText(input, 'Pune');

    await waitFor(() => expect(mockSearchPlaces).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(mockSearchPlaces).toHaveBeenCalledWith('Pune');
  });

  it('shows a clear "no matches" message when search returns zero results', async () => {
    mockSearchPlaces.mockResolvedValue([]);

    render(<LocationPicker label="Destination" onSelect={jest.fn()} testIDPrefix="destination" />);

    fireEvent.changeText(screen.getByTestId('destination-location-input'), 'Nowhereville');

    await waitFor(() => expect(screen.getByTestId('destination-location-empty')).toBeTruthy(), {
      timeout: 2000,
    });
    expect(screen.getByText(/no matches found, try a different search/i)).toBeTruthy();
  });

  it('calls onSelect with a structured {lat, lng, label} when a result is tapped', async () => {
    mockSearchPlaces.mockResolvedValue([
      { id: 'abc', label: 'Mumbai, Maharashtra, India', lat: 19.076, lng: 72.8777 },
    ]);
    const onSelect = jest.fn();

    render(<LocationPicker label="Pickup location" onSelect={onSelect} testIDPrefix="source" />);

    fireEvent.changeText(screen.getByTestId('source-location-input'), 'Mumbai');

    const result = await waitFor(() => screen.getByTestId('source-location-result-abc'), {
      timeout: 2000,
    });
    fireEvent.press(result);

    expect(onSelect).toHaveBeenCalledWith({
      lat: 19.076,
      lng: 72.8777,
      label: 'Mumbai, Maharashtra, India',
    });
    // The input reflects the selected label, never a raw unconfirmed string.
    expect(screen.getByTestId('source-location-input').props.value).toBe('Mumbai, Maharashtra, India');
  });

  it('shows a distinct error state when the search itself fails', async () => {
    mockSearchPlaces.mockRejectedValue(new Error('network down'));

    render(<LocationPicker label="Pickup location" onSelect={jest.fn()} testIDPrefix="source" />);

    fireEvent.changeText(screen.getByTestId('source-location-input'), 'Pune');

    await waitFor(() => expect(screen.getByTestId('source-location-error')).toBeTruthy(), {
      timeout: 2000,
    });
  });

  it('clears results without searching when the query is cleared to empty', async () => {
    mockSearchPlaces.mockResolvedValue([{ id: '1', label: 'Pune', lat: 18.52, lng: 73.86 }]);

    render(<LocationPicker label="Pickup location" onSelect={jest.fn()} testIDPrefix="source" />);

    const input = screen.getByTestId('source-location-input');
    fireEvent.changeText(input, 'Pune');
    fireEvent.changeText(input, '');

    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(mockSearchPlaces).not.toHaveBeenCalled();
    expect(screen.queryByTestId('source-location-dropdown')).toBeNull();
  });
});
