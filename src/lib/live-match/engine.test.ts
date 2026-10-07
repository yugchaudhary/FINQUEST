import { describe, expect, it } from 'vitest'
import {
  LiveMatchEngine,
  MATCH_STATUS,
  MAX_GAMBIT_AMOUNT,
  canBroadcastNewMatch,
  deriveInvestorView,
  getMultiplierForResult,
  nextRoundNumber,
  sanitizeGambitAmount,
  settleGambit,
  validateBroadcastInput,
} from './engine'

function createEngine() {
  return new LiveMatchEngine(
    [
      { id: 'red-1', category: 'FinTech', is_active: true, balance: 250000 },
      { id: 'blue-1', category: 'FinTech', is_active: true, balance: 250000 },
      { id: 'red-2', category: 'Health', is_active: true, balance: 250000 },
      { id: 'inactive', category: 'FinTech', is_active: false, balance: 250000 },
      { id: 'investor-a', category: 'Investors', is_active: true, balance: 250000 },
      { id: 'investor-b', category: 'Investors', is_active: true, balance: 250000 },
    ],
    { isAdmin: true }
  )
}

describe('Live Match engine', () => {
  it('creates a valid match and opens gambits on broadcast', () => {
    const engine = createEngine()
    const match = engine.broadcast({
      category: 'FinTech',
      redTeamId: 'red-1',
      blueTeamId: 'blue-1',
    })
    expect(match.status).toBe(MATCH_STATUS.GAMBITS_OPEN)
    expect(match.roundNumber).toBe(1)
    expect(match.redTeamId).not.toBe(match.blueTeamId)
  })

  it('rejects duplicate red/blue teams', () => {
    expect(
      validateBroadcastInput({
        category: 'FinTech',
        redTeamId: 'red-1',
        blueTeamId: 'red-1',
        redTeam: { id: 'red-1', category: 'FinTech', is_active: true },
        blueTeam: { id: 'red-1', category: 'FinTech', is_active: true },
      }).ok
    ).toBe(false)
  })

  it('broadcasts successfully for an admin', () => {
    const engine = createEngine()
    const match = engine.broadcast({
      category: 'FinTech',
      redTeamId: 'red-1',
      blueTeamId: 'blue-1',
      asAdmin: true,
    })
    expect(match.id).toBeTruthy()
  })

  it('rejects unauthorized broadcast', () => {
    const engine = createEngine()
    expect(() =>
      engine.broadcast({
        category: 'FinTech',
        redTeamId: 'red-1',
        blueTeamId: 'blue-1',
        asAdmin: false,
      })
    ).toThrow('Unauthorized')
  })

  it('clamps gambit amounts to 250000', () => {
    expect(sanitizeGambitAmount(300000)).toBe(MAX_GAMBIT_AMOUNT)
    expect(sanitizeGambitAmount('300000')).toBe(MAX_GAMBIT_AMOUNT)
  })

  it('rejects invalid gambit input by sanitizing to a safe number', () => {
    expect(sanitizeGambitAmount('abc')).toBe(0)
    expect(sanitizeGambitAmount(Number.NaN)).toBe(0)
    expect(sanitizeGambitAmount(-50)).toBe(0)
    expect(sanitizeGambitAmount('12abc34')).toBe(1234)
  })

  it('locks a successful gambit and reserves balance', () => {
    const engine = createEngine()
    const match = engine.broadcast({ category: 'FinTech', redTeamId: 'red-1', blueTeamId: 'blue-1' })
    engine.lockGambit({
      matchId: match.id,
      investorTeamId: 'investor-a',
      selectedTeamId: 'red-1',
      amount: 100000,
    })
    expect(engine.teams['investor-a'].balance).toBe(150000)
    expect(match.gambits).toHaveLength(1)
  })

  it('rejects a duplicate gambit for the same investor and match', () => {
    const engine = createEngine()
    const match = engine.broadcast({ category: 'FinTech', redTeamId: 'red-1', blueTeamId: 'blue-1' })
    engine.lockGambit({
      matchId: match.id,
      investorTeamId: 'investor-a',
      selectedTeamId: 'red-1',
      amount: 50000,
    })
    expect(() =>
      engine.lockGambit({
        matchId: match.id,
        investorTeamId: 'investor-a',
        selectedTeamId: 'blue-1',
        amount: 50000,
      })
    ).toThrow(/already placed/)
  })

  it('rejects insufficient balance', () => {
    const engine = createEngine()
    const match = engine.broadcast({ category: 'FinTech', redTeamId: 'red-1', blueTeamId: 'blue-1' })
    expect(() =>
      engine.lockGambit({
        matchId: match.id,
        investorTeamId: 'investor-a',
        selectedTeamId: 'red-1',
        amount: 250001,
      })
    ).toThrow(/Insufficient|Invalid|250000/)
    engine.teams['investor-a'].balance = 10000
    expect(() =>
      engine.lockGambit({
        matchId: match.id,
        investorTeamId: 'investor-a',
        selectedTeamId: 'red-1',
        amount: 50000,
      })
    ).toThrow('Insufficient balance for this Gambit')
  })

  it('only one concurrent lock succeeds when balance is tight', () => {
    const engine = createEngine()
    const match = engine.broadcast({ category: 'FinTech', redTeamId: 'red-1', blueTeamId: 'blue-1' })
    engine.teams['investor-a'].balance = 250000
    const attempts = [
      () =>
        engine.lockGambit({
          matchId: match.id,
          investorTeamId: 'investor-a',
          selectedTeamId: 'red-1',
          amount: 200000,
        }),
      () =>
        engine.lockGambit({
          matchId: match.id,
          investorTeamId: 'investor-a',
          selectedTeamId: 'red-1',
          amount: 200000,
        }),
    ]
    const results = attempts.map((fn) => {
      try {
        fn()
        return 'ok'
      } catch {
        return 'err'
      }
    })
    expect(results.filter((r) => r === 'ok')).toHaveLength(1)
    expect(results.filter((r) => r === 'err')).toHaveLength(1)
    expect(engine.teams['investor-a'].balance).toBe(50000)
  })

  it('closes gambits', () => {
    const engine = createEngine()
    const match = engine.broadcast({ category: 'FinTech', redTeamId: 'red-1', blueTeamId: 'blue-1' })
    engine.closeGambits(match.id)
    expect(match.status).toBe(MATCH_STATUS.GAMBITS_CLOSED)
  })

  it('rejects gambit submission after close', () => {
    const engine = createEngine()
    const match = engine.broadcast({ category: 'FinTech', redTeamId: 'red-1', blueTeamId: 'blue-1' })
    engine.closeGambits(match.id)
    expect(() =>
      engine.lockGambit({
        matchId: match.id,
        investorTeamId: 'investor-a',
        selectedTeamId: 'red-1',
        amount: 10000,
      })
    ).toThrow('Match is not accepting Gambits')
  })

  it('maps multipliers from the judge result', () => {
    expect(getMultiplierForResult(5, 0)).toBe(3)
    expect(getMultiplierForResult(4, 1)).toBe(2.2)
    expect(getMultiplierForResult(3, 2)).toBe(1.6)
    expect(getMultiplierForResult(2, 3)).toBe(0.8)
    expect(getMultiplierForResult(1, 4)).toBe(0.5)
    expect(getMultiplierForResult(0, 5)).toBe(0)
  })

  it('settles a 3-2 result at 1.6x for red and 0.8x for blue', () => {
    const engine = createEngine()
    const match = engine.broadcast({ category: 'FinTech', redTeamId: 'red-1', blueTeamId: 'blue-1' })
    engine.lockGambit({
      matchId: match.id,
      investorTeamId: 'investor-a',
      selectedTeamId: 'red-1',
      amount: 100000,
    })
    engine.lockGambit({
      matchId: match.id,
      investorTeamId: 'investor-b',
      selectedTeamId: 'blue-1',
      amount: 100000,
    })
    engine.closeGambits(match.id)
    engine.submitResult(match.id, 3, 2)
    expect(match.multiplier).toBe(1.6)
    expect(settleGambit(100000, 1.6)).toEqual({ grossReturn: 160000, netChange: 60000 })
    expect(engine.teams['investor-a'].balance).toBe(310000)
    expect(engine.teams['investor-b'].balance).toBe(230000)
  })

  it('protects against duplicate settlement', () => {
    const engine = createEngine()
    const match = engine.broadcast({ category: 'FinTech', redTeamId: 'red-1', blueTeamId: 'blue-1' })
    engine.closeGambits(match.id)
    engine.submitResult(match.id, 3, 2)
    expect(() => engine.submitResult(match.id, 3, 2)).toThrow(/already been settled/)
  })

  it('transitions to MATCH_COMPLETE after settlement', () => {
    const engine = createEngine()
    const match = engine.broadcast({ category: 'FinTech', redTeamId: 'red-1', blueTeamId: 'blue-1' })
    engine.closeGambits(match.id)
    engine.submitResult(match.id, 5, 0)
    expect(match.status).toBe(MATCH_STATUS.MATCH_COMPLETE)
    expect(engine.currentMatchId).toBeNull()
  })

  it('resets the investor view to waiting after match completion', () => {
    const engine = createEngine()
    const match = engine.broadcast({ category: 'FinTech', redTeamId: 'red-1', blueTeamId: 'blue-1' })
    engine.lockGambit({
      matchId: match.id,
      investorTeamId: 'investor-a',
      selectedTeamId: 'red-1',
      amount: 10000,
    })
    expect(engine.investorView('investor-a')).toBe('GAMBIT_LOCKED')
    engine.closeGambits(match.id)
    expect(engine.investorView('investor-a')).toBe('AWAITING_RESULT')
    engine.submitResult(match.id, 3, 2)
    expect(engine.investorView('investor-a')).toBe('WAITING')
  })

  it('recovers waiting state from authoritative server data after refresh', () => {
    expect(
      deriveInvestorView({
        matchStatus: MATCH_STATUS.MATCH_COMPLETE,
        screenState: 'WAITING_FOR_MATCH',
        hasLockedGambit: true,
      })
    ).toBe('WAITING')
    expect(
      deriveInvestorView({
        matchStatus: MATCH_STATUS.GAMBITS_OPEN,
        hasLockedGambit: true,
      })
    ).toBe('GAMBIT_LOCKED')
    expect(
      deriveInvestorView({
        matchStatus: null,
        screenState: 'WAITING_FOR_MATCH',
        hasLockedGambit: false,
      })
    ).toBe('WAITING')
  })

  it('does not invent a new round number on refresh', () => {
    expect(nextRoundNumber([1, 2])).toBe(3)
    expect(() => nextRoundNumber([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toThrow(/10/)
    expect(canBroadcastNewMatch(MATCH_STATUS.GAMBITS_OPEN)).toBe(false)
    expect(canBroadcastNewMatch(MATCH_STATUS.MATCH_COMPLETE)).toBe(true)
  })
})
