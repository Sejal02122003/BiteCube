import { useState, useEffect } from 'react';
import { getCachedSettings, loadBusinessSettings } from '@food/utils/businessSettings';
import { getMediaUrl } from '@/shared/utils/media';

const normalizeLogoUrl = (rawLogo) => {
  if (!rawLogo || typeof rawLogo !== 'string') return null;
  const url = getMediaUrl(rawLogo);
  return url || null;
};

const readDynamicLogo = (appType) => {
  if (typeof window === 'undefined') return null;

  const storedLogo = localStorage.getItem(`${appType}_logo`);
  if (storedLogo) return normalizeLogoUrl(storedLogo);

  const cachedUrl = getCachedSettings()?.logo?.url;
  return normalizeLogoUrl(cachedUrl);
};

/**
 * Hook to get the dynamic app logo for the specific application (user, admin, restaurant, delivery)
 * @param {'user_app' | 'admin_app' | 'restaurant_app' | 'delivery_app'} appType
 * @returns {string | null} The logo URL from business settings if available
 */
export function useAppLogo(appType = 'user_app') {
  const [logo, setLogo] = useState(() => readDynamicLogo(appType));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;

    const syncLogo = async () => {
      const cachedLogo = readDynamicLogo(appType);
      if (cachedLogo) {
        if (!cancelled) setLogo(cachedLogo);
        return;
      }

      const settings = await loadBusinessSettings();
      if (!cancelled) {
        const candidate = settings?.logo?.url;
        setLogo(normalizeLogoUrl(candidate) || readDynamicLogo(appType));
      }
    };

    void syncLogo();

    const handleLogoUpdate = () => {
      void syncLogo();
    };

    window.addEventListener('themeLoaded', handleLogoUpdate);
    window.addEventListener('businessSettingsUpdated', handleLogoUpdate);
    window.addEventListener('storage', handleLogoUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener('themeLoaded', handleLogoUpdate);
      window.removeEventListener('businessSettingsUpdated', handleLogoUpdate);
      window.removeEventListener('storage', handleLogoUpdate);
    };
  }, [appType]);

  return logo;
}
