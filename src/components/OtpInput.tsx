import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OtpInput from '../../src/components/OtpInput';

function Harness({ onComplete }: { onComplete?: (v: string) => void }) {
  const [value, setValue] = React.useState('');
  return <OtpInput value={value} onChangeText={setValue} onComplete={onComplete} />;
}

describe('OtpInput', () => {
  it('renders 6 digit boxes by default', () => {
    const { getByTestId } = render(<Harness />);
    for (let i = 0; i < 6; i++) {
      expect(getByTestId(`otp-digit-${i}`)).toBeTruthy();
    }
  });

  it('calls onComplete with the full value once all 6 digits are entered', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<Harness onComplete={onComplete} />);
    '123456'.split('').forEach((digit, i) => {
      fireEvent.changeText(getByTestId(`otp-digit-${i}`), digit);
    });
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('does not call onComplete when fewer than 6 digits are entered', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<Harness onComplete={onComplete} />);
    '123'.split('').forEach((digit, i) => {
      fireEvent.changeText(getByTestId(`otp-digit-${i}`), digit);
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('strips non-numeric characters from input', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<Harness onComplete={onComplete} />);
    fireEvent.changeText(getByTestId('otp-digit-0'), 'a');
    expect(getByTestId('otp-digit-0').props.value).toBe('');
  });

  it('supports backspace navigating focus back to the previous box', () => {
    const { getByTestId } = render(<Harness />);
    const box1 = getByTestId('otp-digit-1');
    const focusSpy = jest.spyOn(getByTestId('otp-digit-0'), 'focus' as any);
    fireEvent(box1, 'keyPress', { nativeEvent: { key: 'Backspace' } });
    expect(focusSpy).toHaveBeenCalled();
  });
});
