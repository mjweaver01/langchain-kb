import { supabase } from './supabase'
import loggy from './loggy'

export const getCache = async (context: string, time: number, model: string, question?: any) => {
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
    const { data } = await supabase
      .from('caches')
      .select('*')
      .eq('context', context)
      .eq('question', question)
      .eq('model', model)
      .order('time', { ascending: false })
    return data
  }
}

export const saveToCache = async (
  context: SourceType,
  time: number,
  question: string,
  answer: any,
  model: string,
) => {
  if (answer) {
    try {
      const { data, error } = await supabase.from('caches').upsert({
        context,
        time,
        question,
        answer,
        model,
      })

      if (error) {
        loggy(error.message, true)
      } else {
        loggy(`[${context}] Cached question/answer`, false, true)
      }
    } catch {}
  }
}

export const getConversation = async (conversationId: string) => {
  const { data } = await supabase.from('conversations').select('*').eq('id', conversationId)
  return data?.[0]
}
