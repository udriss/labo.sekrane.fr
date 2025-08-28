import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId || userId === 'guest') {
    return new Response('Unauthorized', { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = `data: ${JSON.stringify({
        type: 'connected',
        userId,
        ts: Date.now(),
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));

      // Keep-alive heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        try {
          const ping = `data: ${JSON.stringify({ type: 'ping', ts: Date.now() })}\n\n`;
          controller.enqueue(new TextEncoder().encode(ping));
        } catch (error) {
          clearInterval(heartbeat);
          controller.close();
        }
      }, 30000);

      // Cleanup on close
      const cleanup = () => {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {}
      };

      // Store cleanup in a way that can be called externally
      (controller as any).cleanup = cleanup;

      // Simulate some notifications for testing
      setTimeout(() => {
        try {
          const testNotif = `data: ${JSON.stringify({
            type: 'notification',
            title: 'Test SSE',
            message: 'SSE connection established successfully',
            ts: Date.now(),
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(testNotif));
        } catch {}
      }, 2000);
    },

    cancel() {
      // Cleanup when client disconnects
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}
