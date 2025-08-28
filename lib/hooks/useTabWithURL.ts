'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface UseTabWithURLOptions {
  paramName?: string;
  defaultTab?: number;
  maxTabs?: number;
  preserveOtherParams?: boolean;
}

export function useTabWithURL(options: UseTabWithURLOptions = {}) {
  const { paramName = 'tab', defaultTab = 0, maxTabs = 10, preserveOtherParams = true } = options;

  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse tab from URL
  const tabParam = searchParams.get(paramName);
  const urlTab = tabParam ? parseInt(tabParam, 10) : defaultTab;
  const validTab = !isNaN(urlTab) && urlTab >= 0 && urlTab < maxTabs ? urlTab : defaultTab;

  const [tabValue, setTabValue] = useState(validTab);

  // Update tab value when URL changes
  useEffect(() => {
    setTabValue(validTab);
  }, [validTab]);

  // Function to update both state and URL
  const handleTabChange = useCallback(
    (newTab: number) => {
      if (newTab < 0 || newTab >= maxTabs) return;

      setTabValue(newTab);

      // Update URL
      const newParams = new URLSearchParams(preserveOtherParams ? searchParams.toString() : '');

      if (newTab === defaultTab) {
        // Remove tab param if it's the default
        newParams.delete(paramName);
      } else {
        newParams.set(paramName, newTab.toString());
      }

      // Build new URL
      const newUrl = newParams.toString()
        ? `${window.location.pathname}?${newParams.toString()}`
        : window.location.pathname;

      router.push(newUrl);
    },
    [router, searchParams, paramName, defaultTab, maxTabs, preserveOtherParams],
  );

  return {
    tabValue,
    setTabValue: handleTabChange,
    handleTabChange,
  };
}
