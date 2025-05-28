import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

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

import AgentsPage from './AgentsPage';

describe('AgentsPage Component', () => {
  test('renders without crashing', () => {
    render(<AgentsPage />);
  });

  test('renders key elements', () => {
    render(<AgentsPage />);
    // Example: check if a heading or element with text "Agents" exists
    const heading = screen.queryByText(/agents/i);
    expect(heading).toBeInTheDocument();
  });
});
