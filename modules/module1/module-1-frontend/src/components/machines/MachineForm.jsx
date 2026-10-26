import { useState } from 'react';

const FIELD = ({ label, name, value, onChange, type = 'text', options }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>
    {options ? (
      <select name={name} value={value} onChange={onChange} style={{ padding: '8px 10px', fontSize: 13 }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        style={{ padding: '8px 10px', fontSize: 13 }}
      />
    )}
  </div>
);

const DEFAULTS = {
  machineName: '', machineCode: '', status: 'IDLE',
  location: '', manufacturer: '', model: '',
  spindleSpeed: '', feedRate: '',
};

export default function MachineForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({ ...DEFAULTS, ...initial });

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      spindleSpeed: Number(form.spindleSpeed),
      feedRate: Number(form.feedRate),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FIELD label="Machine Name *" name="machineName" value={form.machineName} onChange={onChange} />
        <FIELD label="Machine Code *" name="machineCode" value={form.machineCode} onChange={onChange} />
        <FIELD label="Status" name="status" value={form.status} onChange={onChange}
          options={['RUNNING', 'IDLE', 'OFFLINE', 'MAINTENANCE']} />
        <FIELD label="Location" name="location" value={form.location} onChange={onChange} />
        <FIELD label="Manufacturer" name="manufacturer" value={form.manufacturer} onChange={onChange} />
        <FIELD label="Model" name="model" value={form.model} onChange={onChange} />
        <FIELD label="Spindle Speed (RPM)" name="spindleSpeed" value={form.spindleSpeed} onChange={onChange} type="number" />
        <FIELD label="Feed Rate (mm/min)" name="feedRate" value={form.feedRate} onChange={onChange} type="number" />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
        <button type="button" onClick={onCancel} style={{
          padding: '8px 18px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-bright)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-secondary)',
          fontSize: 13, fontWeight: 500,
        }}>
          Cancel
        </button>
        <button type="submit" disabled={loading} style={{
          padding: '8px 18px',
          background: 'var(--accent)',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          color: '#0d0f14',
          fontSize: 13, fontWeight: 600,
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Saving…' : 'Save machine'}
        </button>
      </div>
    </form>
  );
}
