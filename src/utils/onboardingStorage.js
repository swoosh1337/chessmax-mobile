import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@chessmaxx:hasCompletedOnboarding';

export const hasCompletedOnboarding = async () => {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  } catch (error) {
    console.warn('Error checking onboarding status:', error);
    return false;
  }
};

export const markOnboardingComplete = async () => {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    return true;
  } catch (error) {
    console.warn('Error marking onboarding complete:', error);
    return false;
  }
};

export const resetOnboarding = async () => {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    return true;
  } catch (error) {
    console.warn('Error resetting onboarding:', error);
    return false;
  }
};
