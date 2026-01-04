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
    // Refresh data every 30 seconds to keep standings updated
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get all division leaders dynamically
  const getAllDivisionLeaders = () => {
    const leaders = new Set();
    const afcLeaders = getDivisionLeaders(33);
    const nfcLeaders = getDivisionLeaders(34);
    afcLeaders.forEach(l => leaders.add(l));
    nfcLeaders.forEach(l => leaders.add(l));
    return leaders;
  };

  const getStatus = (abbr, seed, allDivLeaders) => {
    const a = abbr?.toUpperCase().trim(); 
    const eliminated = ["WSH", "LAS", "DAL", "DET", "MIN", "ATL", "NO", "ARI", "NYG", "IND", "MIA", "CIN", "KC", "CLE", "TEN", "NYJ"];
    const clinched = ["DEN", "NE", "CHI", "PHI", "JAX", "BUF", "HOU", "LAC", "SF", "SEA", "GB", "LAR"];
    const bubbleTeams = ["TB", "BAL"];

    if (eliminated.includes(a)) return { label: "ELIMINATED", color: "#d32f2f", border: "1px solid #d32f2f" };
    if (clinched.includes(a)) return { label: "CLINCHED (x)", color: "#000" };
    if (bubbleTeams.includes(a) || (seed >= 8 && seed <= 9)) return { label: "ON THE BUBBLE", color: "#856404", bg: "#fff3cd", border: "1px solid #ffeeba" };
    if (allDivLeaders && allDivLeaders.has(a)) return { label: "DIV LEADER", color: "#000" };
    return { label: "IN THE HUNT", color: "#666" };
  };

  // Parse win-loss record string (e.g., "10-7" or "9-8") to get wins and win percentage
  const parseRecord = (recordStr) => {
    if (!recordStr || typeof recordStr !== 'string') return { wins: 0, losses: 0, winPct: 0 };
    const parts = recordStr.split('-');
    const wins = parseInt(parts[0]) || 0;
    const losses = parseInt(parts[1]) || 0;
    const total = wins + losses;
    const winPct = total > 0 ? wins / total : 0;
    return { wins, losses, winPct, total };
  };

  // Get division leader for each division
  const getDivisionLeaders = (confId) => {
    const conferenceTeams = teams.filter(t => t.conference?.conference_id === confId);
    const leaders = new Set();
    
    Object.entries(divisionMap).forEach(([div, abbrs]) => {
      const divTeams = conferenceTeams.filter(t => 
        abbrs.includes(t.abbreviation?.toUpperCase())
      );
      if (divTeams.length === 0) return;
      
      // Sort by wins, then win percentage
      const sorted = divTeams.sort((a, b) => {
        const aRec = parseRecord(a.record);
        const bRec = parseRecord(b.record);
        if (bRec.wins !== aRec.wins) return bRec.wins - aRec.wins;
        return bRec.winPct - aRec.winPct;
      });
      
      if (sorted.length > 0) {
        leaders.add(sorted[0].abbreviation?.toUpperCase());
      }
    });
    
    return leaders;
  };

  const processConference = (confId) => {
    const conferenceTeams = teams.filter(t => t.conference?.conference_id === confId);
    const divisionLeaders = getDivisionLeaders(confId);
    
    // Separate division leaders and wild card teams
    const leaders = conferenceTeams.filter(t => 
      divisionLeaders.has(t.abbreviation?.toUpperCase())
    );
    const wildCards = conferenceTeams.filter(t => 
      !divisionLeaders.has(t.abbreviation?.toUpperCase())
    );
    
    // Sort function: by wins, then win percentage
    const sortByRecord = (a, b) => {
      const aRec = parseRecord(a.record);
      const bRec = parseRecord(b.record);
      if (bRec.wins !== aRec.wins) return bRec.wins - aRec.wins;
      return bRec.winPct - aRec.winPct;
    };
    
    // Sort division leaders and wild cards separately
    const sortedLeaders = leaders.sort(sortByRecord);
    const sortedWildCards = wildCards.sort(sortByRecord);
    
    // Combine: division leaders first (seeds 1-4), then wild cards (seeds 5-7)
    return [...sortedLeaders, ...sortedWildCards];
  };

  if (loading) return <div style={{ textAlign: "center", padding: "100px" }}>Loading 2025 Standings...</div>;

  const allDivLeaders = getAllDivisionLeaders();

  return (
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh", color: "#000", fontFamily: "Arial, sans-serif" }}>
      <nav style={{ backgroundColor: "#000", color: "#fff", padding: "15px", textAlign: "center", fontWeight: "bold" }}>
        2025 PLAYOFF PICTURE
      </nav>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "30px 20px" }}>
        
        {/* SECTION 1: PLAYOFF STANDINGS */}
        <div style={{ display: "flex", gap: "30px", flexWrap: "wrap", justifyContent: "center", marginBottom: "80px" }}>
          <div style={{ flex: "1", minWidth: "500px" }}>
            <StandingsTable title="AFC Playoff Race" teams={processConference(33)} getStatus={getStatus} allDivLeaders={allDivLeaders} />
          </div>
          <div style={{ flex: "1", minWidth: "500px" }}>
            <StandingsTable title="NFC Playoff Race" teams={processConference(34)} getStatus={getStatus} allDivLeaders={allDivLeaders} />
          </div>
        </div>

        <hr style={{ border: "0", borderTop: "2px solid #ddd", marginBottom: "60px" }} />

        {/* SECTION 2: DIVISIONAL STANDINGS (Formatted like Section 1) */}
        <h2 style={{ textAlign: "center", fontSize: "2rem", fontWeight: "900", marginBottom: "40px", textTransform: "uppercase" }}>Divisional Standings</h2>
        
        <div style={{ display: "flex", gap: "40px", flexWrap: "wrap", justifyContent: "center" }}>
          
          {/* AFC COLUMN */}
          <div style={{ flex: "1", minWidth: "450px" }}>
            <h3 style={{ textAlign: "center", color: "#D50A0A", fontSize: "1.75rem", fontWeight: "900", marginBottom: "20px", borderBottom: "6px solid #D50A0A", paddingBottom: "10px" }}>AFC</h3>
            {["AFC East", "AFC North", "AFC South", "AFC West"].map(div => {
              const divTeams = teams.filter(t => divisionMap[div].includes(t.abbreviation?.toUpperCase()));
              const sorted = divTeams.sort((a, b) => {
                const aRec = parseRecord(a.record);
                const bRec = parseRecord(b.record);
                if (bRec.wins !== aRec.wins) return bRec.wins - aRec.wins;
                return bRec.winPct - aRec.winPct;
              });
              return (
                <div key={div} style={{ marginBottom: "40px" }}>
                  <StandingsTable title={div} teams={sorted} getStatus={getStatus} isDivisionView={true} allDivLeaders={allDivLeaders} />
                </div>
              );
            })}
          </div>

          {/* NFC COLUMN */}
          <div style={{ flex: "1", minWidth: "450px" }}>
            <h3 style={{ textAlign: "center", color: "#013369", fontSize: "1.75rem", fontWeight: "900", marginBottom: "20px", borderBottom: "6px solid #013369", paddingBottom: "10px" }}>NFC</h3>
            {["NFC East", "NFC North", "NFC South", "NFC West"].map(div => {
              const divTeams = teams.filter(t => divisionMap[div].includes(t.abbreviation?.toUpperCase()));
              const sorted = divTeams.sort((a, b) => {
                const aRec = parseRecord(a.record);
                const bRec = parseRecord(b.record);
                if (bRec.wins !== aRec.wins) return bRec.wins - aRec.wins;
                return bRec.winPct - aRec.winPct;
              });
              return (
                <div key={div} style={{ marginBottom: "40px" }}>
                  <StandingsTable title={div} teams={sorted} getStatus={getStatus} isDivisionView={true} allDivLeaders={allDivLeaders} />
                </div>
              );
            })}
          </div>

        </div>
      </main>
    </div>
  );
}

// UNIFIED TABLE COMPONENT
function StandingsTable({ title, teams, getStatus, isDivisionView = false, allDivLeaders }) {
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
            const status = getStatus(team.abbreviation, isDivisionView ? null : rank, allDivLeaders);
            
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