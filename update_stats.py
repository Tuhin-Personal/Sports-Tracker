import pandas as pd

# Load your full database
df = pd.read_csv('my_nfl_database.csv')

# 1. Define the columns you want to ADD UP (Sum)
stats_to_sum = [
    'completions', 'attempts', 'passing_yards', 'passing_tds', 'passing_interceptions', 
    'sacks_suffered', 'sack_yards_lost', 'sack_fumbles', 'sack_fumbles_lost', 
    'passing_epa', 'passing_cpoe', 'passing_2pt_conversions', 'carries', 
    'rushing_yards', 'rushing_tds', 'rushing_fumbles', 'rushing_epa', 
    'receptions', 'targets', 'receiving_yards', 'receiving_tds', 'receiving_fumbles', 
    'receiving_epa', 'special_teams_tds', 'def_tackles_solo', 'def_tackles_for_loss', 
    'def_fumbles_forced', 'def_sacks', 'def_interceptions', 'def_tds', 'def_fumbles', 
    'def_safeties', 'punt_returns', 'punt_return_yards', 'kickoff_returns', 
    'kickoff_return_yards', 'fg_made', 'fg_att', 'fg_blocked'
]

# 2. Define the columns you want to KEEP AS TEXT (First)
info_to_keep = [
    'player_display_name', 'position_x', 'position_group', 'headshot_url', 
    'team', 'height', 'weight', 'birth_date', 'fg_pct'
]

# 3. Filter the list to only include columns that actually exist in your CSV
existing_sum_cols = [col for col in stats_to_sum if col in df.columns]
existing_info_cols = [col for col in info_to_keep if col in df.columns]

# 4. Group by player_id and condense
seasonal_df = df.groupby('player_id').agg({
    **{col: 'sum' for col in existing_sum_cols},
    **{col: 'first' for col in existing_info_cols}
}).reset_index()

# 5. Save the new condensed file
seasonal_df.to_csv('condensed_nfl_database.csv', index=False)

print(f"Successfully condensed data. File size reduced. Total players: {len(seasonal_df)}")