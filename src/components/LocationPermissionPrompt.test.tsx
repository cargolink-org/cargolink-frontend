import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { LocationPermissionPrompt } from './LocationPermissionPrompt';

describe('LocationPermissionPrompt', () => {
  it('renders nothing meaningful when not visible', () => {
    render(<LocationPermissionPrompt visible={false} step="primer" onContinue={jest.fn()} onDismiss={jest.fn()} />);
    expect(screen.queryByTestId('location-permission-prompt-title')).toBeNull();
  });

  describe('primer step', () => {
    it('explains why background location is needed, before any OS dialog', () => {
      render(<LocationPermissionPrompt visible step="primer" onContinue={jest.fn()} onDismiss={jest.fn()} />);

      expect(screen.getByTestId('location-permission-prompt-title')).toHaveTextContent(
        'Share your live location'
      );
      expect(screen.getByTestId('location-permission-prompt-body')).toBeTruthy();
    });

    it('calls onContinue when "Continue" is pressed', () => {
      const onContinue = jest.fn();
      render(<LocationPermissionPrompt visible step="primer" onContinue={onContinue} onDismiss={jest.fn()} />);

      fireEvent.press(screen.getByTestId('location-permission-prompt-continue'));

      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when "Not now" is pressed', () => {
      const onDismiss = jest.fn();
      render(<LocationPermissionPrompt visible step="primer" onContinue={jest.fn()} onDismiss={onDismiss} />);

      fireEvent.press(screen.getByTestId('location-permission-prompt-dismiss'));

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('denied step', () => {
    it('shows a clear, non-alarming explanation instead of a dead end', () => {
      render(<LocationPermissionPrompt visible step="denied" onContinue={jest.fn()} onDismiss={jest.fn()} />);

      expect(screen.getByTestId('location-permission-prompt-denied-title')).toBeTruthy();
      expect(screen.getByTestId('location-permission-prompt-denied-body')).toHaveTextContent('Settings');
      // The primer's own actions should not also be present on this step.
      expect(screen.queryByTestId('location-permission-prompt-continue')).toBeNull();
    });

    it('calls onDismiss when "OK" is pressed', () => {
      const onDismiss = jest.fn();
      render(<LocationPermissionPrompt visible step="denied" onContinue={jest.fn()} onDismiss={onDismiss} />);

      fireEvent.press(screen.getByTestId('location-permission-prompt-acknowledge'));

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });
});
