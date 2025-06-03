import { UserSettings } from './types';

// Default settings
const defaultSettings: UserSettings = {
  botToken: '',
  channelId: '',
  emailDigest: true,
  emailPostPublished: true,
  emailPostFailed: false,
  browserNotifications: true,
  name: 'Demo User',
  email: 'demo@example.com',
  notificationEmail: ''
};

// Load settings from localStorage
export const loadSettings = (): UserSettings => {
  try {
    const settings = localStorage.getItem('userSettings');
    return settings ? JSON.parse(settings) : defaultSettings;
  } catch (error) {
    console.error('Failed to load settings from localStorage:', error);
    return defaultSettings;
  }
};

// Save settings to localStorage
export const saveSettings = (settings: Partial<UserSettings>): UserSettings => {
  try {
    const currentSettings = loadSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
    return updatedSettings;
  } catch (error) {
    console.error('Failed to save settings to localStorage:', error);
    return { ...defaultSettings, ...settings };
  }
};

// Load settings from server (with localStorage fallback)
export const loadSettingsFromServer = async (): Promise<UserSettings> => {
  try {
    // In a real app, this would call the API
    // For now, just use localStorage
    return loadSettings();
  } catch (error) {
    console.error('Failed to load settings from server:', error);
    return loadSettings(); // Fallback to localStorage
  }
};

// Save settings to server (and localStorage)
export const saveSettingsToServer = async (settings: Partial<UserSettings>): Promise<UserSettings> => {
  try {
    // In a real app, this would call the API
    // For now, just use localStorage
    return saveSettings(settings);
  } catch (error) {
    console.error('Failed to save settings to server:', error);
    return saveSettings(settings); // Still save to localStorage
  }
};