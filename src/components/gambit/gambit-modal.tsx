'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { X, Lock } from 'lucide-react'
import { formatIndianNumber, clampGambitAmount } from '@/lib/format'
import { MAX_GAMBIT_AMOUNT, QUICK_AMOUNTS, QUICK_AMOUNT_LABELS } from '@/lib/constants'

interface GambitModalProps {
  isOpen: boolean
  onClose: () => void
  selectedTeam: { id: string; team_name: string } | null
  selectedColor: 'red' | 'blue' | null
  matchId?: string
  onGambitLocked: (amount: number) => Promise<void>
}

export function GambitModal({ isOpen, onClose, selectedTeam, selectedColor, matchId, onGambitLocked }: GambitModalProps) {
  const [amount, setAmount] = useState(0)
  const [inputValue, setInputValue] = useState('0')
  const [isLocking, setIsLocking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setAmount(0)
      setInputValue('0')
      setError(null)
      setIsLocking(false)
    }
  }, [isOpen])

  const updateAmount = useCallback((value: number) => {
    const clamped = clampGambitAmount(value)
    setAmount(clamped)
    setInputValue(clamped.toString())
  }, [])

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10) || 0
    updateAmount(val)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    if (raw === '') {
      setInputValue('')
      setAmount(0)
      return
    }
    const numVal = parseInt(raw, 10)
    const clamped = clampGambitAmount(numVal)
    setAmount(clamped)
    setInputValue(clamped.toString())
  }

  const handleInputBlur = () => {
    setInputValue(amount.toString())
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '')
    if (pasted) {
      const numVal = parseInt(pasted, 10)
      updateAmount(numVal)
    }
  }

  const handleLock = async () => {
    if (amount <= 0) {
      setError('Please enter an amount greater than 0')
      return
    }
    setError(null)
    setIsLocking(true)
    try {
      await onGambitLocked(amount)
    } catch (err: any) {
      setError(err?.message || 'Failed to lock gambit. Please try again.')
      setIsLocking(false)
    }
  }

  const colorClass = selectedColor === 'red' 
    ? 'text-red-400 border-red-500/30' 
    : 'text-blue-400 border-blue-500/30'

  const glowColor = selectedColor === 'red' 
    ? 'rgba(239, 68, 68, 0.15)' 
    : 'rgba(59, 130, 246, 0.15)'

  // Calculate slider fill percentage
  const fillPercent = (amount / MAX_GAMBIT_AMOUNT) * 100

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-lg glass-card-elevated p-6 md:p-8 z-10"
            style={{ boxShadow: `0 0 80px ${glowColor}` }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {/* Title */}
            <div className="text-center mb-6">
              <h2 className="font-display text-xl md:text-2xl text-white tracking-wide">
                PLACE YOUR GAMBIT
              </h2>
              <div className={`mt-2 text-sm ${colorClass}`}>
                Betting on <span className="font-semibold">{selectedTeam?.team_name}</span>
              </div>
            </div>

            {/* Amount Display */}
            <div className="text-center mb-6">
              <div className="text-3xl md:text-4xl font-display font-bold text-white">
                ₹{formatIndianNumber(amount)}
              </div>
            </div>

            {/* Slider */}
            <div className="mb-4 px-2">
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={MAX_GAMBIT_AMOUNT}
                  step={5000}
                  value={amount}
                  onChange={handleSliderChange}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${selectedColor === 'red' ? '#ef4444' : '#3b82f6'} 0%, ${selectedColor === 'red' ? '#ef4444' : '#3b82f6'} ${fillPercent}%, #1e1e2d ${fillPercent}%, #1e1e2d 100%)`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-gray-600">
                <span>₹0</span>
                <span>₹2,50,000</span>
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-6 gap-2 mb-6">
              {QUICK_AMOUNTS.map((qa, i) => (
                <button
                  key={qa}
                  onClick={() => updateAmount(qa)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all border ${
                    amount === qa
                      ? selectedColor === 'red'
                        ? 'bg-red-500/20 border-red-500/50 text-red-300'
                        : 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                      : 'bg-gambit-surface-2 border-gambit-border text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {QUICK_AMOUNT_LABELS[i]}
                </button>
              ))}
            </div>

            {/* Numeric Input */}
            <div className="mb-6">
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                Enter Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  onPaste={handlePaste}
                  className="w-full pl-8 pr-4 py-3 bg-gambit-surface-2 border border-gambit-border rounded-lg text-white font-mono text-lg focus:outline-none focus:border-gambit-purple transition-colors"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Lock Button */}
            <Button
              onClick={handleLock}
              disabled={amount <= 0 || isLocking}
              isLoading={isLocking}
              size="xl"
              className={`w-full font-display tracking-wider ${
                selectedColor === 'red'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Lock size={18} className="mr-2" />
              LOCK GAMBIT
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
