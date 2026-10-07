import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  console.log('--- STARTING TRIAL MATCH ---');

  // 1. Create teams
  const { data: redTeam } = await supabase.from('teams').insert({
    team_name: 'Test Red Team ' + Date.now(), category: 'AI', role: 'INNOVATOR'
  }).select().single();
  const { data: blueTeam } = await supabase.from('teams').insert({
    team_name: 'Test Blue Team ' + Date.now(), category: 'AI', role: 'INNOVATOR'
  }).select().single();
  const { data: investorTeam } = await supabase.from('teams').insert({
    team_name: 'Test Investor ' + Date.now(), category: 'AI', role: 'INVESTOR', current_balance: 1000000
  }).select().single();
  
  console.log(`Teams created. Red: ${redTeam.id}, Blue: ${blueTeam.id}, Investor: ${investorTeam.id}`);

  // 2. Clear any LIVE matches just in case
  await supabase.from('matches').update({ status: 'COMPLETED' }).eq('status', 'LIVE');

  // 3. Start Match (Broadcast)
  const roundNumber = 1;
  const { data: match, error: matchError } = await supabase.from('matches').insert({
    round_number: roundNumber,
    category: 'AI',
    red_team_id: redTeam.id,
    blue_team_id: blueTeam.id,
    status: 'LIVE'
  }).select().single();

  if (matchError) { console.error('Match start failed', matchError); return; }
  console.log('Match started:', match.id);

  await supabase.from('event_state').update({
    current_match_id: match.id,
    current_screen_state: 'MATCH_LIVE'
  }).eq('id', 1);

  // 4. Investor bets on Red
  const { error: gambitError } = await supabase.from('gambits').insert({
    match_id: match.id,
    investor_team_id: investorTeam.id,
    selected_team_id: redTeam.id,
    amount: 100000,
    status: 'LOCKED'
  });
  if (gambitError) { console.error('Gambit lock failed', gambitError); return; }
  console.log('Investor placed 100000 gambit on Red');

  // 5. Enter Match Result via RPC (which is what fails if there's a bug)
  console.log('Attempting to settle match...');
  const { data: rpcData, error: rpcError } = await supabase.rpc('settle_match_gambits', {
    p_match_id: match.id,
    p_red_votes: 4,
    p_blue_votes: 1
  });

  if (rpcError) {
    console.error('❌ RPC FAILED:', rpcError);
  } else {
    console.log('✅ RPC SUCCESS:', rpcData);
  }
}
run();
