import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect'; // Import for toBeInTheDocument matcher

// Mock react-icons/fi to avoid import errors in tests
jest.mock('react-icons/fi', () => {
  return {
    FiMenu: () => <svg data-testid="FiMenu" />,
    FiX: () => <svg data-testid="FiX" />,
    FiHome: () => <svg data-testid="FiHome" />,
    FiUsers: () => <svg data-testid="FiUsers" />,
    FiDatabase: () => <svg data-testid="FiDatabase" />,
    FiBrain: () => <svg data-testid="FiBrain" />,
    FiSettings: () => <svg data-testid="FiSettings" />,
    FiBarChart2: () => <svg data-testid="FiBarChart2" />,
  };
});

import Dashboard from './Dashboard';

describe('Dashboard Component', () => {
  test('renders without crashing', () => {
    render(<Dashboard />);
  });

  test('renders key elements', () => {
    render(<Dashboard />);
    // Example: check if a heading or element with text "Dashboard" exists
    const heading = screen.queryByText(/dashboard/i);
    expect(heading).toBeInTheDocument();
  });
});
