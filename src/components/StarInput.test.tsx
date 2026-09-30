import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { StarInput } from './StarInput';

describe('StarInput', () => {
  it('tapping a star calls onChange with the correct value', () => {
    const onChange = jest.fn();
    render(<StarInput value={0} onChange={onChange} />);

    fireEvent.press(screen.getByTestId('star-input-star-3'));

    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('tapping a different star reports that star\u2019s own value, not an offset', () => {
    const onChange = jest.fn();
    render(<StarInput value={2} onChange={onChange} />);

    fireEvent.press(screen.getByTestId('star-input-star-5'));

    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('announces the selected value to screen readers', () => {
    render(<StarInput value={4} onChange={jest.fn()} />);

    expect(screen.getByLabelText('4 out of 5 stars, selected')).toBeTruthy();
  });

  it('announces an unselected state when value is 0', () => {
    render(<StarInput value={0} onChange={jest.fn()} />);

    expect(screen.getByLabelText('No rating selected, 5 stars available')).toBeTruthy();
  });

  it('read-only mode displays the given value and does not call onChange on press', () => {
    const onChange = jest.fn();
    render(<StarInput value={3} onChange={onChange} readOnly testID="rating-display" />);

    // Correct value displayed, correct accessibility announcement.
    expect(screen.getByLabelText('3 out of 5 stars, selected')).toBeTruthy();

    // Non-interactive: pressing a star does nothing.
    fireEvent.press(screen.getByTestId('rating-display-star-5'));
    expect(onChange).not.toHaveBeenCalled();

    expect(screen.getByTestId('rating-display-star-3').props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it('marks stars up to the selected value as selected in accessibilityState', () => {
    render(<StarInput value={3} onChange={jest.fn()} />);

    expect(screen.getByTestId('star-input-star-3').props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(screen.getByTestId('star-input-star-4').props.accessibilityState).toMatchObject({
      selected: false,
    });
  });
});
