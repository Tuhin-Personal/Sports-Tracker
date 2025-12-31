"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TeamsPage() {
  const [allTeams, setAllTeams] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams')
      .then(res => res.json())
      .then(data => {
        setAllTeams(data.sports[0].leagues[0].teams);
        setLoading(false);
      });
  }, []);

  const filteredTeams = allTeams.filter(t => 
    t.team.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div style={{ textAlign: "center", padding: "50px", color: "black", fontWeight: "bold" }}>Loading NFL Teams...</div>;

  return (
    <main style={{ padding: "40px 20px", fontFamily: "sans-serif", backgroundColor: "#f8f9fa", minHeight: "100vh", color: "black" }}>
      <h1 style={{ textAlign: "center", fontSize: "3rem", marginBottom: "30px", fontWeight: "900" }}>NFL Teams</h1>
      
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <input 
          type="text" 
          placeholder="Search teams (e.g. Cowboys)..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ 
            padding: "15px 25px", width: "100%", maxWidth: "500px", borderRadius: "30px", 
            border: "2px solid #ddd", fontSize: "16px", color: "black", outline: "none",
            boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
          }}
        />
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", 
        gap: "25px", 
        maxWidth: "1200px", 
        margin: "0 auto" 
      }}>
        {filteredTeams.map(t => (
          <Link href={`/teams/${t.team.id}`} key={t.team.id} style={{ textDecoration: 'none' }}>
            <div style={{ 
              background: "white", 
              padding: "30px", 
              borderRadius: "20px", 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center", 
              justifyContent: "center", 
              textAlign: "center", 
              border: "1px solid #eee", 
              transition: "transform 0.2s ease",
              boxShadow: "0 4px 15px rgba(0,0,0,0.05)", 
              cursor: "pointer",
              height: "250px", // FORCES ALL CARDS TO BE THE SAME HEIGHT
              boxSizing: "border-box"
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{ height: "100px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "15px" }}>
                <img 
                  src={t.team.logos[0].href} 
                  style={{ width: "100px", maxHeight: "100px", objectFit: "contain" }} 
                  alt={t.team.displayName} 
                />
              </div>
              <h3 style={{ 
                color: "black", 
                margin: "0", 
                fontSize: "1.2rem", 
                fontWeight: "bold",
                lineHeight: "1.2",
                display: "flex",
                alignItems: "center",
                height: "3em" // Ensures name area is uniform even for 1-line vs 2-line names
              }}>
                {t.team.displayName}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}