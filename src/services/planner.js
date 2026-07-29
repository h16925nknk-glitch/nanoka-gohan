import { recipePool } from '../data/recipes'

const shoppingBase = [
  ['鶏もも肉', '500g', 620],
  ['豚こま肉', '400g', 560],
  ['豚ひき肉', '150g', 230],
  ['卵', '6個', 260],
  ['木綿豆腐', '1丁', 120],
  ['玉ねぎ', '3個', 220],
  ['にんじん', '2本', 160],
  ['大根', '1/2本', 180],
  ['キャベツ', '1/2玉', 180],
  ['じゃがいも', '2個', 160],
  ['長ねぎ', '1本', 150],
  ['冷凍うどん', '1玉', 70],
  ['カレールウ', '1箱', 220]
]

export function createWeeklyPlan(settings) {
  const disliked = settings.disliked
    .split(/[、,\s]+/)
    .map(x => x.trim())
    .filter(Boolean)

  const available = recipePool.filter(recipe =>
    !recipe.ingredients.some(([name]) =>
      disliked.some(word => name.includes(word))
    )
  )

  const fallback = recipePool
  const recipes = Array.from({ length: 7 }, (_, index) =>
    (available.length ? available : fallback)[index % (available.length || fallback.length)]
  )

  const budget = Number(settings.budget) || 3500
  const ratio = budget / recipes.reduce((sum, item) => sum + item.homeCost, 0)

  const days = ['月', '火', '水', '木', '金', '土', '日']
  const adjusted = recipes.map((recipe, index) => ({
    ...recipe,
    day: days[index],
    dateLabel: `${days[index]}曜日`,
    homeCost: Math.max(180, Math.round(recipe.homeCost * Math.min(1.15, ratio))),
    savings: recipe.outsideCost - Math.max(180, Math.round(recipe.homeCost * Math.min(1.15, ratio)))
  }))

  const totalCost = adjusted.reduce((sum, item) => sum + item.homeCost, 0)
  const outsideTotal = adjusted.reduce((sum, item) => sum + item.outsideCost, 0)

  const shopping = shoppingBase.map(([name, amount, price]) => ({
    name, amount, price, checked: false
  }))

  return {
    createdAt: new Date().toISOString(),
    budget,
    totalCost,
    remaining: budget - totalCost,
    outsideTotal,
    savings: outsideTotal - totalCost,
    wasteRate: 4,
    shopping,
    days: adjusted
  }
}
