"use client";

import React, { useState, useEffect } from 'react';

export default function StandingsPage() {
  const [teams, setTeams] = useState([]);
  const [games, setGames] = useState([]);
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
        // Fetch teams
        const teamsRes = await fetch(`https://${RAPID_API_HOST}/sports/2/teams`, {
          method: 'GET',
          headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': RAPID_API_HOST }
        });
        const teamsData = await teamsRes.json();
        const filtered = (teamsData.teams || []).filter(t => 
          t.abbreviation && t.mascot && !["AFC", "NFC", "PRO"].includes(t.abbreviation.toUpperCase())
        );
        setTeams(filtered);

        // Fetch all completed games for the season to build head-to-head records
        const allGames = [];
        for (let week = 1; week <= 18; week++) {
          try {
            const gamesRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2025&seasontype=2&week=${week}`);
            const gamesData = await gamesRes.json();
            const completedGames = (gamesData.events || []).filter(g => 
              g.status?.type?.completed || g.status?.type?.state === "post"
            );
            allGames.push(...completedGames);
          } catch (err) {
            console.warn(`Failed to fetch week ${week} games:`, err);
          }
        }
        setGames(allGames);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }
    fetchData();
    // Refresh data every 30 seconds to keep standings updated
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get all division leaders dynamically
  const getAllDivisionLeaders = () => {
    if (teams.length === 0) return new Set();
    const leaders = new Set();
    const afcLeaders = getDivisionLeaders(33);
    const nfcLeaders = getDivisionLeaders(34);
    afcLeaders.forEach(l => leaders.add(l));
    nfcLeaders.forEach(l => leaders.add(l));
    return leaders;
  };

  // Check if a team could still win their division
  const couldWinDivision = (team, conferenceStandings, h2hMap, gameRecords, debugLabel = '') => {
    const teamAbbr = team.abbreviation?.toUpperCase();
    const division = getTeamDivision(teamAbbr);
    if (!division || !conferenceStandings) return false;
    
    const isDebug = debugLabel.includes('AFC North') || debugLabel.includes('BAL') || debugLabel.includes('PIT');
    
    const divisionAbbrs = divisionMap[division] || [];
    const teamRec = parseRecord(team.record);
    const teamMaxWins = teamRec.wins + 1; // Best case: win remaining game
    
    // Get team's game records for divisional record calculation
    const teamGameRec = gameRecords.get(teamAbbr);
    if (!teamGameRec) return false;
    
    // Get all teams in the division from conference standings
    const divisionTeams = conferenceStandings.filter(t => 
      divisionAbbrs.includes(t.abbreviation?.toUpperCase())
    );
    
    if (divisionTeams.length === 0) return false;
    
    if (isDebug) {
      console.log(`\n${debugLabel} - Checking if ${teamAbbr} could win ${division}`);
      console.log(`  ${teamAbbr} current: ${teamRec.wins}-${teamRec.losses}, max if win: ${teamMaxWins} wins`);
      console.log(`  ${teamAbbr} divisional record: ${teamGameRec.divisionWins}-${teamGameRec.divisionLosses}-${teamGameRec.divisionTies}`);
    }
    
    // Find current division leader (team with best record)
    const sortedDivTeams = [...divisionTeams].sort((a, b) => {
      const aRec = parseRecord(a.record);
      const bRec = parseRecord(b.record);
      if (bRec.wins !== aRec.wins) return bRec.wins - aRec.wins;
      return bRec.winPct - aRec.winPct;
    });
    
    const currentLeader = sortedDivTeams[0];
    const leaderAbbr = currentLeader.abbreviation?.toUpperCase();
    
    if (leaderAbbr === teamAbbr) {
      if (isDebug) console.log(`  ${teamAbbr} is already division leader`);
      return true; // Already division leader
    }
    
    const leaderRec = parseRecord(currentLeader.record);
    const leaderMinWins = leaderRec.wins; // Worst case: lose remaining game
    const leaderGameRec = gameRecords.get(leaderAbbr);
    
    if (isDebug) {
      console.log(`  Current leader: ${leaderAbbr} (${leaderRec.wins}-${leaderRec.losses})`);
      console.log(`  ${leaderAbbr} min if lose: ${leaderMinWins} wins`);
      if (leaderGameRec) {
        console.log(`  ${leaderAbbr} divisional record: ${leaderGameRec.divisionWins}-${leaderGameRec.divisionLosses}-${leaderGameRec.divisionTies}`);
      }
    }
    
    // If team can finish with same or more wins than leader's worst case, they could win division
    if (teamMaxWins >= leaderMinWins) {
      // If they tie on overall record, check divisional record (Step 2 of NFL tiebreaking)
      if (teamMaxWins === leaderMinWins) {
        if (isDebug) console.log(`  Records would tie at ${teamMaxWins} wins, checking divisional record...`);
        
        // Calculate what divisional records would be if team wins and leader loses
        // Team's divisional record if they win (need to check if remaining game is divisional)
        // For now, assume team could improve divisional record
        const teamDivWinsIfWin = teamGameRec.divisionWins + 1; // If remaining game is divisional
        const leaderDivWinsIfLose = leaderGameRec ? leaderGameRec.divisionWins : 0;
        
        // Check if team's best divisional record could beat leader's worst
        // Team needs to have a better divisional record after winning
        if (teamDivWinsIfWin > leaderDivWinsIfLose) {
          if (isDebug) console.log(`  ${teamAbbr} could win on divisional record (${teamDivWinsIfWin} > ${leaderDivWinsIfLose})`);
          return true;
        }
        
        // Check head-to-head as fallback (Step 1)
        const h2h = getHeadToHeadRecord(teamAbbr, leaderAbbr, h2hMap);
        if (h2h && h2h.total > 0) {
          const record = h2hMap.get([teamAbbr, leaderAbbr].sort().join('_'));
          if (record) {
            const teamWins = record[teamAbbr] || 0;
            const leaderWins = record[leaderAbbr] || 0;
            if (isDebug) {
              console.log(`  Head-to-head: ${teamAbbr} ${teamWins}-${leaderWins} ${leaderAbbr}`);
            }
            if (teamWins > leaderWins) {
              if (isDebug) console.log(`  ${teamAbbr} could win on head-to-head`);
              return true; // Team wins head-to-head
            }
          }
        }
        
        // Check if team could win on divisional record
        // If team wins their remaining game and it's a divisional game, check divisional record
        // For Baltimore: if they beat Pittsburgh, they'd have 4-2 divisional record vs Steelers' 3-3
        const teamCurrentDivWins = teamGameRec.divisionWins;
        const teamCurrentDivLosses = teamGameRec.divisionLosses;
        const leaderCurrentDivWins = leaderGameRec ? leaderGameRec.divisionWins : 0;
        const leaderCurrentDivLosses = leaderGameRec ? leaderGameRec.divisionLosses : 0;
        
        // Check if the remaining game between team and leader is divisional (they're in same division)
        const isDivisionalGame = areInSameDivision(teamAbbr, leaderAbbr);
        
        if (isDivisionalGame) {
          // If team wins and leader loses (they play each other), calculate new divisional records
          const teamDivWinsIfWin = teamCurrentDivWins + 1; // Beat leader
          const teamDivLossesIfWin = teamCurrentDivLosses;
          const leaderDivWinsIfLose = leaderCurrentDivWins; // Lose to team
          const leaderDivLossesIfLose = leaderCurrentDivLosses + 1;
          
          // Calculate divisional win percentages
          const teamDivTotal = teamDivWinsIfWin + teamDivLossesIfWin;
          const leaderDivTotal = leaderDivWinsIfLose + leaderDivLossesIfLose;
          const teamDivPct = teamDivTotal > 0 ? teamDivWinsIfWin / teamDivTotal : 0;
          const leaderDivPct = leaderDivTotal > 0 ? leaderDivWinsIfLose / leaderDivTotal : 0;
          
          if (isDebug) {
            console.log(`  Remaining game is divisional (${teamAbbr} vs ${leaderAbbr})`);
            console.log(`  If ${teamAbbr} wins: divisional record ${teamDivWinsIfWin}-${teamDivLossesIfWin} (${(teamDivPct * 100).toFixed(1)}%)`);
            console.log(`  If ${leaderAbbr} loses: divisional record ${leaderDivWinsIfLose}-${leaderDivLossesIfLose} (${(leaderDivPct * 100).toFixed(1)}%)`);
          }
          
          // If team's divisional record would be better, they could win the division
          if (teamDivPct > leaderDivPct || (teamDivPct === leaderDivPct && teamDivWinsIfWin > leaderDivWinsIfLose)) {
            if (isDebug) console.log(`  ${teamAbbr} could win on divisional record`);
            return true;
          }
        } else {
          // If remaining game is not divisional, check current divisional records
          // Team would need to have a better divisional record after winning
          const teamDivTotal = teamCurrentDivWins + teamCurrentDivLosses;
          const leaderDivTotal = leaderCurrentDivWins + leaderCurrentDivLosses;
          const teamDivPct = teamDivTotal > 0 ? teamCurrentDivWins / teamDivTotal : 0;
          const leaderDivPct = leaderDivTotal > 0 ? leaderCurrentDivWins / leaderDivTotal : 0;
          
          if (teamDivPct > leaderDivPct || (teamDivPct === leaderDivPct && teamCurrentDivWins > leaderCurrentDivWins)) {
            if (isDebug) console.log(`  ${teamAbbr} could win on divisional record (current: ${teamCurrentDivWins}-${teamCurrentDivLosses} vs ${leaderCurrentDivWins}-${leaderCurrentDivLosses})`);
            return true;
          }
        }
      } else {
        if (isDebug) console.log(`  ${teamAbbr} could finish with more wins (${teamMaxWins} > ${leaderMinWins})`);
        return true; // Team can finish with more wins
      }
    } else {
      if (isDebug) console.log(`  ${teamAbbr} cannot catch ${leaderAbbr} (max ${teamMaxWins} < min ${leaderMinWins})`);
    }
    
    return false;
  };

  // Check if a team is mathematically eliminated from playoffs
  const isEliminated = (team, conferenceStandings, allDivLeaders, h2hMap, gameRecords, debugLabel = '') => {
    const teamAbbr = team.abbreviation?.toUpperCase();
    if (!teamAbbr || !conferenceStandings || conferenceStandings.length === 0) return false;
    
    const isDebug = debugLabel.includes('AFC North') || debugLabel.includes('BAL') || debugLabel.includes('PIT');
    
    // If team is a division leader, they can't be eliminated (division leaders get seeds 1-4)
    if (allDivLeaders && allDivLeaders.has(teamAbbr)) {
      if (isDebug) console.log(`${debugLabel} - ${teamAbbr} is a division leader, cannot be eliminated`);
      return false;
    }
    
    // Check if team could still win their division (if so, they're not eliminated)
    const couldWinDiv = couldWinDivision(team, conferenceStandings, h2hMap, gameRecords, debugLabel);
    if (couldWinDiv) {
      if (isDebug) console.log(`${debugLabel} - ${teamAbbr} could still win their division, cannot be eliminated`);
      return false;
    }
    
    const teamRec = parseRecord(team.record);
    const maxPossibleWins = teamRec.wins + 1; // Assuming 1 game remaining (Week 18)
    const maxPossibleWinPct = maxPossibleWins / (teamRec.total + 1);
    
    if (isDebug) {
      console.log(`\n${debugLabel} - Checking elimination for ${teamAbbr} (${teamRec.wins}-${teamRec.losses})`);
      console.log(`  Max possible wins if they win: ${maxPossibleWins}`);
    }
    
    // Count how many teams are guaranteed to finish ahead (division leaders + wild cards)
    let teamsGuaranteedAhead = 0;
    const teamsAhead = [];
    
    // Count division leaders (they get seeds 1-4)
    const divisionLeadersInConf = conferenceStandings.filter(t => {
      const abbr = t.abbreviation?.toUpperCase();
      return abbr && abbr !== teamAbbr && allDivLeaders && allDivLeaders.has(abbr);
    });
    teamsGuaranteedAhead += divisionLeadersInConf.length;
    if (isDebug) {
      console.log(`  Division leaders ahead: ${divisionLeadersInConf.length} (${divisionLeadersInConf.map(t => t.abbreviation).join(', ')})`);
      divisionLeadersInConf.forEach(t => teamsAhead.push(`${t.abbreviation} (div leader)`));
    }
    
    // Count wild card teams that are guaranteed to finish ahead
    for (const otherTeam of conferenceStandings) {
      const otherAbbr = otherTeam.abbreviation?.toUpperCase();
      if (!otherAbbr || otherAbbr === teamAbbr) continue;
      
      // Skip division leaders (already counted)
      if (allDivLeaders && allDivLeaders.has(otherAbbr)) continue;
      
      const otherRec = parseRecord(otherTeam.record);
      const otherMaxWins = otherRec.wins + 1;
      const otherMaxWinPct = otherMaxWins / (otherRec.total + 1);
      
      // If other team can finish with more wins, or same wins but better win percentage
      if (otherMaxWins > maxPossibleWins || 
          (otherMaxWins === maxPossibleWins && otherMaxWinPct >= maxPossibleWinPct)) {
        teamsGuaranteedAhead++;
        if (isDebug) {
          teamsAhead.push(`${otherAbbr} (${otherRec.wins}-${otherRec.losses}, max ${otherMaxWins} wins)`);
        }
      }
    }
    
    if (isDebug) {
      console.log(`  Total teams guaranteed ahead: ${teamsGuaranteedAhead}`);
      console.log(`  Teams ahead: ${teamsAhead.join(', ')}`);
      console.log(`  Result: ${teamsGuaranteedAhead >= 7 ? 'ELIMINATED' : 'NOT ELIMINATED'} (need 7+ teams ahead to be eliminated)`);
    }
    
    // If 7 or more teams are guaranteed to finish ahead, team is eliminated
    return teamsGuaranteedAhead >= 7;
  };

  // Check if a wild card team has clinched a playoff spot
  const hasClenched = (team, seed, conferenceStandings, allDivLeaders) => {
    if (!seed || !conferenceStandings || seed > 7) return false;
    
    const teamAbbr = team.abbreviation?.toUpperCase();
    
    // Division leaders are handled separately, they always have "DIV LEADER" status
    if (allDivLeaders && allDivLeaders.has(teamAbbr)) return false;
    
    const teamRec = parseRecord(team.record);
    const teamMinWins = teamRec.wins; // Worst case: lose remaining game
    const teamMinWinPct = teamMinWins / (teamRec.total + 1);
    
    // Count how many teams are guaranteed to finish behind this team
    // A team has clinched if at least 7 teams are guaranteed to finish behind them
    let teamsGuaranteedBehind = 0;
    
    // Count division leaders (they get seeds 1-4, so they're ahead)
    const divisionLeadersInConf = conferenceStandings.filter(t => {
      const abbr = t.abbreviation?.toUpperCase();
      return abbr && abbr !== teamAbbr && allDivLeaders && allDivLeaders.has(abbr);
    });
    // Division leaders are ahead, not behind
    
    // Count wild card teams that are guaranteed to finish behind
    for (const otherTeam of conferenceStandings) {
      const otherAbbr = otherTeam.abbreviation?.toUpperCase();
      if (!otherAbbr || otherAbbr === teamAbbr) continue;
      
      // Skip division leaders (they're ahead)
      if (allDivLeaders && allDivLeaders.has(otherAbbr)) continue;
      
      const otherRec = parseRecord(otherTeam.record);
      const otherMaxWins = otherRec.wins + 1; // Best case: win remaining game
      const otherMaxWinPct = otherMaxWins / (otherRec.total + 1);
      
      // If other team's best case is worse than this team's worst case, they're guaranteed behind
      if (otherMaxWins < teamMinWins || 
          (otherMaxWins === teamMinWins && otherMaxWinPct < teamMinWinPct)) {
        teamsGuaranteedBehind++;
      }
    }
    
    // If 7 or more teams are guaranteed to finish behind, this team has clinched
    // (There are 16 teams per conference, so if 7+ are behind, this team is in top 7)
    return teamsGuaranteedBehind >= 7;
  };

  // Check if a division leader has clinched their division (can't lose it even if they lose)
  const hasClenchedDivision = (team, seed, conferenceStandings, allDivLeaders, h2hMap, gameRecords, debugLabel = '') => {
    const teamAbbr = team.abbreviation?.toUpperCase();
    if (!allDivLeaders || !allDivLeaders.has(teamAbbr)) return false;
    if (!seed || seed > 4) return false; // Only division leaders in seeds 1-4
    
    const isDebug = debugLabel.includes('AFC North') || debugLabel.includes('BAL') || debugLabel.includes('PIT');
    
    // Get the team's division
    const division = getTeamDivision(teamAbbr);
    if (!division) return false;
    
    if (isDebug) {
      console.log(`\n${debugLabel} - Checking if ${teamAbbr} has clinched ${division}`);
    }
    
    // Get all teams in the division
    const divisionAbbrs = divisionMap[division] || [];
    const divisionTeams = conferenceStandings.filter(t => 
      divisionAbbrs.includes(t.abbreviation?.toUpperCase())
    );
    
    // Check if any other team in the division could catch them
    const teamRec = parseRecord(team.record);
    const teamMinWins = teamRec.wins; // Worst case: lose remaining game
    
    if (isDebug) {
      console.log(`  ${teamAbbr} current: ${teamRec.wins}-${teamRec.losses}, min if lose: ${teamMinWins} wins`);
    }
    
    for (const otherTeam of divisionTeams) {
      const otherAbbr = otherTeam.abbreviation?.toUpperCase();
      if (!otherAbbr || otherAbbr === teamAbbr) continue;
      
      const otherRec = parseRecord(otherTeam.record);
      const otherMaxWins = otherRec.wins + 1; // Best case: win remaining game
      
      if (isDebug) {
        console.log(`  Checking ${otherAbbr} (${otherRec.wins}-${otherRec.losses}, max if win: ${otherMaxWins} wins)`);
      }
      
      // If other team can finish with same or more wins, check tiebreakers
      if (otherMaxWins >= teamMinWins) {
        // If they tie, check if other team could win the tiebreaker
        if (otherMaxWins === teamMinWins) {
          // Check head-to-head - if other team won, they could take the division
          const h2h = getHeadToHeadRecord(teamAbbr, otherAbbr, h2hMap);
          if (h2h && h2h.total > 0) {
            const record = h2hMap.get([teamAbbr, otherAbbr].sort().join('_'));
            if (record) {
              const otherWins = record[otherAbbr] || 0;
              const teamWins = record[teamAbbr] || 0;
              if (isDebug) {
                console.log(`    Head-to-head: ${teamAbbr} ${teamWins}-${otherWins} ${otherAbbr}`);
              }
              if (otherWins > teamWins) {
                if (isDebug) console.log(`    ${otherAbbr} could win division on head-to-head - NOT CLINCHED`);
                return false; // Other team could win on head-to-head
              }
            }
          }
        } else {
          if (isDebug) console.log(`    ${otherAbbr} could finish with more wins (${otherMaxWins} > ${teamMinWins}) - NOT CLINCHED`);
          return false; // Other team could finish with more wins
        }
      } else {
        if (isDebug) console.log(`    ${otherAbbr} cannot catch ${teamAbbr} (max ${otherMaxWins} < min ${teamMinWins})`);
      }
    }
    
    if (isDebug) console.log(`  Result: ${teamAbbr} has CLINCHED ${division}`);
    return true; // No team can catch them
  };

  const getStatus = (abbr, seed, allDivLeaders, team, conferenceStandings, h2hMap, gameRecords, debugLabel = '') => {
    const a = abbr?.toUpperCase().trim(); 
    const isDebug = debugLabel.includes('AFC North') || debugLabel.includes('BAL') || debugLabel.includes('PIT') || 
                    debugLabel.includes('Steelers') || debugLabel.includes('Ravens');
    
    if (isDebug) {
      console.log(`\n=== STATUS CHECK: ${a} (Seed ${seed || 'N/A'}) ===`);
    }
    
    // Priority 1: Check if division leader has clinched division
    if (allDivLeaders && allDivLeaders.has(a)) {
      if (isDebug) console.log(`  ${a} is a division leader`);
      const clinchedDiv = hasClenchedDivision(team, seed, conferenceStandings || [], allDivLeaders, h2hMap, gameRecords, debugLabel);
      if (clinchedDiv) {
        if (isDebug) console.log(`  RESULT: DIV LEADER (clinched)`);
        return { label: "DIV LEADER", color: "#000" };
      }
      // Division leader but not clinched - they're in the hunt
      if (seed && seed <= 7) {
        if (isDebug) console.log(`  RESULT: IN THE HUNT (division leader but not clinched, seed ${seed})`);
        return { label: "IN THE HUNT", color: "#666" };
      }
      if (isDebug) console.log(`  RESULT: DIV LEADER (seed ${seed})`);
      return { label: "DIV LEADER", color: "#000" };
    }
    
    // Priority 2: Check if wild card team has clinched playoff spot
    const clinched = hasClenched(team, seed, conferenceStandings || [], allDivLeaders);
    if (clinched) {
      if (isDebug) console.log(`  RESULT: CLINCHED (x) (wild card team has clinched)`);
      return { label: "CLINCHED (x)", color: "#000" };
    }
    
    // Priority 3: Check if mathematically eliminated
    const eliminated = isEliminated(team, conferenceStandings || [], allDivLeaders, h2hMap, gameRecords, debugLabel);
    if (eliminated) {
      if (isDebug) console.log(`  RESULT: ELIMINATED`);
      return { label: "ELIMINATED", color: "#d32f2f", border: "1px solid #d32f2f" };
    }
    
    // Priority 4: Check if currently in playoffs (seeds 1-7)
    if (seed && seed <= 7) {
      // Teams in playoff position but not clinched
      if (isDebug) console.log(`  RESULT: IN THE HUNT (seed ${seed}, in playoff position)`);
      return { label: "IN THE HUNT", color: "#666" };
    }
    
    // Priority 5: Teams that could make playoffs but aren't currently in (seeds 8+)
    if (seed && seed >= 8) {
      // These teams are on the bubble - they could still make it
      if (isDebug) console.log(`  RESULT: ON THE BUBBLE (seed ${seed}, could make playoffs)`);
      return { label: "ON THE BUBBLE", color: "#856404", bg: "#fff3cd", border: "1px solid #ffeeba" };
    }
    
    // Default fallback
    if (isDebug) console.log(`  RESULT: IN THE HUNT (default)`);
    return { label: "IN THE HUNT", color: "#666" };
  };

  // Get team's division
  const getTeamDivision = (teamAbbr) => {
    const abbr = teamAbbr?.toUpperCase();
    for (const [div, abbrs] of Object.entries(divisionMap)) {
      if (abbrs.includes(abbr)) return div;
    }
    return null;
  };

  // Get team's conference
  const getTeamConference = (teamAbbr) => {
    const div = getTeamDivision(teamAbbr);
    if (!div) return null;
    return div.startsWith("AFC") ? "AFC" : "NFC";
  };

  // Check if two teams are in the same division
  const areInSameDivision = (abbr1, abbr2) => {
    return getTeamDivision(abbr1) === getTeamDivision(abbr2);
  };

  // Check if two teams are in the same conference
  const areInSameConference = (abbr1, abbr2) => {
    return getTeamConference(abbr1) === getTeamConference(abbr2);
  };

  // Build comprehensive game records for tiebreaking
  const buildGameRecords = () => {
    const records = new Map(); // key: teamAbbr, value: { wins, losses, ties, divisionWins, divisionLosses, confWins, confLosses, opponents: Set }
    
    games.forEach(game => {
      const competition = game.competitions?.[0];
      if (!competition) return;
      
      const competitors = competition.competitors || [];
      if (competitors.length !== 2) return;
      
      const team1 = competitors[0];
      const team2 = competitors[1];
      const team1Abbr = team1.team?.abbreviation?.toUpperCase();
      const team2Abbr = team2.team?.abbreviation?.toUpperCase();
      
      if (!team1Abbr || !team2Abbr) return;
      
      const team1Score = parseInt(team1.score || 0);
      const team2Score = parseInt(team2.score || 0);
      
      // Skip if game not completed or scores are invalid
      if (team1Score === 0 && team2Score === 0 && !game.status?.type?.completed) return;
      
      // Initialize records if needed
      if (!records.has(team1Abbr)) {
        records.set(team1Abbr, { wins: 0, losses: 0, ties: 0, divisionWins: 0, divisionLosses: 0, divisionTies: 0, confWins: 0, confLosses: 0, confTies: 0, opponents: new Set() });
      }
      if (!records.has(team2Abbr)) {
        records.set(team2Abbr, { wins: 0, losses: 0, ties: 0, divisionWins: 0, divisionLosses: 0, divisionTies: 0, confWins: 0, confLosses: 0, confTies: 0, opponents: new Set() });
      }
      
      const team1Record = records.get(team1Abbr);
      const team2Record = records.get(team2Abbr);
      
      // Track opponents for common games calculation
      team1Record.opponents.add(team2Abbr);
      team2Record.opponents.add(team1Abbr);
      
      const isDivisionGame = areInSameDivision(team1Abbr, team2Abbr);
      const isConferenceGame = areInSameConference(team1Abbr, team2Abbr);
      
      if (team1Score > team2Score) {
        team1Record.wins++;
        team2Record.losses++;
        if (isDivisionGame) {
          team1Record.divisionWins++;
          team2Record.divisionLosses++;
        }
        if (isConferenceGame) {
          team1Record.confWins++;
          team2Record.confLosses++;
        }
      } else if (team2Score > team1Score) {
        team2Record.wins++;
        team1Record.losses++;
        if (isDivisionGame) {
          team2Record.divisionWins++;
          team1Record.divisionLosses++;
        }
        if (isConferenceGame) {
          team2Record.confWins++;
          team1Record.confLosses++;
        }
      } else {
        // Tie
        team1Record.ties++;
        team2Record.ties++;
        if (isDivisionGame) {
          team1Record.divisionTies++;
          team2Record.divisionTies++;
        }
        if (isConferenceGame) {
          team1Record.confTies++;
          team2Record.confTies++;
        }
      }
    });
    
    return records;
  };

  // Get common opponents between two teams
  const getCommonOpponents = (team1Abbr, team2Abbr, gameRecords) => {
    const team1Rec = gameRecords.get(team1Abbr?.toUpperCase());
    const team2Rec = gameRecords.get(team2Abbr?.toUpperCase());
    if (!team1Rec || !team2Rec) return new Set();
    
    const common = new Set();
    team1Rec.opponents.forEach(opp => {
      if (team2Rec.opponents.has(opp) && opp !== team1Abbr?.toUpperCase() && opp !== team2Abbr?.toUpperCase()) {
        common.add(opp);
      }
    });
    return common;
  };

  // Calculate record against common opponents
  const getCommonGamesRecord = (teamAbbr, commonOpponents, gameRecords) => {
    if (!commonOpponents || commonOpponents.size === 0) return { wins: 0, losses: 0, ties: 0, winPct: 0 };
    
    let wins = 0, losses = 0, ties = 0;
    
    games.forEach(game => {
      const competition = game.competitions?.[0];
      if (!competition) return;
      
      const competitors = competition.competitors || [];
      if (competitors.length !== 2) return;
      
      const team1 = competitors[0];
      const team2 = competitors[1];
      const team1Abbr = team1.team?.abbreviation?.toUpperCase();
      const team2Abbr = team2.team?.abbreviation?.toUpperCase();
      
      if (!team1Abbr || !team2Abbr) return;
      
      const teamAbbrUpper = teamAbbr.toUpperCase();
      if (team1Abbr !== teamAbbrUpper && team2Abbr !== teamAbbrUpper) return;
      
      const opponentAbbr = team1Abbr === teamAbbrUpper ? team2Abbr : team1Abbr;
      if (!commonOpponents.has(opponentAbbr)) return;
      
      const teamScore = team1Abbr === teamAbbrUpper ? parseInt(team1.score || 0) : parseInt(team2.score || 0);
      const oppScore = team1Abbr === teamAbbrUpper ? parseInt(team2.score || 0) : parseInt(team1.score || 0);
      
      if (teamScore > oppScore) wins++;
      else if (oppScore > teamScore) losses++;
      else ties++;
    });
    
    const total = wins + losses + ties;
    const winPct = total > 0 ? (wins + ties * 0.5) / total : 0;
    return { wins, losses, ties, winPct, total };
  };

  // Build head-to-head record map from games
  const buildHeadToHeadMap = () => {
    const h2hMap = new Map(); // key: "TEAM1_TEAM2", value: { TEAM1: wins, TEAM2: wins }
    
    games.forEach(game => {
      const competition = game.competitions?.[0];
      if (!competition) return;
      
      const competitors = competition.competitors || [];
      if (competitors.length !== 2) return;
      
      const team1 = competitors[0];
      const team2 = competitors[1];
      const team1Abbr = team1.team?.abbreviation?.toUpperCase();
      const team2Abbr = team2.team?.abbreviation?.toUpperCase();
      
      if (!team1Abbr || !team2Abbr) return;
      
      const team1Score = parseInt(team1.score || 0);
      const team2Score = parseInt(team2.score || 0);
      
      // Skip if game not completed or scores are invalid
      if (team1Score === 0 && team2Score === 0) return;
      
      // Create consistent key (alphabetically sorted)
      const sortedAbbrs = [team1Abbr, team2Abbr].sort();
      const key = sortedAbbrs.join('_');
      
      if (!h2hMap.has(key)) {
        h2hMap.set(key, { [sortedAbbrs[0]]: 0, [sortedAbbrs[1]]: 0 });
      }
      
      const record = h2hMap.get(key);
      if (team1Score > team2Score) {
        record[team1Abbr]++;
      } else if (team2Score > team1Score) {
        record[team2Abbr]++;
      }
      // Ties: both get 0.5, but for simplicity we'll treat as 0-0 and use other tiebreakers
    });
    
    return h2hMap;
  };

  // Get head-to-head record between two teams
  const getHeadToHeadRecord = (team1Abbr, team2Abbr, h2hMap) => {
    const t1 = team1Abbr.toUpperCase();
    const t2 = team2Abbr.toUpperCase();
    const key = [t1, t2].sort().join('_');
    const record = h2hMap.get(key);
    if (!record) return null;
    
    return {
      team1Wins: record[t1] || 0,
      team2Wins: record[t2] || 0,
      total: (record[t1] || 0) + (record[t2] || 0)
    };
  };

  // Parse win-loss record string (e.g., "10-7" or "9-8") to get wins and win percentage
  const parseRecord = (recordStr) => {
    if (!recordStr) return { wins: 0, losses: 0, winPct: 0, total: 0 };
    
    // Handle string format like "10-7" or number format
    if (typeof recordStr === 'string') {
      const parts = recordStr.split('-');
      if (parts.length >= 2) {
        const wins = parseInt(parts[0].trim()) || 0;
        const losses = parseInt(parts[1].trim()) || 0;
        const total = wins + losses;
        const winPct = total > 0 ? wins / total : 0;
        return { wins, losses, winPct, total };
      }
    }
    
    return { wins: 0, losses: 0, winPct: 0, total: 0 };
  };

  // Get divisions for a specific conference
  const getConferenceDivisions = (confId) => {
    const isAFC = confId === 33;
    return Object.entries(divisionMap).filter(([div]) => 
      isAFC ? div.startsWith("AFC") : div.startsWith("NFC")
    );
  };

  // Break tie between two teams using NFL tiebreaking procedures
  const breakTie = (teamA, teamB, h2hMap, gameRecords, isDivision = false, debugLabel = '') => {
    const aAbbr = teamA.abbreviation?.toUpperCase();
    const bAbbr = teamB.abbreviation?.toUpperCase();
    if (!aAbbr || !bAbbr) return 0;
    
    const aRec = parseRecord(teamA.record);
    const bRec = parseRecord(teamB.record);
    
    const isDebug = debugLabel.includes('NFC South');
    
    // Step 1: Head-to-head (always first for two teams)
    const h2h = getHeadToHeadRecord(aAbbr, bAbbr, h2hMap);
    if (h2h && h2h.total > 0) {
      const record = h2hMap.get([aAbbr, bAbbr].sort().join('_'));
      if (record) {
        const aWins = record[aAbbr] || 0;
        const bWins = record[bAbbr] || 0;
        if (isDebug) {
          console.log(`${debugLabel} - Step 1 (Head-to-head): ${aAbbr} ${aWins}-${bWins} ${bAbbr}`);
        }
        if (aWins > bWins) {
          if (isDebug) console.log(`${debugLabel} - ${aAbbr} wins on head-to-head`);
          return -1; // Team A wins head-to-head
        }
        if (bWins > aWins) {
          if (isDebug) console.log(`${debugLabel} - ${bAbbr} wins on head-to-head`);
          return 1; // Team B wins head-to-head
        }
        if (isDebug) console.log(`${debugLabel} - Head-to-head is tied, moving to Step 2`);
      }
    }
    
    // Step 2: Best won-lost-tied percentage in games played within the division (if same division)
    if (isDivision && areInSameDivision(aAbbr, bAbbr)) {
      const aGameRec = gameRecords.get(aAbbr);
      const bGameRec = gameRecords.get(bAbbr);
      if (aGameRec && bGameRec) {
        const aDivTotal = aGameRec.divisionWins + aGameRec.divisionLosses + aGameRec.divisionTies;
        const bDivTotal = bGameRec.divisionWins + bGameRec.divisionLosses + bGameRec.divisionTies;
        if (aDivTotal > 0 && bDivTotal > 0) {
          const aDivPct = (aGameRec.divisionWins + aGameRec.divisionTies * 0.5) / aDivTotal;
          const bDivPct = (bGameRec.divisionWins + bGameRec.divisionTies * 0.5) / bDivTotal;
          if (isDebug) {
            console.log(`${debugLabel} - Step 2 (Division Record): ${aAbbr} ${aGameRec.divisionWins}-${aGameRec.divisionLosses}-${aGameRec.divisionTies} (${(aDivPct * 100).toFixed(1)}%) vs ${bAbbr} ${bGameRec.divisionWins}-${bGameRec.divisionLosses}-${bGameRec.divisionTies} (${(bDivPct * 100).toFixed(1)}%)`);
          }
          if (bDivPct !== aDivPct) {
            if (isDebug) console.log(`${debugLabel} - ${bDivPct > aDivPct ? bAbbr : aAbbr} wins on division record`);
            return bDivPct - aDivPct;
          }
          if (isDebug) console.log(`${debugLabel} - Division record is tied, moving to Step 3`);
        }
      }
    }
    
    // Step 3: Best won-lost-tied percentage in common games (minimum of 4)
    const commonOpponents = getCommonOpponents(aAbbr, bAbbr, gameRecords);
    if (isDebug) {
      console.log(`${debugLabel} - Common opponents:`, Array.from(commonOpponents));
    }
    if (commonOpponents.size >= 4) {
      const aCommonRec = getCommonGamesRecord(aAbbr, commonOpponents, gameRecords);
      const bCommonRec = getCommonGamesRecord(bAbbr, commonOpponents, gameRecords);
      if (isDebug) {
        console.log(`${debugLabel} - Step 3 (Common Games): ${aAbbr} ${aCommonRec.wins}-${aCommonRec.losses}-${aCommonRec.ties} (${(aCommonRec.winPct * 100).toFixed(1)}%, ${aCommonRec.total} games) vs ${bAbbr} ${bCommonRec.wins}-${bCommonRec.losses}-${bCommonRec.ties} (${(bCommonRec.winPct * 100).toFixed(1)}%, ${bCommonRec.total} games)`);
      }
      if (aCommonRec.total >= 4 && bCommonRec.total >= 4) {
        if (bCommonRec.winPct !== aCommonRec.winPct) {
          if (isDebug) console.log(`${debugLabel} - ${bCommonRec.winPct > aCommonRec.winPct ? bAbbr : aAbbr} wins on common games`);
          return bCommonRec.winPct - aCommonRec.winPct;
        }
        if (isDebug) console.log(`${debugLabel} - Common games record is tied, moving to Step 4`);
      } else if (isDebug) {
        console.log(`${debugLabel} - Not enough common games (need 4, have ${aCommonRec.total}/${bCommonRec.total}), moving to Step 4`);
      }
    } else if (isDebug) {
      console.log(`${debugLabel} - Not enough common opponents (need 4, have ${commonOpponents.size}), moving to Step 4`);
    }
    
    // Step 4: Best won-lost-tied percentage in games played within the conference
    const aGameRec = gameRecords.get(aAbbr);
    const bGameRec = gameRecords.get(bAbbr);
    if (aGameRec && bGameRec && areInSameConference(aAbbr, bAbbr)) {
      const aConfTotal = aGameRec.confWins + aGameRec.confLosses + aGameRec.confTies;
      const bConfTotal = bGameRec.confWins + bGameRec.confLosses + bGameRec.confTies;
      if (aConfTotal > 0 && bConfTotal > 0) {
        const aConfPct = (aGameRec.confWins + aGameRec.confTies * 0.5) / aConfTotal;
        const bConfPct = (bGameRec.confWins + bGameRec.confTies * 0.5) / bConfTotal;
        if (isDebug) {
          console.log(`${debugLabel} - Step 4 (Conference Record): ${aAbbr} ${aGameRec.confWins}-${aGameRec.confLosses}-${aGameRec.confTies} (${(aConfPct * 100).toFixed(1)}%) vs ${bAbbr} ${bGameRec.confWins}-${bGameRec.confLosses}-${bGameRec.confTies} (${(bConfPct * 100).toFixed(1)}%)`);
        }
        if (bConfPct !== aConfPct) {
          if (isDebug) console.log(`${debugLabel} - ${bConfPct > aConfPct ? bAbbr : aAbbr} wins on conference record`);
          return bConfPct - aConfPct;
        }
        if (isDebug) console.log(`${debugLabel} - Conference record is tied, using overall record`);
      }
    }
    
    // Fallback to overall record
    if (isDebug) {
      console.log(`${debugLabel} - Final: Using overall record - ${aAbbr} ${aRec.wins}-${aRec.losses} (${(aRec.winPct * 100).toFixed(1)}%) vs ${bAbbr} ${bRec.wins}-${bRec.losses} (${(bRec.winPct * 100).toFixed(1)}%)`);
    }
    if (bRec.winPct !== aRec.winPct) return bRec.winPct - aRec.winPct;
    if (bRec.wins !== aRec.wins) return bRec.wins - aRec.wins;
    return aRec.losses - bRec.losses; // Fewer losses is better
  };

  // Calculate head-to-head win percentage for a team against other teams in a tie
  const getHeadToHeadWinPct = (teamAbbr, otherTeamAbbrs, h2hMap) => {
    let totalWins = 0;
    let totalGames = 0;
    
    for (const otherAbbr of otherTeamAbbrs) {
      const h2h = getHeadToHeadRecord(teamAbbr, otherAbbr, h2hMap);
      if (h2h && h2h.total > 0) {
        const record = h2hMap.get([teamAbbr, otherAbbr].sort().join('_'));
        if (record) {
          const teamWins = record[teamAbbr] || 0;
          totalWins += teamWins;
          totalGames += h2h.total;
        }
      }
    }
    
    return totalGames > 0 ? totalWins / totalGames : 0;
  };

  // Break tie between multiple teams (3+)
  const breakMultiTeamTie = (tiedTeams, h2hMap, gameRecords, isDivision = false) => {
    if (tiedTeams.length <= 1) return tiedTeams;
    if (tiedTeams.length === 2) {
      const sorted = [...tiedTeams].sort((a, b) => breakTie(a, b, h2hMap, gameRecords, isDivision));
      return sorted;
    }
    
    // For 3+ teams, check head-to-head sweep first
    // If one team beat all others or lost to all others, they're determined
    const teamAbbrs = tiedTeams.map(t => t.abbreviation?.toUpperCase());
    
    for (const team of tiedTeams) {
      const teamAbbr = team.abbreviation?.toUpperCase();
      let winsAgainstOthers = 0;
      let lossesAgainstOthers = 0;
      
      for (const otherAbbr of teamAbbrs) {
        if (otherAbbr === teamAbbr) continue;
        const h2h = getHeadToHeadRecord(teamAbbr, otherAbbr, h2hMap);
        if (h2h && h2h.total > 0) {
          const record = h2hMap.get([teamAbbr, otherAbbr].sort().join('_'));
          if (record) {
            const teamWins = record[teamAbbr] || 0;
            const otherWins = record[otherAbbr] || 0;
            if (teamWins > otherWins) winsAgainstOthers++;
            else if (otherWins > teamWins) lossesAgainstOthers++;
          }
        }
      }
      
      // If team beat all others, they win
      if (winsAgainstOthers === tiedTeams.length - 1) {
        const remaining = tiedTeams.filter(t => t.abbreviation?.toUpperCase() !== teamAbbr);
        return [team, ...breakMultiTeamTie(remaining, h2hMap, gameRecords, isDivision)];
      }
      // If team lost to all others, they're eliminated
      if (lossesAgainstOthers === tiedTeams.length - 1) {
        const remaining = tiedTeams.filter(t => t.abbreviation?.toUpperCase() !== teamAbbr);
        return [...breakMultiTeamTie(remaining, h2hMap, gameRecords, isDivision), team];
      }
    }
    
    // No clear sweep, use head-to-head win percentage (Step 1 for 3+ teams)
    // Calculate head-to-head win percentage for each team against the others
    const teamsWithH2HPct = tiedTeams.map(team => {
      const teamAbbr = team.abbreviation?.toUpperCase();
      const otherAbbrs = teamAbbrs.filter(abbr => abbr !== teamAbbr);
      const h2hWinPct = getHeadToHeadWinPct(teamAbbr, otherAbbrs, h2hMap);
      return { team, h2hWinPct };
    });
    
    // Sort by head-to-head win percentage (highest first)
    teamsWithH2HPct.sort((a, b) => b.h2hWinPct - a.h2hWinPct);
    
    // If there's a clear winner by head-to-head, return sorted list
    if (teamsWithH2HPct[0].h2hWinPct > teamsWithH2HPct[1].h2hWinPct) {
      const winner = teamsWithH2HPct[0].team;
      const remaining = teamsWithH2HPct.slice(1).map(t => t.team);
      return [winner, ...breakMultiTeamTie(remaining, h2hMap, gameRecords, isDivision)];
    }
    
    // If head-to-head is tied, continue with other tiebreakers
    // For now, fall back to overall record
    return [...tiedTeams].sort((a, b) => {
      const aRec = parseRecord(a.record);
      const bRec = parseRecord(b.record);
      if (bRec.wins !== aRec.wins) return bRec.wins - aRec.wins;
      if (bRec.winPct !== aRec.winPct) return bRec.winPct - aRec.winPct;
      return aRec.losses - bRec.losses;
    });
  };

  // Get division leader for each division
  const getDivisionLeaders = (confId) => {
    const conferenceTeams = teams.filter(t => t.conference?.conference_id === confId);
    const leaders = new Set();
    const conferenceDivisions = getConferenceDivisions(confId);
    const h2hMap = buildHeadToHeadMap();
    const gameRecords = buildGameRecords();
    
    conferenceDivisions.forEach(([div, abbrs]) => {
      const divTeams = conferenceTeams.filter(t => {
        const teamAbbr = t.abbreviation?.toUpperCase();
        return teamAbbr && abbrs.includes(teamAbbr);
      });
      
      if (divTeams.length === 0) return;
      
      // Group teams by record
      const teamsByRecord = new Map();
      divTeams.forEach(team => {
        const rec = parseRecord(team.record);
        const key = `${rec.wins}-${rec.losses}`;
        if (!teamsByRecord.has(key)) {
          teamsByRecord.set(key, []);
        }
        teamsByRecord.get(key).push(team);
      });
      
      // Sort record groups (best record first)
      const sortedGroups = Array.from(teamsByRecord.entries()).sort(([keyA], [keyB]) => {
        const [winsA, lossesA] = keyA.split('-').map(Number);
        const [winsB, lossesB] = keyB.split('-').map(Number);
        if (winsB !== winsA) return winsB - winsA;
        if (lossesA !== lossesB) return lossesA - lossesB;
        return 0;
      });
      
      // Find the leader from the best record group
      if (sortedGroups.length > 0) {
        const bestRecordTeams = sortedGroups[0][1];
        let sorted;
        
        if (bestRecordTeams.length === 1) {
          sorted = bestRecordTeams;
        } else if (bestRecordTeams.length === 2) {
          sorted = [...bestRecordTeams].sort((a, b) => breakTie(a, b, h2hMap, gameRecords, true, div));
        } else {
          // For 3+ teams, use multi-team tiebreaker
          sorted = breakMultiTeamTie(bestRecordTeams, h2hMap, gameRecords, true);
          
          // Debug: Log three-way tie calculation
          if (div === "NFC South" && bestRecordTeams.length >= 3) {
            console.log(`\n=== ${div} Three-Way Tie Calculation ===`);
            console.log(`Teams with best record:`, bestRecordTeams.map(t => `${t.abbreviation} (${t.record})`));
            bestRecordTeams.forEach(team => {
              const teamAbbr = team.abbreviation?.toUpperCase();
              const otherAbbrs = bestRecordTeams
                .filter(t => t.abbreviation?.toUpperCase() !== teamAbbr)
                .map(t => t.abbreviation?.toUpperCase());
              const h2hWinPct = getHeadToHeadWinPct(teamAbbr, otherAbbrs, h2hMap);
              console.log(`${teamAbbr} head-to-head win % vs others: ${(h2hWinPct * 100).toFixed(1)}%`);
            });
            console.log(`Winner: ${sorted[0].abbreviation}`);
          }
        }
        
        if (sorted.length > 0) {
          const leaderAbbr = sorted[0].abbreviation?.toUpperCase();
          if (leaderAbbr) {
            leaders.add(leaderAbbr);
            // Debug: Log division leader calculation
            if (div === "NFC South") {
              console.log(`\n=== ${div} Tiebreaker Calculation ===`);
              console.log(`Teams with best record:`, bestRecordTeams.map(t => `${t.abbreviation} (${t.record})`));
              if (bestRecordTeams.length > 1) {
                console.log(`\nBreaking tie between ${bestRecordTeams.length} teams...`);
              }
              console.log(`Division Leader: ${leaderAbbr}`);
            }
          }
        }
      }
    });
    
    return leaders;
  };

  const processConference = (confId) => {
    const conferenceTeams = teams.filter(t => t.conference?.conference_id === confId);
    const divisionLeaders = getDivisionLeaders(confId);
    const h2hMap = buildHeadToHeadMap();
    const gameRecords = buildGameRecords();
    
    // Separate division leaders and wild card teams
    const leaders = conferenceTeams.filter(t => {
      const abbr = t.abbreviation?.toUpperCase();
      return abbr && divisionLeaders.has(abbr);
    });
    const wildCards = conferenceTeams.filter(t => {
      const abbr = t.abbreviation?.toUpperCase();
      return abbr && !divisionLeaders.has(abbr);
    });
    
    // Sort function with tiebreaking
    const sortByRecord = (a, b) => {
      const aRec = parseRecord(a.record);
      const bRec = parseRecord(b.record);
      if (bRec.wins !== aRec.wins) return bRec.wins - aRec.wins;
      if (bRec.winPct !== aRec.winPct) return bRec.winPct - aRec.winPct;
      // If tied, use tiebreaker
      return breakTie(a, b, h2hMap, gameRecords, false);
    };
    
    // Sort division leaders and wild cards separately
    const sortedLeaders = [...leaders].sort(sortByRecord);
    const sortedWildCards = [...wildCards].sort(sortByRecord);
    
    // Combine: division leaders first (seeds 1-4), then wild cards (seeds 5-7)
    return [...sortedLeaders, ...sortedWildCards];
  };

  if (loading) return <div style={{ textAlign: "center", padding: "100px" }}>Loading 2025 Standings...</div>;

  // Calculate division leaders when rendering
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
            <StandingsTable title="AFC Playoff Race" teams={processConference(33)} getStatus={getStatus} allDivLeaders={allDivLeaders} conferenceStandings={processConference(33)} buildHeadToHeadMap={buildHeadToHeadMap} buildGameRecords={buildGameRecords} />
          </div>
          <div style={{ flex: "1", minWidth: "500px" }}>
            <StandingsTable title="NFC Playoff Race" teams={processConference(34)} getStatus={getStatus} allDivLeaders={allDivLeaders} conferenceStandings={processConference(34)} buildHeadToHeadMap={buildHeadToHeadMap} buildGameRecords={buildGameRecords} />
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
              const h2hMap = buildHeadToHeadMap();
              const gameRecords = buildGameRecords();
              const sorted = divTeams.sort((a, b) => {
                const aRec = parseRecord(a.record);
                const bRec = parseRecord(b.record);
                if (bRec.wins !== aRec.wins) return bRec.wins - aRec.wins;
                if (bRec.winPct !== aRec.winPct) return bRec.winPct - aRec.winPct;
                // Use tiebreaker for tied records
                return breakTie(a, b, h2hMap, gameRecords, true);
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
              const h2hMap = buildHeadToHeadMap();
              const gameRecords = buildGameRecords();
              const sorted = divTeams.sort((a, b) => {
                const aRec = parseRecord(a.record);
                const bRec = parseRecord(b.record);
                if (bRec.wins !== aRec.wins) return bRec.wins - aRec.wins;
                if (bRec.winPct !== aRec.winPct) return bRec.winPct - aRec.winPct;
                // Use tiebreaker for tied records
                return breakTie(a, b, h2hMap, gameRecords, true);
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
function StandingsTable({ title, teams, getStatus, isDivisionView = false, allDivLeaders, conferenceStandings, buildHeadToHeadMap, buildGameRecords }) {
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
            const h2hMap = buildHeadToHeadMap ? buildHeadToHeadMap() : new Map();
            const gameRecords = buildGameRecords ? buildGameRecords() : new Map();
            const debugLabel = `${title} - ${team.abbreviation}`;
            const status = getStatus(team.abbreviation, isDivisionView ? null : rank, allDivLeaders, team, conferenceStandings, h2hMap, gameRecords, debugLabel);
            
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