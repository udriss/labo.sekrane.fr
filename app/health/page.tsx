import { Suspense } from 'react';

async function fetchHealth() {
  const res = await fetch('/api/health', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch health');
  return res.json();
}

export default async function HealthPage() {
  const data = await fetchHealth();
  return (
    <div style={{ padding: 16 }}>
      <h1>Server Health</h1>
      <p>Time: {data.time}</p>
      <p>Total connections: {data.totalConnections}</p>
      <pre style={{ background: '#111', color: '#0f0', padding: 12, borderRadius: 8 }}>
        {JSON.stringify(data.connections, null, 2)}
      </pre>
    </div>
  );
}
