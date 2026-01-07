import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import XPRewardModal from '@/src/components/XPRewardModal';

describe('XPRewardModal', () => {
  const defaultProps = {
    visible: true,
    xpAmount: 1000,
    streak: 5,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when visible', () => {
    render(<XPRewardModal {...defaultProps} />);

    expect(screen.getByText('+1000 XP')).toBeTruthy();
  });

  it('should not render content when not visible', () => {
    render(<XPRewardModal {...defaultProps} visible={false} />);

    expect(screen.queryByText('+1000 XP')).toBeNull();
  });

  it('should display XP amount correctly', () => {
    render(<XPRewardModal {...defaultProps} xpAmount={500} />);

    expect(screen.getByText('+500 XP')).toBeTruthy();
  });

  it('should display streak information', () => {
    render(<XPRewardModal {...defaultProps} streak={7} />);

    expect(screen.getByText('7 Day Streak!')).toBeTruthy();
  });

  it('should display Chest Opened title', () => {
    render(<XPRewardModal {...defaultProps} />);

    expect(screen.getByText('Chest Opened!')).toBeTruthy();
  });

  it('should call onClose when modal requests close', () => {
    const onClose = jest.fn();
    render(<XPRewardModal {...defaultProps} onClose={onClose} />);

    // Modal's onRequestClose should trigger onClose
    // This is typically triggered by back button on Android
    const modal = screen.UNSAFE_getByType('Modal' as any);
    fireEvent(modal, 'requestClose');

    expect(onClose).toHaveBeenCalled();
  });

  it('should handle large XP amounts', () => {
    render(<XPRewardModal {...defaultProps} xpAmount={10000} />);

    expect(screen.getByText('+10000 XP')).toBeTruthy();
  });

  it('should handle streak of 1 day', () => {
    render(<XPRewardModal {...defaultProps} streak={1} />);

    expect(screen.getByText('1 Day Streak!')).toBeTruthy();
  });

  it('should handle zero XP', () => {
    render(<XPRewardModal {...defaultProps} xpAmount={0} />);

    expect(screen.getByText('+0 XP')).toBeTruthy();
  });
});
