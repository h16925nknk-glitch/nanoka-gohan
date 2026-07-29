import { createContext, useContext, useMemo, useState } from 'react'
import { createWeeklyPlan } from '../services/planner'
import { createAIWeeklyPlan } from '../services/ai'

const PlanContext = createContext(null)

export function PlanProvider({ children }) {
  const [settings, setSettings] = useState({
    budget: 3500,
    disliked: '',
    equipment: 'フライパン・鍋・電子レンジ',
    stapleRice: true,
    supermarket: '指定なし（全国平均）',
    shoppingDays: ['日曜日'],
  })

  const [plan, setPlan] = useState(() => {
    const saved = localStorage.getItem('nanoka-gohan-plan')
    return saved ? JSON.parse(saved) : null
  })

  const [generationState, setGenerationState] = useState({
    loading: false,
    error: '',
    usedFallback: false,
  })

  const generatePlan = async () => {
    setGenerationState({ loading: true, error: '', usedFallback: false })

    try {
      const next = await createAIWeeklyPlan(settings)
      setPlan(next)
      localStorage.setItem('nanoka-gohan-plan', JSON.stringify(next))
      setGenerationState({ loading: false, error: '', usedFallback: false })
      return next
    } catch (error) {
      console.warn('AI APIが使えないため、ローカル献立に切り替えます。', error)

      const fallback = createWeeklyPlan(settings)
      fallback.source = 'local'
      fallback.shoppingTrips = settings.shoppingDays.map(day => ({
        day,
        purpose: '今週の献立に必要な食材を購入',
      }))
      fallback.shopping = fallback.shopping.map((item, index) => ({
        ...item,
        buyOn: settings.shoppingDays[index % settings.shoppingDays.length],
      }))

      setPlan(fallback)
      localStorage.setItem('nanoka-gohan-plan', JSON.stringify(fallback))
      setGenerationState({
        loading: false,
        error: error.message,
        usedFallback: true,
      })
      return fallback
    }
  }

  const resetPlan = () => {
    setPlan(null)
    localStorage.removeItem('nanoka-gohan-plan')
  }

  const value = useMemo(() => ({
    settings,
    setSettings,
    plan,
    setPlan,
    generatePlan,
    resetPlan,
    generationState,
  }), [settings, plan, generationState])

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>
}

export function usePlan() {
  const context = useContext(PlanContext)
  if (!context) throw new Error('usePlan must be used inside PlanProvider')
  return context
}
