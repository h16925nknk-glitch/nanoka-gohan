import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const responseFormat = {
  type: 'json_schema',
  name: 'weekly_meal_plan',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['summary', 'shoppingTrips', 'shopping', 'days'],
    properties: {
      summary: {
        type: 'object',
        additionalProperties: false,
        required: ['totalCost', 'outsideTotal', 'wasteRate', 'note'],
        properties: {
          totalCost: { type: 'integer' },
          outsideTotal: { type: 'integer' },
          wasteRate: { type: 'integer' },
          note: { type: 'string' },
        },
      },
      shoppingTrips: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['day', 'purpose'],
          properties: {
            day: { type: 'string' },
            purpose: { type: 'string' },
          },
        },
      },
      shopping: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'amount', 'price', 'buyOn'],
          properties: {
            name: { type: 'string' },
            amount: { type: 'string' },
            price: { type: 'integer' },
            buyOn: { type: 'string' },
          },
        },
      },
      days: {
        type: 'array',
        minItems: 7,
        maxItems: 7,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'day', 'dateLabel', 'name', 'emoji', 'kcal', 'homeCost',
            'outsideCost', 'time', 'message', 'ingredients', 'steps'
          ],
          properties: {
            day: { type: 'string' },
            dateLabel: { type: 'string' },
            name: { type: 'string' },
            emoji: { type: 'string' },
            kcal: { type: 'integer' },
            homeCost: { type: 'integer' },
            outsideCost: { type: 'integer' },
            time: { type: 'integer' },
            message: { type: 'string' },
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['name', 'amount'],
                properties: {
                  name: { type: 'string' },
                  amount: { type: 'string' },
                },
              },
            },
            steps: {
              type: 'array',
              minItems: 3,
              maxItems: 5,
              items: { type: 'string' },
            },
          },
        },
      },
    },
  },
}

