import React from 'react';
import { render, screen } from '@testing-library/react-native';
import StatBar from '@/src/components/StatBar';

describe('StatBar', () => {
  it('should render XP value', () => {
    render(<StatBar xp={1500} streak={5} />);

    expect(screen.getByText('1500')).toBeTruthy();
  });

  it('should render streak value', () => {
    render(<StatBar xp={1000} streak={7} />);

    expect(screen.getByText('7')).toBeTruthy();
  });

  it('should render both XP and streak', () => {
    render(<StatBar xp={2500} streak={14} />);

    expect(screen.getByText('2500')).toBeTruthy();
    expect(screen.getByText('14')).toBeTruthy();
  });

  it('should handle zero values', () => {
    render(<StatBar xp={0} streak={0} />);

    const zeroElements = screen.getAllByText('0');
    expect(zeroElements.length).toBe(2);
  });

  it('should handle large XP values', () => {
    render(<StatBar xp={999999} streak={365} />);

    expect(screen.getByText('999999')).toBeTruthy();
    expect(screen.getByText('365')).toBeTruthy();
  });

  it('should render star icon for XP', () => {
    const { UNSAFE_getAllByType } = render(<StatBar xp={100} streak={1} />);

    // Check that images are rendered (star and flame icons)
    const images = UNSAFE_getAllByType('Image' as any);
    expect(images.length).toBeGreaterThanOrEqual(2);
  });
});
