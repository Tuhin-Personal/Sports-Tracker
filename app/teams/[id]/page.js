export default async function TeamDetailPage({ params }) {
  const { id } = await params;

  const [rosterRes, teamRes, scheduleRes] = await Promise.all([
    fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${id}/roster`),
    fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${id}`),
    fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${id}/schedule`)
  ]);

  const rosterData = await rosterRes.json();
  const teamData = await teamRes.json();
  const scheduleData = await scheduleRes.json();
  
  const team = teamData.team;
  const stats = team.record?.items[0]?.stats || [];

  // Logic to calculate Average per Game (Total / Games Played)
  const getAverageStat = (statName) => {
    const totalStat = stats.find(s => s.name === statName)?.value || 0;
    const gamesPlayed = stats.find(s => s.name === 'gamesPlayed')?.value || 1; 
    return (totalStat / gamesPlayed).toFixed(1);
  };

  // Improved label logic to fix the "No Spaces" issue in your screenshot
  const formatPositionLabel = (label) => {
    const cleanLabel = label.toLowerCase();
    const labels = {
      'offense': 'Offense',
      'defense': 'Defense',
      'specialteams': 'Special Teams',
      'practicesquad': 'Practice Squad',
      'injuredreserveorout': 'Injured Reserve or Out',
      'injuredreserve': 'Injured Reserve',
      'suspended': 'Suspended'
    };
    return labels[cleanLabel] || label.charAt(0).toUpperCase() + label.slice(1);
  };

  return (
    <main style={{ padding: "40px 20px", color: "black", maxWidth: "1200px", margin: "0 auto", fontFamily: "sans-serif", backgroundColor: "#fff" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", borderBottom: "2px solid #f0f0f0", paddingBottom: "30px" }}>
        <img src={team.logos[0].href} style={{ width: "120px", marginBottom: "15px" }} alt="" />
        <h1 style={{ margin: 0, fontSize: "42px", fontWeight: "900", textAlign: "center" }}>{team.displayName}</h1>
        <div style={{ marginTop: "12px", fontSize: "18px", fontWeight: "bold", background: "black", color: "white", padding: "8px 25px", borderRadius: "30px" }}>
          {team.record?.items[0]?.summary || "N/A"} | {team.standingSummary}
        </div>
      </div>

      {/* SCHEDULE SCROLLABLE */}
      <section style={{ marginTop: "40px", position: "relative" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "15px", fontWeight: "800" }}>Season Results & Schedule</h2>
        <div style={{ display: "flex", overflowX: "auto", gap: "15px", padding: "10px 5px", scrollbarWidth: "thin" }}>
          {scheduleData.events.map(event => {
            const comp = event.competitions[0];
            const isCompleted = comp.status.type.completed;
            const home = comp.competitors.find(c => c.homeAway === 'home');
            const away = comp.competitors.find(c => c.homeAway === 'away');

            return (
              <div key={event.id} style={{ 
                minWidth: "240px", background: "#fff", padding: "20px", borderRadius: "15px", 
                border: isCompleted ? "1px solid #e2e8f0" : "2px dashed #cbd5e1",
                boxShadow: isCompleted ? "0 4px 6px -1px rgba(0,0,0,0.05)" : "none"
              }}>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold", marginBottom: "12px" }}>
                  {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                {/* Away Team Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <img src={away.team.logos?.[0]?.href} style={{ width: "24px", height: "24px" }} alt="" />
                    <span style={{ fontWeight: away.winner ? "900" : "500", fontSize: "14px" }}>{away.team.abbreviation}</span>
                  </div>
                  <span style={{ fontWeight: away.winner ? "900" : "400", fontSize: "16px" }}>{isCompleted ? away.score.displayValue : "--"}</span>
                </div>
                {/* Home Team Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <img src={home.team.logos?.[0]?.href} style={{ width: "24px", height: "24px" }} alt="" />
                    <span style={{ fontWeight: home.winner ? "900" : "500", fontSize: "14px" }}>{home.team.abbreviation}</span>
                  </div>
                  <span style={{ fontWeight: home.winner ? "900" : "400", fontSize: "16px" }}>{isCompleted ? home.score.displayValue : "--"}</span>
                </div>
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "10px", fontSize: "11px", color: "#475569", textAlign: "center", fontWeight: "bold" }}>
                  {isCompleted ? comp.status.type.shortDetail : comp.status.type.detail}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* STATS (Averages) */}
      <section style={{ marginTop: "40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div style={{ background: "#f8f9fa", padding: "25px", borderRadius: "20px", border: "1px solid #eee", textAlign: "center" }}>
          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#666" }}>PTS FOR / GAME</div>
          <div style={{ fontSize: "40px", fontWeight: "900" }}>{getAverageStat('pointsFor')}</div>
        </div>
        <div style={{ background: "#f8f9fa", padding: "25px", borderRadius: "20px", border: "1px solid #eee", textAlign: "center" }}>
          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#666" }}>PTS AGAINST / GAME</div>
          <div style={{ fontSize: "40px", fontWeight: "900" }}>{getAverageStat('pointsAgainst')}</div>
        </div>
      </section>

      {/* ROSTER CATEGORIES */}
      <section style={{ marginTop: "50px" }}>
        <h2 style={{ fontSize: "28px", borderBottom: "4px solid black", paddingBottom: "10px", marginBottom: "30px", fontWeight: "900" }}>Team Roster</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "40px" }}>
          {rosterData.athletes.map(group => (
            <div key={group.position}>
              <h3 style={{ textTransform: "uppercase", fontSize: "14px", color: "white", background: "black", padding: "8px 15px", borderRadius: "4px", marginBottom: "15px" }}>
                {formatPositionLabel(group.position)}
              </h3>
              {group.items.map(player => (
                <div key={player.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 5px", borderBottom: "1px solid #eee" }}>
                  <span style={{ fontWeight: "600" }}>{player.fullName}</span>
                  <span style={{ fontWeight: "bold", color: "#888" }}>{player.position.abbreviation} #{player.jersey || '--'}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}