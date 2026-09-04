import { useState } from 'react';
import { AlertTriangle, Database } from 'lucide-react';
import { adminAPI } from '@food/api';

export default function DevSettings() {
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const reset = async () => {
    if (confirmation !== 'CLEAR ALL DATA') return;
    setBusy(true); setMessage('');
    try {
      const response = await adminAPI.resetDeveloperData(confirmation);
      setMessage(`Reset complete: ${response.data.result.ordersDeleted} orders deleted.`);
      setConfirmation('');
    } catch (error) { setMessage(error.response?.data?.message || 'Reset failed.'); }
    finally { setBusy(false); }
  };
  return <main className="p-6 max-w-3xl">
    <div className="flex items-center gap-3 mb-6"><Database className="text-red-600" /><h1 className="text-2xl font-bold">Developer Settings</h1></div>
    <section className="border border-red-200 rounded-xl p-6 bg-red-50">
      <div className="flex gap-3"><AlertTriangle className="text-red-600 shrink-0" /><div><h2 className="font-semibold text-red-800">Clear all order and financial data</h2><p className="text-sm text-red-700 mt-2">This deletes food and quick orders, transactions, refunds, payments, settlements and webhook records. Wallet balances and histories are reset. Accounts, catalogs and settings are preserved.</p></div></div>
      <label className="block text-sm font-medium mt-6">Type CLEAR ALL DATA to continue</label>
      <input className="mt-2 w-full border rounded-lg p-3" value={confirmation} onChange={e => setConfirmation(e.target.value)} placeholder="CLEAR ALL DATA" />
      <button className="mt-4 px-4 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50" disabled={busy || confirmation !== 'CLEAR ALL DATA'} onClick={reset}>{busy ? 'Clearing...' : 'Clear all'}</button>
      {message && <p className="mt-4 text-sm font-medium">{message}</p>}
    </section>
  </main>;
}
