// Hybrid localStorage and API implementation for settings persistence
import { UserSettings } from '@/lib/types';

const SETTINGS_KEY = 'userSettings';
// Default to true if not specified
// Always use the hybrid approach
const USE_SERVER_STORAGE = true;

const defaultSettings: UserSettings = {
  botToken: '',
  channelId: '',
  emailDigest: true,
  emailPostPublished: true,
  emailPostFailed: true,
  browserNotifications: false,
  name: 'Demo User',
  email: 'user@example.com',
};

// Load settings from localStorage (for immediate use)
export const loadSettings = (): UserSettings => {
  try {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
  } catch (e) {
    console.error('Failed to load settings from localStorage', e);
  }
  return defaultSettings;
};

// Save settings to localStorage (for immediate persistence)
export const saveSettings = (settings: Partial<UserSettings>): UserSettings => {
  try {
    const currentSettings = loadSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
    return updatedSettings;
  } catch (e) {
    console.error('Failed to save settings to localStorage', e);
    return defaultSettings;
  }
};

// API functions for backend persistence
export const saveSettingsToServer = async (settings: Partial<UserSettings>): Promise<UserSettings> => {
  // Save to localStorage first for immediate feedback
  const localSettings = saveSettings(settings);
  
  // If server storage is disabled, just return the local settings
  if (!USE_SERVER_STORAGE) {
    return localSettings;
  }
  
  try {
    // Import dynamically to avoid circular dependencies
    const { saveSettings: apiSaveSettings } = await import('./api');
    
    // Call the API
    const serverSettings = await apiSaveSettings(settings);
    return serverSettings;
  } catch (e) {
    console.error('Failed to save settings to server, using localStorage', e);
    // Still return the local settings as fallback
    return localSettings;
  }
};

export const loadSettingsFromServer = async (): Promise<UserSettings> => {
  // If server storage is disabled, just return the local settings
  if (!USE_SERVER_STORAGE) {
    return loadSettings();
  }
  
  try {
    // Import dynamically to avoid circular dependencies
    const { fetchSettings } = await import('./api');
    
    // Call the API
    const serverSettings = await fetchSettings();
    
    // Update localStorage with server settings for future use
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(serverSettings));
    
    return serverSettings;
  } catch (e) {
    console.error('Failed to load settings from server', e);
    // Fall back to localStorage
    return loadSettings();
  }
};