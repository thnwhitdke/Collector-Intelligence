import { createClient } from '@/src/lib/supabase/server'

export async function updateLastSeenOps() {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return
  }

  await supabase
    .from('user_activity_state')
    .upsert(
      {
        user_id: user.id,
        last_seen_ops_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        onConflict: 'user_id'
      }
    )
}
