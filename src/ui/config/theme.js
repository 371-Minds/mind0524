// Theme configuration
export const theme = {
  colors: {
    primary: '#3B82F6',     // Blue-500
    secondary: '#6B7280',   // Gray-500
    success: '#10B981',     // Green-500
    warning: '#F59E0B',     // Yellow-500
    danger: '#EF4444',      // Red-500
    info: '#3B82F6',        // Blue-500
    
    // Dark mode specific
    dark: {
      background: '#111827', // Gray-900
      paper: '#1F2937',     // Gray-800
      border: '#374151',    // Gray-700
      text: {
        primary: '#F9FAFB',   // Gray-50
        secondary: '#D1D5DB', // Gray-300
        disabled: '#6B7280'   // Gray-500
      }
    }
  },
  
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem' // 30px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },

  spacing: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem'
  },

  breakpoints: {
    xs: '0px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
  },

  transitions: {
    DEFAULT: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    fast: '100ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)'
  },

  zIndex: {
    negative: -1,
    0: 0,
    10: 10,
    20: 20,
    30: 30,
    40: 40,
    50: 50,
    modal: 999,
    tooltip: 1000
  }
};

// Application settings
export const settings = {
  sidebarWidth: 280,          // pixels
  headerHeight: 64,            // pixels
  containerMaxWidth: 1280,     // pixels
  gridSpacing: 24,            // pixels
  borderRadius: 8,            // pixels
  transitionDuration: 200,     // milliseconds
  toastDuration: 3000,        // milliseconds
  graphRefreshInterval: 5000,  // milliseconds
  maxNotifications: 50,        // number
  dateFormat: 'MMM DD, YYYY',  // date format
  timeFormat: 'HH:mm:ss',     // time format
};