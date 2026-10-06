import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DEMO_TEAMS = [
  // Technology
  { category: 'Technology', team_name: 'NeuralForge', role: 'INNOVATOR' as const },
  { category: 'Technology', team_name: 'QuantumLeap', role: 'INNOVATOR' as const },
  { category: 'Technology', team_name: 'CyberVault', role: 'INVESTOR' as const },
  { category: 'Technology', team_name: 'DataPulse', role: 'INVESTOR' as const },
  { category: 'Technology', team_name: 'CloudNine', role: 'INVESTOR' as const },
  // Healthcare
  { category: 'Healthcare', team_name: 'MediSync', role: 'INNOVATOR' as const },
  { category: 'Healthcare', team_name: 'GeneCraft', role: 'INNOVATOR' as const },
  { category: 'Healthcare', team_name: 'VitaCore', role: 'INVESTOR' as const },
  { category: 'Healthcare', team_name: 'PharmaEdge', role: 'INVESTOR' as const },
  { category: 'Healthcare', team_name: 'BioNex', role: 'INVESTOR' as const },
  // Finance
  { category: 'Finance', team_name: 'FinStack', role: 'INNOVATOR' as const },
  { category: 'Finance', team_name: 'LedgerPrime', role: 'INNOVATOR' as const },
  { category: 'Finance', team_name: 'WealthGrid', role: 'INVESTOR' as const },
  { category: 'Finance', team_name: 'TradeCraft', role: 'INVESTOR' as const },
  { category: 'Finance', team_name: 'CoinForge', role: 'INVESTOR' as const },
  // Social Impact
  { category: 'Social Impact', team_name: 'ImpactHub', role: 'INNOVATOR' as const },
  { category: 'Social Impact', team_name: 'GreenShift', role: 'INNOVATOR' as const },
  { category: 'Social Impact', team_name: 'EcoVenture', role: 'INVESTOR' as const },
  { category: 'Social Impact', team_name: 'SolarMind', role: 'INVESTOR' as const },
  { category: 'Social Impact', team_name: 'AquaPure', role: 'INVESTOR' as const },
]

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Seeding is disabled in production' }, { status: 403 })
  }

  const adminClient = createAdminClient()
  const results: { team: string; email: string; password: string; status: string }[] = []
  const errors: string[] = []

  try {
    // 1. Initialize event state
    await adminClient
      .from('event_state')
      .upsert({ id: 1, current_phase: 'SETUP', current_screen_state: 'SETUP' })

    // 2. Create admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@foundersgambit.com'
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456'

    const { data: adminAuth, error: adminAuthError } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    })

    if (adminAuth?.user) {
      await adminClient.from('users').upsert({
        id: adminAuth.user.id,
        email: adminEmail,
        name: 'Event Admin',
        auth_role: 'ADMIN',
        team_id: null,
      })
      results.push({ team: 'ADMIN', email: adminEmail, password: adminPassword, status: 'created' })
    } else if (adminAuthError) {
      // Admin may already exist
      results.push({ team: 'ADMIN', email: adminEmail, password: adminPassword, status: `exists or error: ${adminAuthError.message}` })
    }

    // 3. Create teams and their auth users
    for (const teamData of DEMO_TEAMS) {
      const slug = slugify(teamData.team_name)
      const email = `${slug}@foundersgambit.com`
      const password = `gambit-${slug}-2024`
      const startingBalance = teamData.role === 'INVESTOR' ? 1000000 : 0

      // Insert team
      const { data: team, error: teamError } = await adminClient
        .from('teams')
        .upsert(
          {
            category: teamData.category,
            team_name: teamData.team_name,
            role: teamData.role,
            starting_balance: startingBalance,
            current_balance: startingBalance,
          },
          { onConflict: 'team_name' }
        )
        .select()
        .single()

      if (teamError) {
        errors.push(`Team ${teamData.team_name}: ${teamError.message}`)
        continue
      }

      // Create auth user
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (authUser?.user) {
        // Create users table entry
        await adminClient.from('users').upsert({
          id: authUser.user.id,
          email,
          name: teamData.team_name,
          auth_role: 'PARTICIPANT',
          team_id: team.id,
        })
        results.push({ team: teamData.team_name, email, password, status: 'created' })
      } else if (authError) {
        results.push({ team: teamData.team_name, email, password, status: `auth: ${authError.message}` })
      }
    }

    // 4. Log the seed action
    const adminUser = adminAuth?.user
    if (adminUser) {
      await adminClient.from('audit_logs').insert({
        admin_user_id: adminUser.id,
        action: 'SEED_DATABASE',
        entity_type: 'system',
        metadata: { teams_count: DEMO_TEAMS.length, timestamp: new Date().toISOString() },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      credentials: results,
      errors,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, credentials: results, errors },
      { status: 500 }
    )
  }
}
