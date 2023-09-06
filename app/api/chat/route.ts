import { kv } from '@vercel/kv'
import { nanoid } from '@/lib/utils'
import axios from 'axios'

import { auth } from '@/auth'

const API_KEY = process.env.OPENAI_API_KEY
const ENDPOINT = 'https://gpt.darkcoder15.tk/v1'

export async function POST(req: Request) {
  const json = await req.json()
  const { messages, previewToken } = json
  const userId = (await auth())?.user.id

  if (!userId) {
    return new Response('Unauthorized', {
      status: 401
    })
  }

  const key = previewToken || API_KEY

  const headers = {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  }

  const res = await axios.post(`${ENDPOINT}/chat`, {
    model: 'gpt-3.5-turbo',
    messages,
    temperature: 0.7,
    stream: true
  }, { headers })

  const completion = res.data.choices[0].text

  const title = json.messages[0].content.substring(0, 100)
  const id = json.id ?? nanoid()
  const createdAt = Date.now()
  const path = `/chat/${id}`
  const payload = {
    id,
    title,
    userId,
    createdAt,
    path,
    messages: [
      ...messages,
      {
        content: completion,
        role: 'assistant'
      }
    ]
  }
    
  await kv.hmset(`chat:${id}`, payload)
  await kv.zadd(`user:chat:${userId}`, {
    score: createdAt,
    member: `chat:${id}`
  })

  return new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  })
}

