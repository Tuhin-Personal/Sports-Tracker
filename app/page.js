export default async function Home() {
  const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard', { 
    next: { revalidate: 60 } 
  });
  const data = await res.json();
  const games = data.events;

  return (
    <main style={{ padding: "40px 20px", backgroundColor: "#f0f2f5", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center", fontSize: "36px", marginBottom: "10px", color: "black" }}>🏈 NFL Gameday</h1>
      <p style={{ textAlign: "center", color: "#666", marginBottom: "30px" }}>Live updates from the field</p>
      
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "20px" }}>
        {games.map((game) => {
          const homeTeam = game.competitions[0].competitors.find(c => c.homeAway === 'home');
          const awayTeam = game.competitions[0].competitors.find(c => c.homeAway === 'away');

          return (
            <div key={game.id} style={{ 
              background: "white", 
              padding: "25px", 
              borderRadius: "15px", 
              width: "400px", 
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                
                {/* Away Team Stack */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "120px" }}>
                  <img src={awayTeam.team.logo} alt={awayTeam.team.name} style={{ width: "75px", height: "75px", objectFit: "contain" }} />
                  <div style={{ fontWeight: "bold", marginTop: "8px", color: "black", fontSize: "16px" }}>
                    {awayTeam.team.abbreviation}
                  </div>
                  <div style={{ fontSize: "36px", fontWeight: "900", color: "black", lineHeight: "1" }}>
                    {awayTeam.score}
                  </div>
                </div>

                {/* Center Column with VS and Time */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                  <div style={{ color: "#ccc", fontSize: "24px", fontWeight: "300" }}>VS</div>
                  {/* This adds the time/quarter back right under VS */}
                  <div style={{ fontSize: "12px", color: "#888", fontWeight: "bold", marginTop: "5px", textAlign: "center" }}>
                    {game.status.type.shortDetail}
                  </div>
                </div>

                {/* Home Team Stack */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "120px" }}>
                  <img src={homeTeam.team.logo} alt={homeTeam.team.name} style={{ width: "75px", height: "75px", objectFit: "contain" }} />
                  <div style={{ fontWeight: "bold", marginTop: "8px", color: "black", fontSize: "16px" }}>
                    {homeTeam.team.abbreviation}
                  </div>
                  <div style={{ fontSize: "36px", fontWeight: "900", color: "black", lineHeight: "1" }}>
                    {homeTeam.score}
                  </div>
                </div>

              </div>
              
              {/* Bottom Status (FINAL / LIVE) */}
              <div style={{ 
                textAlign: "center", 
                marginTop: "20px", 
                fontSize: "14px", 
                fontWeight: "bold",
                color: game.status.type.detail.includes("Final") ? "#555" : "#e53e3e", 
                borderTop: "1px solid #f0f0f0", 
                paddingTop: "12px",
                textTransform: "uppercase"
              }}>
                {game.status.type.detail}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}