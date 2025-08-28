export async function buildAndDownloadEventPdfServer(opts: {
  event: any;
  salleMap: Record<number, string>;
  classMap: Record<number, string>;
}) {
  const { event, salleMap, classMap } = opts;
  const res = await fetch('/api/generate-event-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, salleMap, classMap }),
  });
  if (!res.ok) throw new Error(`PDF API error ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const titleSafe = (event.title || `evenement-${event.id}`).replace(/[^\p{L}\p{N}_ -]+/gu, '_');
  a.href = url;
  a.download = `${titleSafe}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