function buildPrompt(input) {
  const revisionInstruction = input.revisionMode
  ? `
今回は、すでに作成した献立の再考です。

利用者の変更希望:
${input.revisionRequest || "全体をより良く見直してください。"}

現在の献立:
${JSON.stringify(input.previousPlan, null, 2)}
現在の日付: ${input.currentDate}
現在の月: ${input.currentMonth}月
現在の季節: ${input.season}

再考時のルール:
- 利用者の変更希望を最優先すること。
- 変更する必要がない料理は、できるだけ維持すること。
- 週間予算を超えないこと。
- 食材の使い切りと消費期限の順番を崩さないこと。
- 買い物リストの変更を必要最低限にすること。
- 変更後は必ず、通常と同じJSON形式で7日分すべてを返すこと。
`
  : "";
  return `
  ${revisionInstruction}
あなたは、日本で一人暮らしをする人のための献立設計AIです。
以下の条件で、夕食7日分の献立と買い物計画を作ってください。

【条件】
- 1週間の夕食予算: ${input.budget}円
- 買い物リスト最低金額: ${Math.round(Number(input.budget) * 0.8)}円
- 買い物リスト目標金額: ${Math.round(Number(input.budget) * 0.9)}円
- 買い物リスト上限金額: ${Number(input.budget)}円
- 苦手な食材: ${input.disliked || 'なし'}
- 使える調理器具: ${input.equipment}
- 米・基本調味料が家にある: ${input.stapleRice ? 'はい' : 'いいえ'}
- よく行くスーパー: ${input.supermarket}
- 買い物に行ける曜日: ${input.shoppingDays.join('、')}
献立モード: ${input.mealMode || "balance"}
常備調味料: ${(input.seasonings || []).join("、")}

【重要な設計ルール】
1. 合計金額は必ず予算以下にする。
2. 予算が低いほど豆腐、卵、鶏むね肉、旬の野菜などを中心にする。
3. 予算に余裕がある場合は魚、牛肉、海老なども適度に入れる。
4. 同じ食材を複数日に計画的に使い、食材廃棄を極力減らす。
5. 買い物日は週に1回だけ。途中の買い足しを前提にしない。
6. スーパー固有の正確な価格は断定せず、一般的な価格傾向として見積もる。
7. 各レシピは一人分、手順は5工程以内。
8. 各日のmessageは、節約中の一人暮らしの人が侘しい気持ちにならない、静かで温かい一文にする。
9. カロリーと金額は現実的な概算にする。
10. shoppingのbuyOnは、必ず指定された買い物曜日のいずれかにする。
11. 7日すべて別の料理名にする。
12. 買い物は週1回だけにし、7日分の材料を最初にまとめて購入する。
13. shopping配列には、1週間で必要な材料を重複なしで集約して入れる。
14. 同じ食材を複数日に分けて使い、最終日までに原則使い切る。
15. days[].ingredients の合計量と shopping[].amount が矛盾しないようにする。
16. 傷みやすい食材は週の前半、日持ちする食材は後半に使う。
17. 使い切れない食材がある場合は summary.note に理由と保存方法を書く。
18. 各日の message は、孤独や節約感を強調せず、少しユーモアのある温かい一言にする。
19. message は40〜70文字程度で、毎日違う表現にする。
20. 「今日も頑張りましょう」のような定型文は避ける。
21. mealModeがbalanceの場合は、予算・栄養・味・満腹感をバランスよく両立すること。
22. mealModeがdietの場合は、高たんぱく・野菜多め・低脂質・低カロリーを重視すること。ただし極端に量を減らさないこと。
23. mealModeがvolumeの場合は、安価で満腹感の高い食材を使い、食べ応えを重視すること。
24. mealModeがtasteの場合は、味・香り・食感・料理としての満足感を重視すること。
25. 常備調味料に含まれるものは、買い物リストに追加しないこと。
26. 常備調味料に含まれない調味料が必要な場合だけ、買い物リストに追加すること。
27. もやし、生魚、生肉、豆腐など傷みやすい食材は週の前半に使用すること。
28. 玉ねぎ、人参、じゃがいも、卵、冷凍可能な食材などは週の後半にも使用できる。
29. 初日に購入した食材が、使用日まで一般的な保存期間を超えないように献立を組むこと。
30. 生肉や魚を後半に使用する場合は、購入日に冷凍することをshoppingListまたはsummary.noteに明記すること。
31. 現在の季節と日本の一般的な旬を考慮し、その時期に手に入りやすく価格が安定しやすい野菜・魚を優先すること。
32. 季節外の食材を完全に禁止する必要はないが、明確な理由がなければ旬の食材を優先すること。
33. 夏はトマト、なす、ピーマン、きゅうりなど、冬は白菜、大根、長ねぎ、かぶなどを候補として優先すること。
34. 献立の食材構成が特定の季節に偏って不自然にならないようにすること。
35. shopping配列内のpriceを実際に合計した金額を、必ず買い物リスト最低金額以上、買い物リスト上限金額以下にすること。summary.totalCostだけを増やして条件を満たしたことにしてはいけない。
36. shopping配列内のpriceの実際の合計を、買い物リスト目標金額の前後に近づけること。
37. 予算が高い場合は、食材を不必要に大量購入するのではなく、肉・魚・野菜の品質、料理の品数、栄養バランスを上げること。
38. shopping[].priceは単価ではなく、shopping[].amountに記載した数量を購入するときの小計金額を整数で入れること。
39. summary.totalCostは、shopping配列内のすべてのpriceを足した金額と必ず一致させること。
40. 設定予算が20,000円以上の場合は、牛肉、魚介類、海老、質のよい肉や魚、果物、乳製品などを無理のない範囲で取り入れること。
41. 予算を消化する目的だけで、使い切れない大量の食材や不要な調味料を追加しないこと。
42. 献立の再考時も、買い物リストの合計金額を設定予算の80%以上100%以下に保つこと。
`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {  
    return res.status(405).json({ error: 'POSTのみ利用できます。' })
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEYが設定されていません。' })
  }

  try {
    const input = req.body

    if (!input?.budget || !Array.isArray(input?.shoppingDays) || input.shoppingDays.length === 0) {
      return res.status(400).json({ error: '予算と買い物日を入力してください。' })
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini'

const firstResponse = await client.responses.create({
  model,
  input: buildPrompt(input),
  text: {
    format: responseFormat,
  },
})

let plan = JSON.parse(firstResponse.output_text)

const budget = Number(input.budget)
const minimumTotal = Math.round(budget * 0.8)
const targetTotal = Math.round(budget * 0.9)

const getShoppingTotal = (shopping = []) => {
  return shopping.reduce((total, item) => {
    const price = Number(item.price)

    return total + (Number.isFinite(price) ? price : 0)
  }, 0)
}

let shoppingTotal = getShoppingTotal(plan.shopping)


    plan.budget = Number(input.budget)

const calculatedShoppingTotal = plan.shopping.reduce((total, item) => {
  const price = Number(item.price)

  return total + (Number.isFinite(price) ? price : 0)
}, 0)

plan.totalCost = calculatedShoppingTotal
plan.summary.totalCost = calculatedShoppingTotal
plan.outsideTotal = plan.summary.outsideTotal
plan.remaining = plan.budget - plan.totalCost
    plan.savings = plan.outsideTotal - plan.totalCost
    plan.wasteRate = plan.summary.wasteRate
    plan.shopping = plan.shopping.map(item => ({ ...item, checked: false }))
    plan.days = plan.days.map(item => ({
      ...item,
      mood: item.message,
      savings: item.outsideCost - item.homeCost,
      ingredients: item.ingredients.map((ingredient) => ({
      name: ingredient.name,
      amount: ingredient.amount,
      })),

    }))
    plan.createdAt = new Date().toISOString()
    plan.source = 'ai'

    return res.status(200).json(plan)
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      error: 'AI献立の作成に失敗しました。',
      detail: error?.message || 'unknown error',
    })
  }
}
