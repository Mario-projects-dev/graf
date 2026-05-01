// Wrapper around useAsyncData optimized for SSG-baked pages.
//
// - lazy: true        → SPA navigation doesn't block on the loader; page paints
//   immediately with the default value while data fills in (or is read from
//   Nuxt payload if it was baked at build time).
// - getCachedData     → on client navigation, reuses the Nuxt payload data
//   (which was prerendered by `nuxt generate`) instead of re-running the loader.
//   This makes navigating between pages feel instant.
// - default           → empty shape so v-if guards in templates don't crash.

import type { AsyncDataOptions } from "#app";

export function useStaticData<T>(
  key: string,
  fn: () => Promise<T>,
  defaultValue: () => T,
  extra: Partial<AsyncDataOptions<T>> = {}
) {
  return useAsyncData<T>(key, fn, {
    lazy: true,
    default: defaultValue,
    getCachedData(k, nuxtApp) {
      const payload =
        (nuxtApp.payload?.data as Record<string, unknown> | undefined)?.[k] ??
        (nuxtApp.static?.data as Record<string, unknown> | undefined)?.[k];
      return payload as T | undefined;
    },
    ...extra,
  });
}
