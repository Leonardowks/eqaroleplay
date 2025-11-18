import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeatureFlag {
  id: string;
  feature_key: string;
  display_name: string;
  description: string;
  is_enabled: boolean;
}

interface ApiConfig {
  provider: string;
  is_active: boolean;
}

export function useSettings() {
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [apiConfigs, setApiConfigs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load feature flags
      const { data: flagsData, error: flagsError } = await supabase
        .from('feature_flags')
        .select('feature_key, is_enabled');

      if (flagsError) throw flagsError;

      const flags: Record<string, boolean> = {};
      flagsData?.forEach(flag => {
        flags[flag.feature_key] = flag.is_enabled;
      });
      setFeatureFlags(flags);

      // Load API configurations
      const { data: apiData, error: apiError } = await supabase
        .from('api_configurations')
        .select('provider, is_active');

      if (apiError) throw apiError;

      const configs: Record<string, boolean> = {};
      apiData?.forEach(config => {
        configs[config.provider] = config.is_active;
      });
      setApiConfigs(configs);

    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const isFeatureEnabled = (featureKey: string): boolean => {
    return featureFlags[featureKey] ?? false;
  };

  const isApiActive = (provider: string): boolean => {
    return apiConfigs[provider] ?? false;
  };

  const refresh = () => {
    loadSettings();
  };

  return {
    featureFlags,
    apiConfigs,
    loading,
    isFeatureEnabled,
    isApiActive,
    refresh,
  };
}

export function useFeatureFlag(featureKey: string): boolean {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFlag = async () => {
      try {
        const { data, error } = await supabase
          .from('feature_flags')
          .select('is_enabled')
          .eq('feature_key', featureKey)
          .single();

        if (error) throw error;
        setIsEnabled(data?.is_enabled ?? false);
      } catch (error) {
        console.error(`Error loading feature flag ${featureKey}:`, error);
        setIsEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    loadFlag();
  }, [featureKey]);

  return isEnabled;
}
