"use server"

import { createClient } from "@/src/lib/supabase/server"

export async function getArtistIQLeaderboard(limit = 10) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("artist_iq_leaderboard")
    .select("*")
    .limit(limit)

  if (error) {
    console.error("Artist IQ leaderboard error", error)
    return []
  }

  return data ?? []
}

export async function getArtistDominance(limit = 10) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("artist_dominance_view")
    .select("*")
    .limit(limit)

  if (error) {
    console.error("Artist dominance error", error)
    return []
  }

  return data ?? []
}

export async function getArtistRarity(limit = 10) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("artist_rarity_view")
    .select("*")
    .limit(limit)

  if (error) {
    console.error("Artist rarity error", error)
    return []
  }

  return data ?? []
}

export async function getArtistNeighborReach(limit = 10) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("artist_neighbor_reach_view")
    .select("*")
    .limit(limit)

  if (error) {
    console.error("Neighbor reach error", error)
    return []
  }

  return data ?? []
}
