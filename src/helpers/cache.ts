import { supabase } from './supabase'
import loggy from './loggy'

export const getCache = async (
  context: string,
  time: number,
  model: string,
  conversationId?: string,
  user?: string,
  question?: any,
) => {
  if (context === 'status') {
    const { data } = await supabase
      .from('caches')
      .select('*')
      .eq('context', context)
      .eq('model', model)
      // .gte('time', time - FIVE_MINUTES)
      .order('time', { ascending: false })
    return data
  } else {
    let query = supabase
      .from('caches')
      .select('*')
      .eq('context', context)
      .eq('question', question)
      .eq('model', model)
      .order('time', { ascending: false })

    if (conversationId) {
      query = query.eq('id', conversationId)
    }

    if (user) {
      query = query.eq('user', user)
    }

    const { data } = await query

    return data
  }
}

export const saveToCache = async (
  context: SourceType,
  time: number,
  question: string,
  answer: any,
  model: string,
  user: string,
) => {
  if (answer) {
    try {
      const { data, error } = await supabase.from('caches').upsert({
        context,
        time,
        question,
        answer,
        model,
        user,
      })

      if (error) {
        loggy(error.message, true)
      } else {
        loggy(`[${context}] Cached question/answer`, false, true)
      }
    } catch {}
  }
}

export const getConversation = async (conversationId: string, user: string) => {
  let query = supabase.from('conversations').select('*').eq('id', conversationId)
  if (user) {
    query = query.eq('user', user)
  }
  const { data } = await query
  return data?.[0]
}
