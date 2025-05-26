import React, { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [systemStatus, setSystemStatus] = useState({
    agentsActive: 0,
    tasksRunning: 0,
    memoryUsage: 0,
    lastUpdate: null
  });

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
    document.documentElement.classList.toggle('dark');
  }, []);

  // Add notification
  const addNotification = useCallback((notification) => {
    setNotifications(prev => [{
      id: Date.now(),
      timestamp: new Date(),
      read: false,
      ...notification
    }, ...prev]);
  }, []);

  // Mark notification as read
  const markNotificationAsRead = useCallback((id) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  // Update system status
  const updateSystemStatus = useCallback((newStatus) => {
    setSystemStatus(prev => ({
      ...prev,
      ...newStatus,
      lastUpdate: new Date()
    }));
  }, []);

  const value = {
    sidebarOpen,
    toggleSidebar,
    darkMode,
    toggleDarkMode,
    notifications,
    addNotification,
    markNotificationAsRead,
    systemStatus,
    updateSystemStatus
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use app context
export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};