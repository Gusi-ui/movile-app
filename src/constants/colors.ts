export const Colors = {
  // Primary colors
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#3b82f6',

  // Background colors
  background: '#f8fafc',
  backgroundLight: '#f1f5f9',
  backgroundCard: '#ffffff',

  // Text colors
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  textLight: '#ffffff',
  textMuted: '#6b7280',
  textDark: '#1f2937',
  textGray: '#374151',

  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#dc2626',
  info: '#3b82f6',

  // Light status colors
  successLight: '#d1fae5',
  warningLight: '#fef3c7',
  errorLight: '#fee2e2',
  infoLight: '#dbeafe',

  // Priority colors
  priorityUrgent: '#dc2626',
  priorityHigh: '#ea580c',
  priorityMedium: '#d97706',
  priorityLow: '#65a30d',

  // Status specific colors
  statusPending: '#f59e0b',
  statusApproved: '#3b82f6',
  statusPaid: '#10b981',
  statusDisputed: '#ef4444',
  statusDefault: '#6b7280',

  // Border colors
  border: '#e2e8f0',
  borderLight: '#e5e7eb',

  // Shadow
  shadow: '#000000',

  // Accent colors
  accent: '#8b5cf6',
  accentLight: '#a78bfa',

  // Neutral colors
  neutral50: '#f8fafc',
  neutral100: '#f1f5f9',
  neutral200: '#e2e8f0',
  neutral300: '#cbd5e1',
  neutral400: '#94a3b8',
  neutral500: '#64748b',
  neutral600: '#475569',
  neutral700: '#334155',
  neutral800: '#1e293b',
  neutral900: '#0f172a',
} as const;

export type ColorKey = keyof typeof Colors;
