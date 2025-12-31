'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [selectedWeek, setSelectedWeek] = useState(18); // Default to current week
  const [realCurrentWeek, setRealCurrentWeek] = useState(null); 
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2025&seasontype=2&week=${selectedWeek}`);
        const data = await res.json();
        setGames(data.events || []);
        
        // This ensures we always know what the actual "Live" week is
        if (data.week && data.week.number) {
            setRealCurrentWeek(data.week.number);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      }
      setLoading(false);
    }
    fetchData();
  }, [selectedWeek]);

  const completedGames = games.filter(g => g.status.type.completed || g.status.type.state === "post");
  const activeGames = games.filter(g => !g.status.type.completed && g.status.type.state !== "post");

  // STRICT LOGIC: Only show "Live & Upcoming" if we are looking at the current week or later
  const isPastWeek = selectedWeek < realCurrentWeek;

  return (
    <main style={{ padding: "40px 20px", backgroundColor: "#f0f2f5", minHeight: "100vh", fontFamily: "sans-serif", color: "black" }}>
      
      <header style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1 style={{ fontSize: "36px", marginBottom: "10px" }}>🏈 NFL Gameday</h1>
        <div style={{ marginTop: "20px" }}>
          <label style={{ marginRight: "10px", fontWeight: "bold" }}>Select Week:</label>
          <select 
            value={selectedWeek} 
            onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #ccc" }}
          >
            {[...Array(18)].map((_, i) => (
              <option key={i + 1} value={i + 1}>Week {i + 1}</option>
            ))}
          </select>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: "center", marginTop: "50px" }}>Loading...</div>
      ) : (
        <>
          {/* THE FIX: This entire block is now hidden if isPastWeek is true */}
          {!isPastWeek && activeGames.length > 0 && (
            <section>
              <h2 style={{ textAlign: "center", marginBottom: "20px", textTransform: "uppercase", fontSize: "18px" }}>
                Live & Upcoming
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "20px", marginBottom: "50px" }}>
                {activeGames.map(g => <GameCard key={g.id} game={g} />)}
              </div>
              <hr style={{ border: "0", borderTop: "2px solid #ddd", margin: "40px auto", width: "50%" }} />
            </section>
          )}

          {/* COMPLETED MATCHES */}
          <section>
            <h2 style={{ textAlign: "center", marginBottom: "20px", textTransform: "uppercase", fontSize: "18px" }}>
              Completed Matches
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "20px" }}>
              {completedGames.length > 0 ? (
                completedGames.map(g => <GameCard key={g.id} game={g} />)
              ) : (
                <p style={{ color: "#888", textAlign: "center", width: "100%" }}>No completed games found for this week.</p>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

// ... GameCard component remains the same ...
function GameCard({ game }) {
  const homeTeam = game.competitions[0].competitors.find(c => c.homeAway === 'home');
  const awayTeam = game.competitions[0].competitors.find(c => c.homeAway === 'away');
  const isFinal = game.status.type.completed || game.status.type.state === "post";

  return (
    <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "380px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ textAlign: "center", width: "100px" }}>
          <img src={awayTeam.team.logo} alt="" style={{ width: "60px" }} />
          <div style={{ fontWeight: "bold", fontSize: "14px" }}>{awayTeam.team.abbreviation}</div>
          <div style={{ fontSize: "28px", fontWeight: "900", opacity: isFinal && parseInt(awayTeam.score) < parseInt(homeTeam.score) ? 0.4 : 1 }}>
            {awayTeam.score}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#bbb", fontWeight: "bold" }}>{isFinal ? "FINAL" : "VS"}</div>
          <div style={{ fontSize: "10px", color: "#999" }}>{game.status.type.shortDetail}</div>
        </div>
        <div style={{ textAlign: "center", width: "100px" }}>
          <img src={homeTeam.team.logo} alt="" style={{ width: "60px" }} />
          <div style={{ fontWeight: "bold", fontSize: "14px" }}>{homeTeam.team.abbreviation}</div>
          <div style={{ fontSize: "28px", fontWeight: "900", opacity: isFinal && parseInt(homeTeam.score) < parseInt(awayTeam.score) ? 0.4 : 1 }}>
            {homeTeam.score}
          </div>
        </div>
      </div>
    </div>
  );
}