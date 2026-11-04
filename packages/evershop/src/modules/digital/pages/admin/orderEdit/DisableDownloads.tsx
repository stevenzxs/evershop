import React, { useState } from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

export default function DisableDownloads({ order }: { order: { uuid: string } | null }) {
  const [busy, setBusy] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [message, setMessage] = useState('');
  if (!order) return null;

  async function disable() {
    if (!window.confirm(_('Disable all digital downloads for this order? Existing links remain valid for up to five minutes.'))) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/orders/${order!.uuid}/digital-downloads/disable`, {
        method: 'POST', headers: { 'X-Digital-Request': '1' }
      });
      if (!response.ok) throw new Error();
      setDisabled(true);
      setMessage(_('Digital downloads disabled for this order'));
    } catch { setMessage(_('Could not disable downloads')); }
    finally { setBusy(false); }
  }

  return <section className="rounded-lg border border-border p-5 space-y-3">
    <h2 className="h5">{_('Digital delivery')}</h2>
    <p className="text-sm">{_('Disable future download links for this order. Files already downloaded cannot be recalled.')}</p>
    <button type="button" disabled={busy || disabled} onClick={disable} className="rounded border px-4 py-2 disabled:opacity-50">{_('Disable order downloads')}</button>
    <p role="status">{message}</p>
  </section>;
}

export const layout = { areaId: 'leftSide', sortOrder: 26 };
export const query = `query Query { order(uuid: getContextValue("orderId")) { uuid } }`;
