import '@testing-library/jest-native/extend-expect';

// Silence noisy React Navigation warnings in the test environment; does not
// suppress actual test failures or assertion errors.
jest.spyOn(console, 'warn').mockImplementation(() => {});
