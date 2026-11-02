import { useAppState } from '@components/common/context/app.js';
import { switchLocalePath } from '@evershop/evershop/lib/locale/localeResolution';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/** Native display name for a locale code, falling back to the upper-cased code. */
function localeLabel(code: string): string {
  try {
    return new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code;
  } catch {
    return code.toUpperCase();
  }
}

/**
 * Storefront language switcher (spec §7). Reads the enabled locales + current/default
 * locale from `eContext` (via `useAppState`, so it works during SSR and on the client),
 * and on change navigates to the same page under the chosen locale (prefix swap, shared
 * slugs). Renders nothing when fewer than two locales are enabled — so single-language
 * stores show no switcher. Plain `<select>`; a theme can restyle via `.language-switcher`.
 */
export default function LanguageSwitcher(): React.ReactElement | null {
  const {
    availableLocales = [],
    locale = '',
    defaultLocale = ''
  } = useAppState();

  if (availableLocales.length < 2) {
    return null;
  }

  const onChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const target = event.target.value;
    if (target === locale) {
      return;
    }
    window.location.href =
      switchLocalePath(
        window.location.pathname,
        target,
        defaultLocale,
        availableLocales
      ) + window.location.search;
  };

  return (
    // Uncontrolled on purpose (defaultValue, not value). A controlled select
    // re-asserts its value on every React re-render; if a render lands while
    // the native dropdown is open (ajax refetch, notification update, ...),
    // the browser can commit the reset value and fire a phantom `change`,
    // navigating away without the user ever picking an option. Uncontrolled +
    // full-page navigation keeps DOM and state in lockstep by construction.
    <select
      className="language-switcher"
      aria-label={_('Language')}
      defaultValue={locale}
      onChange={onChange}
    >
      {availableLocales.map((code) => (
        <option key={code} value={code}>
          {localeLabel(code)}
        </option>
      ))}
    </select>
  );
}
