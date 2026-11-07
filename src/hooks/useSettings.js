import { useCallback } from 'react';
import useLocalStorage from './useLocalStorage';
import { DEFAULT_SETTINGS } from '../data/settings';

// The display preferences (see data/settings.js), and a way to change some of them:
//   const [settings, updateSettings] = useSettings();  updateSettings({ timeFormat: '24h' })
// Any component can call it; storage keeps every caller in step.
function useSettings() {
  const [saved, setSaved] = useLocalStorage('settings', DEFAULT_SETTINGS);
  const settings = { ...DEFAULT_SETTINGS, ...saved };
  const updateSettings = useCallback((patch) => setSaved((current) => ({ ...current, ...patch })), [setSaved]);
  return [settings, updateSettings];
}

export default useSettings;
