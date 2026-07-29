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
  return `
あなたは、日本で一人暮らしをする人のための献立設計AIです。
以下の条件で、夕食7日分の献立と買い物計画を作ってください。

【条件】
- 1週間の夕食予算: ${input.budget}円
- 苦手な食材: ${input.disliked || 'なし'}
- 使える調理器具: ${input.equipment}
- 米・基本調味料が家にある: ${input.stapleRice ? 'はい' : 'いいえ'}
- よく行くスーパー: ${input.supermarket}
- 買い物に行ける曜日: ${input.shoppingDays.join('、')}

【重要な設計ルール】
1. 合計金額は必ず予算以下にする。
2. 予算が低いほど豆腐、卵、鶏むね肉、旬の野菜などを中心にする。
3. 予算に余裕がある場合は魚、牛肉、海老なども適度に入れる。
4. 同じ食材を複数日に計画的に使い、食材廃棄を極力減らす。
5. 買い物日が複数ある場合、生鮮品は後半の買い物日に分けてもよい。
6. スーパー固有の正確な価格は断定せず、一般的な価格傾向として見積もる。
7. 各レシピは一人分、手順は5工程以内。
8. 各日のmessageは、節約中の一人暮らしの人が侘しい気持ちにならない、静かで温かい一文にする。
9. カロリーと金額は現実的な概算にする。
10. shoppingのbuyOnは、必ず指定された買い物曜日のいずれかにする。
11. 7日すべて別の料理名にする。
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

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: buildPrompt(input),
      text: {
        format: responseFormat,
      },
    })

    const plan = JSON.parse(response.output_text)

    plan.budget = Number(input.budget)
    plan.totalCost = plan.summary.totalCost
    plan.outsideTotal = plan.summary.outsideTotal
    plan.remaining = plan.budget - plan.totalCost
    plan.savings = plan.outsideTotal - plan.totalCost
    plan.wasteRate = plan.summary.wasteRate
    plan.shopping = plan.shopping.map(item => ({ ...item, checked: false }))
    plan.days = plan.days.map(item => ({
      ...item,
      mood: item.message,
      savings: item.outsideCost - item.homeCost,
      ingredients: item.ingredients.map(x => [x.name, x.amount, '']),
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
