import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import RatingScreen from './RatingScreen';
import { submitRating } from '../../api/ratings';
import { useLoadStore } from '../../state/loadStore';

jest.mock('../../api/ratings', () => ({
  ...jest.requireActual('../../api/ratings'),
  submitRating: jest.fn(),
}));

const mockSubmitRating = submitRating as jest.Mock;
const mockGoBack = jest.fn();
const navigation = { goBack: mockGoBack, navigate: jest.fn() } as any;
const route = {
  params: { loadId: 'load-1', rateeId: 'load-1' },
  key: 'RatingScreen',
  name: 'Rating',
} as any;

function resetLoadStore() {
  useLoadStore.setState({ ratingSubmitted: {} });
}

describe('RatingScreen (transporter)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetLoadStore();
  });

  it('renders the submittable form when no rating exists yet for this load', () => {
    render(<RatingScreen navigation={navigation} route={route} />);

    expect(screen.getByTestId('rating-form')).toBeTruthy();
    expect(screen.getByText('Rate the shipper')).toBeTruthy();
    expect(screen.queryByTestId('rating-form-readonly')).toBeNull();
  });

  it('blocks submission until a star rating is selected (1–5 validation)', () => {
    render(<RatingScreen navigation={navigation} route={route} />);

    fireEvent.press(screen.getByTestId('rating-form-submit-button'));

    expect(screen.getByTestId('rating-form-submit-button').props.accessibilityState).toMatchObject({
      disabled: true,
    });
    expect(mockSubmitRating).not.toHaveBeenCalled();
  });

  it('duplicate-submission guard: mounting with an already-submitted rating renders read-only mode, not the form', () => {
    useLoadStore.setState({ ratingSubmitted: { 'load-1': { score: 2 } } });

    render(<RatingScreen navigation={navigation} route={route} />);

    expect(screen.getByTestId('rating-form-readonly')).toBeTruthy();
    expect(screen.getByText('You rated this trip')).toBeTruthy();
    expect(screen.queryByTestId('rating-form')).toBeNull();
    expect(mockSubmitRating).not.toHaveBeenCalled();
  });

  it('successful submit sends the correct payload, updates loadStore, and navigates back', async () => {
    mockSubmitRating.mockResolvedValue({ rating_id: 'rating-2' });

    render(<RatingScreen navigation={navigation} route={route} />);

    fireEvent.press(screen.getByTestId('rating-form-star-input-star-4'));
    fireEvent.press(screen.getByTestId('rating-form-submit-button'));

    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());

    expect(mockSubmitRating).toHaveBeenCalledWith({
      load_id: 'load-1',
      ratee_id: 'load-1', // the route's rateeId — never user-editable
      score: 4,
      comment: undefined,
    });
    expect(useLoadStore.getState().ratingSubmitted['load-1']).toEqual({ score: 4, comment: undefined });
  });

  it('submit failure preserves entered score/comment and shows a retry-capable inline error', async () => {
    mockSubmitRating.mockRejectedValue({});

    render(<RatingScreen navigation={navigation} route={route} />);

    fireEvent.press(screen.getByTestId('rating-form-star-input-star-2'));
    fireEvent.changeText(screen.getByTestId('rating-form-comment-input'), 'Late pickup');
    fireEvent.press(screen.getByTestId('rating-form-submit-button'));

    await waitFor(() => expect(screen.getByTestId('rating-form-error')).toBeTruthy());
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();

    expect(screen.getByTestId('rating-form-star-input-star-2').props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(screen.getByTestId('rating-form-comment-input').props.value).toBe('Late pickup');

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(useLoadStore.getState().ratingSubmitted['load-1']).toBeUndefined();
  });

  it('surfaces a server-side duplicate rejection with a clear message instead of crashing', async () => {
    mockSubmitRating.mockRejectedValue({ code: 'RATING_DUPLICATE', status: 409 });

    render(<RatingScreen navigation={navigation} route={route} />);

    fireEvent.press(screen.getByTestId('rating-form-star-input-star-5'));
    fireEvent.press(screen.getByTestId('rating-form-submit-button'));

    await waitFor(() => expect(screen.getByText('You have already rated this trip.')).toBeTruthy());
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('"Skip for now" navigates away without submitting', () => {
    render(<RatingScreen navigation={navigation} route={route} />);

    fireEvent.press(screen.getByTestId('rating-form-skip-button'));

    expect(mockGoBack).toHaveBeenCalled();
    expect(mockSubmitRating).not.toHaveBeenCalled();
  });
});
