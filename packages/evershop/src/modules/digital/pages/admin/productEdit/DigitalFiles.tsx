import React, { useEffect, useState } from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

type FileBinding = { name: string; key: string; versionId: string };

export default function DigitalFiles({ product }: { product: { productId: number } }) {
  const [files, setFiles] = useState<FileBinding[]>([]);
  const [inherit, setInherit] = useState(true);
  const [hasGroup, setHasGroup] = useState(false);
  const [scope, setScope] = useState('product');
  const [groupFiles, setGroupFiles] = useState<FileBinding[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const endpoint = `/api/products/${product.productId}/digital-files`;
  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error();
      const { data } = await response.json();
      setFiles(data.files ?? []);
      setInherit(data.files === null);
      setGroupFiles(data.groupFiles ?? []);
      setHasGroup(data.hasGroup);
      setReady(true);
    }).catch(() => { if (!controller.signal.aborted) setMessage(_('Could not load digital files')); });
    return () => controller.abort();
  }, [endpoint]);

  const current = scope === 'group' ? groupFiles : files;
  const setCurrent = scope === 'group' ? setGroupFiles : setFiles;
  async function save() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(endpoint, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Digital-Request': '1' },
        body: JSON.stringify({ scope, files: scope === 'product' && inherit ? null : current })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message);
      setMessage(_('Digital files saved'));
    } catch (error) { setMessage(error.message || _('Could not save digital files')); }
    finally { setBusy(false); }
  }

  return <section className="rounded-lg border border-border p-5 space-y-4">
    <h2 className="h5">{_('Digital delivery')}</h2>
    <p className="text-sm text-muted-foreground">{_('Upload files to the private digital bucket in SILO first. Bind each immutable object version here. Save these settings separately from the product form.')}</p>
    {hasGroup && <label className="block">{_('Binding scope')}
      <select value={scope} onChange={(e) => setScope(e.target.value)} className="block border p-2">
        <option value="product">{_('This variant')}</option>
        <option value="group">{_('Variant group defaults')}</option>
      </select>
    </label>}
    {scope === 'product' && <label className="flex gap-2"><input type="checkbox" checked={inherit} onChange={(e) => setInherit(e.target.checked)} />{_('Inherit group defaults (or no files for a standalone product)')}</label>}
    {!(scope === 'product' && inherit) && <>
      {current.map((file, index) => <div key={index} className="space-y-2 rounded border p-3">
        {(['name', 'key', 'versionId'] as const).map((field) => <label key={field} className="block text-sm">
          {field === 'name' ? _('Download name') : field === 'key' ? _('Object key') : _('Version ID')}
          <input className="block w-full border p-2" value={file[field]} onChange={(e) => setCurrent((previous) => previous.map((entry, i) => i === index ? { ...entry, [field]: e.target.value } : entry))} />
        </label>)}
        <button type="button" onClick={() => setCurrent((previous) => previous.filter((_, i) => i !== index))}>{_('Remove')}</button>
      </div>)}
      <button type="button" disabled={current.length >= 30 || !ready} onClick={() => setCurrent((previous) => [...previous, { name: '', key: '', versionId: '' }])}>{_('Add file')}</button>
    </>}
    <div><button type="button" disabled={!ready || busy} onClick={save} className="rounded border px-4 py-2">{busy ? _('Saving...') : _('Save digital files')}</button></div>
    <p role="status" className="text-sm">{message}</p>
  </section>;
}

export const layout = { areaId: 'leftSide', sortOrder: 65 };
export const query = `query Query { product(id: getContextValue("productId")) { productId } }`;
