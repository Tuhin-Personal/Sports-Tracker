import { getPlayerStats } from '@/lib/googleSheets';

// HELPER: Convert inches (e.g., 75) to Feet & Inches (e.g., 6'3")
function formatHeight(inches) {
  if (!inches) return "N/A";
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  return `${feet}'${remainingInches}"`;
}

// HELPER: Convert Date string to MM/DD/YYYY
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr; 
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

export default async function PlayerProfile({ params, searchParams }) {
  const { name } = await searchParams;
  const player = await getPlayerStats(name);

  if (!player) return <div className="p-20 text-center text-slate-400">Player not found.</div>;

  const pos = player.position_x?.toUpperCase();
  const teamCode = player.team; // e.g., "KC", "SF"
  const formattedBirthDate = formatDate(player.birth_date);
  const formattedHeight = formatHeight(player.height);

  return (
    <div className="min-h-screen bg-[#05070a] text-white p-4 md:p-10 font-sans antialiased">
      {/* Dynamic Navigation */}
      <nav className="max-w-6xl mx-auto mb-8 flex gap-4">
        <a 
          href={`/teams/${teamCode}`} 
          className="text-blue-500 hover:text-blue-300 transition-colors font-bold text-xs tracking-widest uppercase border-l border-slate-800 pl-4"
        >← {teamCode} Team Page 
        </a>
      </nav>

      <main className="max-w-6xl mx-auto space-y-6">
        {/* HEADER CARD */}
        <div className="bg-linear-to-b from-slate-900 to-black border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-10">
            <div className="relative group">
              <div className="absolute -inset-1 bg-linear-to-r from-blue-600 to-cyan-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <img 
                src={player.headshot_url} 
                className="relative w-48 h-48 md:w-64 md:h-64 object-cover rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl"
                alt={name}
              />
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <span className="bg-blue-600 text-[10px] font-black px-2 py-1 rounded italic uppercase">Season Totals</span>
                <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                  {player.team} • {player.position_x}
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black italic uppercase leading-none tracking-tighter mb-4">
                {player.player_display_name}
              </h1>
              <p className="text-slate-400 text-sm font-medium">
                Born: {formattedBirthDate} • {formattedHeight} • {player.weight} lbs
              </p>
            </div>
          </div>

          {/* MAIN STATS BAR (Dynamic per Position) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-slate-800 bg-slate-950/50">
            {pos === 'QB' ? (
              <>
                <StatItem label="Pass Yds" value={Math.round(player.passing_yards || 0)} />
                <StatItem label="Pass TDs" value={player.passing_tds} />
                <StatItem label="Rush Yds" value={Math.round(player.rushing_yards || 0)} />
                <StatItem label="INTs" value={player.passing_interceptions} />
              </>
            ) : pos === 'RB' ? (
              <>
                <StatItem label="Rush Yds" value={Math.round(player.rushing_yards || 0)} />
                <StatItem label="Rec Yds" value={Math.round(player.receiving_yards || 0)} />
                <StatItem label="Total TDs" value={(Number(player.rushing_tds) || 0) + (Number(player.receiving_tds) || 0)} />
                <StatItem label="Total Fumbles" value={(Number(player.rushing_fumbles) || 0) + (Number(player.receiving_fumbles) || 0)} />
              </>
            ) : (pos === 'WR' || pos === 'TE') ? (
              <>
                <StatItem label="Targets" value={player.targets} />
                <StatItem label="Receptions" value={player.receptions} />
                <StatItem label="Rec Yds" value={player.receiving_yards} />
                <StatItem label="Rec TDs" value={player.receiving_tds} />
              </>
            ) : (
              <>
                <StatItem label="Solo Tackles" value={player.def_tackles_solo} />
                <StatItem label="Sacks" value={player.def_sacks} />
                <StatItem label="INTs" value={player.def_interceptions} />
                <StatItem label="Def TDs" value={player.def_tds} />
              </>
            )}
          </div>
        </div>

        {/* SECONDARY STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* QB SPECIFIC GRID */}
          {pos === 'QB' && (
            <StatSection title="Passing & Rushing Detail" color="text-blue-500">
              <DetailItem label="Completions" value={player.completions} />
              <DetailItem label="Attempts" value={player.attempts} />
              <DetailItem label="Sack Fumbles" value={player.sack_fumbles} />
              <DetailItem label="Pass EPA" value={Number(player.passing_epa).toFixed(2)} />
              <DetailItem label="Carries" value={player.carries} />
              <DetailItem label="Rush TDs" value={player.rushing_tds} />
              <DetailItem label="Rush Fumbles" value={player.rushing_fumbles} />
            </StatSection>
          )}

          {/* RB SPLIT GRID */}
          {pos === 'RB' && (
            <>
              <StatSection title="Rushing Detail" color="text-emerald-500">
                <DetailItem label="Carries" value={player.carries} />
                <DetailItem label="Rush Yards" value={player.rushing_yards} />
                <DetailItem label="Rush Fumbles" value={player.rushing_fumbles} />
                <DetailItem label="Rush TDs" value={player.rushing_tds} />
                <DetailItem label="Rush EPA" value={Number(player.rushing_epa).toFixed(2)} />
              </StatSection>
              <StatSection title="Receiving Detail" color="text-blue-400">
                <DetailItem label="Targets" value={player.targets} />
                <DetailItem label="Receptions" value={player.receptions} />
                <DetailItem label="Rec Yards" value={player.receiving_yards} />
                <DetailItem label="Rec Fumbles" value={player.receiving_fumbles} />
                <DetailItem label="Rec TDs" value={player.receiving_tds} />
                <DetailItem label="Rec EPA" value={Number(player.receiving_epa).toFixed(2)} />
              </StatSection>
            </>
          )}

          {/* DEFENSE SECTIONS (LB, CB, DL) */}
          {['DL', 'DE', 'DT'].includes(pos) && (
            <StatSection title="D-Line Metrics" color="text-red-500">
              <DetailItem label="Solo Tackles" value={player.def_tackles_solo} />
              <DetailItem label="TFL" value={player.def_tackles_for_loss} />
              <DetailItem label="Sacks" value={player.def_sacks} />
              <DetailItem label="Safeties" value={player.def_safeties} />
            </StatSection>
          )}

          {/* O-LINE BIO */}
          {['T', 'G', 'C', 'OT', 'OG'].includes(pos) && (
            <StatSection title="Physical Bio" color="text-slate-400">
               <DetailItem label="Height" value={formattedHeight} />
               <DetailItem label="Weight" value={player.weight + " lbs"} />
               <DetailItem label="Birth Date" value={formattedBirthDate} />
            </StatSection>
          )}
        </div>
      </main>
    </div>
  );
}

// UI COMPONENTS (Required to render the blocks above)
function StatSection({ title, children, color }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-4xl">
      <h3 className={`${color} font-black text-xs tracking-[0.2em] uppercase mb-6`}>{title}</h3>
      <div className="grid grid-cols-2 gap-y-8 gap-x-4">
        {children}
      </div>
    </div>
  );
}

function StatItem({ label, value }) {
  return (
    <div className="p-8 border-r border-slate-800 last:border-r-0 hover:bg-white/5 transition-colors group">
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{label}</p>
      <p className="text-4xl font-black italic tracking-tighter text-white">
        {value || 0}
      </p>
    </div>
  );
}

function DetailItem({ label, value, color = "text-slate-200" }) {
  return (
    <div>
      <p className="text-slate-500 text-[9px] font-bold uppercase mb-1">{label}</p>
      <p className={`text-2xl font-black italic ${color}`}>{value || 0}</p>
    </div>
  );
}