import React, { useEffect, useState } from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

type Download = { id: string; name: string; productName: string; available: boolean };

export default function Downloads({ order }: { order: { uuid: string } | null }) {
  const [files, setFiles] = useState<Download[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const uuid = order?.uuid;
  useEffect(() => {
    if (!uuid) return;
    const controller = new AbortController();
    fetch(`/api/customers/me/orders/${uuid}/downloads`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const result = await response.json();
        setFiles(result.data);
      }).catch(() => { if (!controller.signal.aborted) setMessage(_('Downloads are temporarily unavailable')); });
    return () => controller.abort();
  }, [uuid]);
  async function download(id: string) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/customers/me/downloads/${id}`, { method: 'POST', headers: { 'X-Digital-Request': '1' } });
      const result = await response.json();
      if (!response.ok) throw new Error();
      window.location.assign(result.data.url);
    } catch { setMessage(_('Download unavailable. Confirm payment or try again shortly.')); }
    finally { setBusy(false); }
  }
  if (!uuid || (!files.length && !message)) return null;
  return <section className="mx-auto max-w-2xl rounded-lg border border-border p-6 my-6">
    <h2 className="h5 mb-3">{_('Digital downloads')}</h2>
    <ul className="space-y-3">{files.map((file) => <li key={file.id} className="flex items-center justify-between gap-4">
      <div><p>{file.name}</p><p className="text-sm text-muted-foreground">{file.productName}</p></div>
      <button type="button" disabled={!file.available || busy} onClick={() => download(file.id)} className="rounded border px-3 py-2 disabled:opacity-50">{file.available ? _('Download') : _('Unavailable')}</button>
    </li>)}</ul>
    <p role="status" className="mt-3 text-sm">{message}</p>
  </section>;
}

export const layout = { areaId: 'content', sortOrder: 15 };
export const query = `query Query { order(uuid: getContextValue("orderUuid")) { uuid } }`;
