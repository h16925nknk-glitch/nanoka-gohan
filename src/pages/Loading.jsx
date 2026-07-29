import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { usePlan } from '../context/PlanContext'

export default function Loading() {
  const navigate = useNavigate()
  const { generatePlan } = usePlan()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    generatePlan().then(() => {
      navigate('/plan', { replace: true })
    })
  }, [generatePlan, navigate])

  return (
    <AppShell compact>
      <section className="loading-screen">
        <div className="loading-orb">
          <div className="spinner" />
        </div>
        <span className="eyebrow">AI PLANNING YOUR WEEK</span>
        <h1>買い物日まで考えて<br />献立を組み立てています</h1>
        <p>
          予算・スーパー・食材の使い切り・買い物日を<br />
          まとめて調整しています。
        </p>
      </section>
    </AppShell>
  )
}
