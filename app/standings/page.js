"use client";

import React, { useState, useEffect } from 'react';

export default function StandingsPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const RAPID_API_KEY = process.env.NEXT_PUBLIC_RAPID_API_KEY;
  const RAPID_API_HOST = 'therundown-therundown-v1.p.rapidapi.com';

  const divisionMap = {
    "AFC East": ["BUF", "MIA", "NE", "NYJ"],
    "AFC North": ["BAL", "CIN", "CLE", "PIT"],
    "AFC South": ["HOU", "IND", "JAX", "TEN"],
    "AFC West": ["DEN", "KC", "LAS", "LAC"],
    "NFC East": ["DAL", "NYG", "PHI", "WSH"],
    "NFC North": ["CHI", "DET", "GB", "MIN"],
    "NFC South": ["ATL", "CAR", "NO", "TB"],
    "NFC West": ["ARI", "LAR", "SF", "SEA"]
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`https://${RAPID_API_HOST}/sports/2/teams`, {
          method: 'GET',
          headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': RAPID_API_HOST }
        });
        const data = await res.json();
        const filtered = (data.teams || []).filter(t => 
          t.abbreviation && t.mascot && !["AFC", "NFC", "PRO"].includes(t.abbreviation.toUpperCase())
        );
        setTeams(filtered);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }
    fetchData();
  }, []);

  const getStatus = (abbr, seed) => {
    const a = abbr?.toUpperCase().trim(); 
    const eliminated = ["WSH", "LAS", "DAL", "DET", "MIN", "ATL", "NO", "ARI", "NYG", "IND", "MIA", "CIN", "KC", "CLE", "TEN", "NYJ"];
    const clinched = ["DEN", "NE", "CHI", "PHI", "JAX", "BUF", "HOU", "LAC", "SF", "SEA", "GB", "LAR"];
    const bubbleTeams = ["TB", "BAL"];
    const divLeaders = ["PIT", "CAR"];

    if (eliminated.includes(a)) return { label: "ELIMINATED", color: "#d32f2f", border: "1px solid #d32f2f" };
    if (clinched.includes(a)) return { label: "CLINCHED (x)", color: "#000" };
    if (bubbleTeams.includes(a) || (seed >= 8 && seed <= 9)) return { label: "ON THE BUBBLE", color: "#856404", bg: "#fff3cd", border: "1px solid #ffeeba" };
    if (divLeaders.includes(a)) return { label: "DIV LEADER", color: "#000" };
    return { label: "IN THE HUNT", color: "#666" };
  };

  const processConference = (confId) => {
    return teams
      .filter(t => t.conference?.conference_id === confId)
      .sort((a, b) => {
        const leaders = ["DEN", "NE", "JAX", "PIT", "SEA", "CHI", "PHI", "CAR"];
        const aL = leaders.includes(a.abbreviation) ? 0 : 1;
        const bL = leaders.includes(b.abbreviation) ? 0 : 1;
        if (aL !== bL) return aL - bL;
        return (parseInt(b.record) || 0) - (parseInt(a.record) || 0);
      });
  };

  if (loading) return <div style={{ textAlign: "center", padding: "100px" }}>Loading 2025 Standings...</div>;

  return (
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh", color: "#000", fontFamily: "Arial, sans-serif" }}>
      <nav style={{ backgroundColor: "#000", color: "#fff", padding: "15px", textAlign: "center", fontWeight: "bold" }}>
        2025 PLAYOFF PICTURE
      </nav>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "30px 20px" }}>
        
        {/* SECTION 1: PLAYOFF STANDINGS */}
        <div style={{ display: "flex", gap: "30px", flexWrap: "wrap", justifyContent: "center", marginBottom: "80px" }}>
          <div style={{ flex: "1", minWidth: "500px" }}>
            <StandingsTable title="AFC Playoff Race" teams={processConference(33)} getStatus={getStatus} />
          </div>
          <div style={{ flex: "1", minWidth: "500px" }}>
            <StandingsTable title="NFC Playoff Race" teams={processConference(34)} getStatus={getStatus} />
          </div>
        </div>

        <hr style={{ border: "0", borderTop: "2px solid #ddd", marginBottom: "60px" }} />

        {/* SECTION 2: DIVISIONAL STANDINGS (Formatted like Section 1) */}
        <h2 style={{ textAlign: "center", fontSize: "2rem", fontWeight: "900", marginBottom: "40px", textTransform: "uppercase" }}>Divisional Standings</h2>
        
        <div style={{ display: "flex", gap: "40px", flexWrap: "wrap", justifyContent: "center" }}>
          
          {/* AFC COLUMN */}
          <div style={{ flex: "1", minWidth: "450px" }}>
            <h3 style={{ textAlign: "center", color: "#D50A0A", fontSize: "1.75rem", fontWeight: "900", marginBottom: "20px", borderBottom: "6px solid #D50A0A", paddingBottom: "10px" }}>AFC</h3>
            {["AFC East", "AFC North", "AFC South", "AFC West"].map(div => (
              <div key={div} style={{ marginBottom: "40px" }}>
                <StandingsTable title={div} teams={teams.filter(t => divisionMap[div].includes(t.abbreviation?.toUpperCase())).sort((a,b) => (parseInt(b.record)||0) - (parseInt(a.record)||0))} getStatus={getStatus} isDivisionView={true} />
              </div>
            ))}
          </div>

          {/* NFC COLUMN */}
          <div style={{ flex: "1", minWidth: "450px" }}>
            <h3 style={{ textAlign: "center", color: "#013369", fontSize: "1.75rem", fontWeight: "900", marginBottom: "20px", borderBottom: "6px solid #013369", paddingBottom: "10px" }}>NFC</h3>
            {["NFC East", "NFC North", "NFC South", "NFC West"].map(div => (
              <div key={div} style={{ marginBottom: "40px" }}>
                <StandingsTable title={div} teams={teams.filter(t => divisionMap[div].includes(t.abbreviation?.toUpperCase())).sort((a,b) => (parseInt(b.record)||0) - (parseInt(a.record)||0))} getStatus={getStatus} isDivisionView={true} />
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
}

// UNIFIED TABLE COMPONENT
function StandingsTable({ title, teams, getStatus, isDivisionView = false }) {
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #dee2e6", borderRadius: "8px", overflow: "hidden", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
      <div style={{ padding: "15px 20px", fontWeight: "900", borderBottom: "4px solid #000", fontSize: isDivisionView ? "1.1rem" : "1.5rem", backgroundColor: "#fff", color: "#000" }}>
        {title.toUpperCase()}
      </div>
      
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", fontSize: "0.75rem", color: "#495057", backgroundColor: "#f8f9fa" }}>
            <th style={{ padding: "12px 20px" }}>{isDivisionView ? "POS" : "RK"}</th>
            <th style={{ padding: "12px 20px" }}>TEAM</th>
            <th style={{ padding: "12px 20px" }}>W-L</th>
            <th style={{ padding: "12px 20px", textAlign: "right" }}>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, i) => {
            const rank = i + 1;
            const status = getStatus(team.abbreviation, isDivisionView ? null : rank);
            
            // LOGIC FOR CUSTOM RAIDERS LOGO
            const isRaiders = ["LAS"].includes(team.abbreviation?.toUpperCase());
            const raidersLogo = "https://static.www.nfl.com/t_headshot_desktop/f_auto/league/api/clubs/logos/LV"; // Paste your link here
            const defaultLogo = `https://a.espncdn.com/i/teamlogos/nfl/500/${team.abbreviation?.toLowerCase()}.png`;

            return (
              <React.Fragment key={team.team_id}>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "15px 20px", fontWeight: "bold" }}>{rank}</td>
                  <td style={{ padding: "15px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
                    <img 
                      src={isRaiders ? raidersLogo : defaultLogo} 
                      style={{ width: "30px", height: "auto" }} 
                      alt={team.name} 
                    />
                    <span style={{ fontWeight: "800" }}>{team.name}</span>
                  </td>
                  <td style={{ padding: "15px 20px", fontWeight: "700" }}>{team.record}</td>
                  <td style={{ padding: "15px 20px", textAlign: "right" }}>
                    <span style={{ 
                      fontSize: "0.65rem", fontWeight: "900", color: status.color, 
                      backgroundColor: status.bg || "transparent", border: status.border || "none",
                      padding: "4px 8px", borderRadius: "4px", display: "inline-block"
                    }}>
                      {status.label}
                    </span>
                  </td>
                </tr>
                {!isDivisionView && rank === 7 && (
                  <tr style={{ backgroundColor: "#343a40", color: "#fff" }}>
                    <td colSpan="4" style={{ padding: "6px", fontSize: "0.6rem", textAlign: "center", fontWeight: "bold" }}>PLAYOFF CUTOFF LINE</td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}