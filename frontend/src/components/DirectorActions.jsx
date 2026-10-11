import { useMemo, useState } from 'react';
import api from '../api';

export default function DirectorActions({ voucher, onDone }) {
  const [file, setFile] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (!['image/png', 'image/jpeg'].includes(f.type)) {
      setError('Signature must be a PNG or JPG image');
      e.target.value = '';
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      setError('Signature must be smaller than 2 MB');
      e.target.value = '';
      return;
    }
    setError('');
    setFile(f);
  }

  async function approve() {
    if (!file) return setError('Please upload your signature to approve');
    if (!window.confirm(`Approve voucher ${voucher.voucher_number}?`)) return;

    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('director_signature', file);
      const { data } = await api.post(`/vouchers/${voucher.id}/approve`, fd);
      onDone(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not approve');
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!reason.trim()) return setError('Please enter a rejection reason');
    if (!window.confirm(`Reject voucher ${voucher.voucher_number}?`)) return;

    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`/vouchers/${voucher.id}/reject`, { reason: reason.trim() });
      onDone(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reject');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 pt-6 border-t print:hidden">
      <h2 className="font-semibold text-gray-700 mb-3">Director Decision</h2>

      {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-4">
          <h3 className="font-medium text-green-700 mb-2">Approve</h3>
          <label className="block text-sm text-gray-600 mb-1">Your signature * (PNG or JPG, max 2 MB)</label>
          <input type="file" accept="image/png,image/jpeg" onChange={handleFile} className="text-sm" />
          {preview && <img src={preview} alt="Signature preview" className="mt-3 h-20 border rounded bg-white p-1" />}
          <button onClick={approve} disabled={busy}
            className="mt-4 px-4 py-2 rounded bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-60">
            Approve Voucher
          </button>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-medium text-red-700 mb-2">Reject</h3>
          <label className="block text-sm text-gray-600 mb-1">Reason for rejection *</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="Explain why this voucher is rejected" />
          <button onClick={reject} disabled={busy}
            className="mt-4 px-4 py-2 rounded bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-60">
            Reject Voucher
          </button>
        </div>
      </div>
    </div>
  );
}