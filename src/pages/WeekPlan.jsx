import { Navigate, useNavigate } from 'react-router-dom'
import { RotateCcw, ArrowLeft } from 'lucide-react'
import AppShell from '../components/AppShell'
import StatCard from '../components/StatCard'
import ShoppingList from '../components/ShoppingList'
import DayCard from '../components/DayCard'
import { usePlan } from '../context/PlanContext'

export default function WeekPlan() {
  const navigate = useNavigate()
  const { plan, resetPlan, generationState, settings } = usePlan()

  if (!plan) return <Navigate to="/" replace />

  const regenerate = () => {
    resetPlan()
    navigate('/')
  }

  return (
    <AppShell>
      <div className="top-actions">
        <button className="ghost-button" onClick={() => navigate('/')}>
          <ArrowLeft size={17} /> 条件を変更
        </button>
        <button className="ghost-button" onClick={regenerate}>
          <RotateCcw size={17} /> 作り直す
        </button>
      </div>

      {generationState.usedFallback && (
        <section className="fallback-banner">
          <strong>現在はお試し献立を表示しています</strong>
          <span>AI接続後は、予算・スーパー・買い物日に応じて毎回内容が変わります。</span>
        </section>
      )}

      <section className="plan-title">
        <span className="eyebrow">{plan.source === 'ai' ? 'AI GENERATED WEEK' : 'YOUR WEEK'}</span>
        <h1>今週の献立ができました</h1>
        <p>
          {settings.supermarket}を基準に、
          {settings.shoppingDays.join('・')}の買い物で食材をつなげて使います。
        </p>
      </section>

      <section className="stats-grid">
        <StatCard label="1週間の食費" value={`¥${plan.totalCost.toLocaleString()}`} note={`予算 ¥${plan.budget.toLocaleString()}`} />
        <StatCard label="外食との差額" value={`¥${plan.savings.toLocaleString()}節約`} note={`外食想定 ¥${plan.outsideTotal.toLocaleString()}`} />
        <StatCard label="食材使い切り" value={`${100 - plan.wasteRate}%`} note="推定廃棄率 4%" />
      </section>

      <ShoppingList items={plan.shopping} />

      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">DINNER PLAN</span>
            <h2>7日間の夜ご飯</h2>
          </div>
        </div>
        <div className="day-list">
          {plan.days.map((item, index) => (
            <DayCard key={`${item.id}-${index}`} item={item} index={index} />
          ))}
        </div>
      </section>
    </AppShell>
  )
}
