import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const teamId = searchParams.get('id');

  // Verify your Environment Variables are named exactly like this in .env.local
  const apiKey = process.env.THERUNDOWN_API_KEY; 
  const apiHost = 'therundown-v1.p.rapidapi.com';

  if (!apiKey) {
    return NextResponse.json({ error: "API Key is missing from environment variables" }, { status: 500 });
  }

  // Determine the correct URL based on the type
  // Use 'players' for bio and 'stats' for season data
  let url = `https://${apiHost}/nfl/teams/${teamId}/players`; 
  
  if (type === 'player-stats') {
    // Some versions of Rundown use /nfl/teams/{id}/stats for season totals
    url = `https://${apiHost}/nfl/teams/${teamId}/stats`; 
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost,
      },
      // Prevent Next.js from caching a failed auth attempt during dev
      cache: 'no-store' 
    });

    if (!res.ok) {
      // Log the actual error body from RapidAPI to help debug (e.g., "Subscription required")
      const errorBody = await res.text();
      console.error(`RapidAPI Error (${res.status}):`, errorBody);
      throw new Error(`API responded with status: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}