"use client";

import React, { useState, useEffect } from 'react';

export default function StandingsPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const RAPID_API_KEY = process.env.NEXT_PUBLIC_RAPID_API_KEY;
  const RAPID_API_HOST = 'therundown-therundown-v1.p.rapidapi.com';

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
    // DEBUG STEP: Open your browser console to see exactly what 'a' is for each team
    const a = abbr?.toUpperCase().trim(); 
    console.log("Checking Team Abbr:", a);

    // 1. ELIMINATED LIST (MUST BE FIRST)
    const eliminated = [
      "WSH", "LAS", "DAL", "DET", "MIN", "ATL", 
      "NO", "ARI", "NYG", "IND", "MIA", "CIN", "KC", "CLE", "TEN", "NYJ"
    ];

    if (eliminated.includes(a)) {
      return { label: "ELIMINATED", color: "#d32f2f", bg: "transparent", border: "1px solid #d32f2f" };
    }

    // 2. CLINCHED
    const clinched = ["DEN", "NE", "CHI", "PHI", "JAX", "BUF", "HOU", "LAC", "SF", "SEA", "GB", "LAR"];
    if (clinched.includes(a)) return { label: "CLINCHED (x)", color: "#000", bg: "transparent" };
    
    // 3. ON THE BUBBLE (Yellow Highlight)
    const bubbleTeams = ["TB", "BAL"];
    if (bubbleTeams.includes(a) || (seed >= 8 && seed <= 9)) {
      return { label: "ON THE BUBBLE", color: "#856404", bg: "#fff3cd", border: "1px solid #ffeeba" };
    }

    // 4. DIVISION LEADERS
    const divLeaders = ["PIT", "CAR"];
    if (divLeaders.includes(a)) return { label: "DIV LEADER", color: "#000", bg: "transparent" };
    
    return { label: "IN THE HUNT", color: "#666", bg: "transparent" };
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
        <div style={{ display: "flex", gap: "30px", flexWrap: "wrap", justifyContent: "center" }}>
          <div style={{ flex: "1", minWidth: "500px" }}>
            <StandingsTable title="AFC" teams={processConference(33)} getStatus={getStatus} />
          </div>
          <div style={{ flex: "1", minWidth: "500px" }}>
            <StandingsTable title="NFC" teams={processConference(34)} getStatus={getStatus} />
          </div>
        </div>
      </main>
    </div>
  );
}

function StandingsTable({ title, teams, getStatus }) {
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #dee2e6", borderRadius: "8px", overflow: "hidden" }}>
      <div style={{ padding: "15px 20px", fontWeight: "900", borderBottom: "4px solid #000", fontSize: "1.5rem" }}>{title}</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", fontSize: "0.75rem", color: "#495057", backgroundColor: "#f8f9fa" }}>
            <th style={{ padding: "12px 20px" }}>RK</th>
            <th style={{ padding: "12px 20px" }}>Team</th>
            <th style={{ padding: "12px 20px" }}>W-L</th>
            <th style={{ padding: "12px 20px", textAlign: "right" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, i) => {
            const seed = i + 1;
            const status = getStatus(team.abbreviation, seed);
            return (
              <React.Fragment key={team.team_id}>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "15px 20px", fontWeight: "bold" }}>{seed}</td>
                  <td style={{ padding: "15px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
                    <img src={`https://a.espncdn.com/i/teamlogos/nfl/500/${team.abbreviation?.toLowerCase()}.png`} style={{ width: "30px" }} alt="" />
                    <span style={{ fontWeight: "800" }}>{team.name}</span>
                  </td>
                  <td style={{ padding: "15px 20px", fontWeight: "700" }}>{team.record}</td>
                  <td style={{ padding: "15px 20px", textAlign: "right" }}>
                    <span style={{ 
                      fontSize: "0.65rem", fontWeight: "900", color: status.color, 
                      backgroundColor: status.bg, border: status.border || "none",
                      padding: "4px 8px", borderRadius: "4px", display: "inline-block"
                    }}>
                      {status.label}
                    </span>
                  </td>
                </tr>
                {seed === 7 && (
                  <tr style={{ backgroundColor: "#343a40", color: "#fff" }}>
                    <td colSpan="4" style={{ padding: "6px", fontSize: "0.6rem", textAlign: "center", fontWeight: "bold" }}>Playoff Cutoff Line</td>
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