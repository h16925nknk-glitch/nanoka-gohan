import { useState } from 'react'
import { Check, ShoppingBasket } from 'lucide-react'

export default function ShoppingList({ items }) {
  const [checked, setChecked] = useState({})

  const toggle = key => {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const grouped = items.reduce((acc, item, index) => {
    const day = item.buyOn || '最初の買い物日'
    if (!acc[day]) acc[day] = []
    acc[day].push({ ...item, originalIndex: index })
    return acc
  }, {})

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">SHOPPING LIST</span>
          <h2>買い物日ごとのリスト</h2>
        </div>
        <small>{Object.values(checked).filter(Boolean).length}/{items.length}</small>
      </div>

      <div className="shopping-groups">
        {Object.entries(grouped).map(([day, dayItems]) => (
          <div className="shopping-day-group" key={day}>
            <h3><ShoppingBasket size={17} />{day}</h3>
            <div className="shopping-list">
              {dayItems.map(item => {
                const key = `${item.name}-${item.originalIndex}`
                return (
                  <button
                    type="button"
                    className={`shopping-row ${checked[key] ? 'done' : ''}`}
                    key={key}
                    onClick={() => toggle(key)}
                  >
                    <span className="check-box">{checked[key] && <Check size={16} />}</span>
                    <span className="shopping-name">{item.name}</span>
                    <span className="shopping-amount">{item.amount}</span>
                    <span className="shopping-price">約¥{item.price}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
