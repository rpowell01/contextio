"use client";

import { 
  NavigationItem, 
  NavigationConfig, 
  getNavigationItems as getItems,
  defaultNavigation 
} from "@/config/navigation";

export type { NavigationItem, NavigationConfig };

/**
 * Raw navigation items array (unfiltered). Use getNavigationItems() for filtered results.
 */
export const rawNavigation = defaultNavigation;

/**
 * Gets filtered navigation items based on the provided config.
 * Filters out items with enabled: false.
 * @param config - Optional navigation configuration
 * @returns Filtered array of navigation items
 */
export const getNavigationItems = getItems;