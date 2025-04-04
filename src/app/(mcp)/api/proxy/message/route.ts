import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // --- Added Log ---
  console.log(`[${new Date().toISOString()}] Received request for /frontend/api/proxy/message`);

  // Use environment variables consistently
  const proxyUrl = process.env.PROXY_SERVER_URL || 'http://inspector-backend:3013'; // Ensure this points to your actual proxy SERVICE/CONTAINER
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    console.error('Missing sessionId parameter in /message proxy');
    return NextResponse.json(
      { error: 'Missing sessionId parameter' },
      { status: 400 }
    );
  }

  try {
    const body = await request.arrayBuffer();
    const url = new URL(`${proxyUrl}/message`); // Target the actual proxy server's /message
    url.searchParams.set('sessionId', sessionId);

    const headers = new Headers();
    // Forward necessary headers, avoid host/content-length
    for (const [key, value] of request.headers.entries()) {
       // Consider forwarding Authorization if needed by the actual proxy server
      if (!['host', 'content-length', 'connection'].includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    }
     // Ensure Content-Type is set correctly
     headers.set('Content-Type', request.headers.get('content-type') || 'application/json');


    // --- Added Log ---
    console.log(`Forwarding POST to ${url.toString()}`);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: body,
      // signal: AbortSignal.timeout(10000), // Consider if timeout is needed here
      cache: 'no-store',
    });

    // --- Added Log ---
    console.log(`Received response from proxy message endpoint: Status ${response.status}`);

    // Handle potential empty responses correctly
    if (response.status === 204 || response.headers.get('content-length') === '0') {
       return new NextResponse(null, { status: response.status, statusText: response.statusText, headers: response.headers });
     }

     // Try to parse JSON, but handle non-JSON responses gracefully
     const contentType = response.headers.get('content-type');
     if (contentType && contentType.includes('application/json')) {
         const responseData = await response.json();
         return NextResponse.json(responseData, { status: response.status, headers: response.headers });
     } else {
         // If not JSON, return the body as text or handle as appropriate
         const responseText = await response.text();
         console.warn(`Non-JSON response from proxy message endpoint (Status ${response.status}): ${responseText.substring(0, 100)}...`);
         // Recreate headers for the NextResponse
          const responseHeaders = new Headers();
          response.headers.forEach((value, key) => {
            responseHeaders.append(key, value);
          });
         return new NextResponse(responseText, { status: response.status, statusText: response.statusText, headers: responseHeaders });
     }

  } catch (error) {
    console.error('Message proxy error (/frontend/api/proxy/message):', error);
    return NextResponse.json(
      { error: 'Failed to forward message to proxy server', details: String(error) },
      { status: 502 } // Use 502 Bad Gateway for proxy errors
    );
  }
}