export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Route to Anthropic via Lava
    const response = await fetch(
      `${process.env.LAVA_BASE_URL}/forward?u=https://api.anthropic.com/v1/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LAVA_FORWARD_TOKEN}`,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json();
    
    // Log Lava request ID for tracking
    const requestId = response.headers.get('x-lava-request-id');
    console.log('Lava request ID:', requestId);

    return Response.json(data);
  } catch (error) {
    console.error('Lava API error:', error);
    return Response.json({ error: 'Failed to process request' }, { status: 500 });
  }
}