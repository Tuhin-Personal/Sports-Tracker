export async function getPlayerStats(playerName) {
  try {
    const baseUrl = process.env.GOOGLE_SHEET_URL;
    
    // 1. Manually clean the name (important for URL safety)
    const cleanName = playerName.trim();
    const API_URL = `${baseUrl}?name=${encodeURIComponent(cleanName)}`;

    // 2. Log the URL to your Terminal (Check if it looks right!)
    console.log("Fetching from Google:", API_URL);

    const response = await fetch(API_URL, { 
      cache: 'no-store', // This forces Next.js to skip the cache
      headers: { 'Accept': 'application/json' }
    });

    const data = await response.json();
    
    // 3. Log what Google actually sent back
    console.log("Google Response Data:", data);

    return data;
  } catch (error) {
    console.error('Fetch Error in googleSheets.js:', error);
    return null;
  }
}