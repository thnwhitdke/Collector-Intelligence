'use server'

import { createClient } from '@/src/lib/supabase/server'

export type ArtistIQLeader = {
  artist_id: number
  artist_name: string
  total_records: number
  style_count: number
  genre_count: number
  portfolio_share: number
  rarity_score: number
  neighbor_reach: number
  artist_iq_score: number
}

export type ArtistDominance = {
  artist_id: number
  artist_name: string
  total_records: number
  portfolio_percent: number
}

export type ArtistRarity = {
  artist_id: number
  artist_name: string
  total_records: number
  style_count: number
  rarity_score: number
}

export type ArtistNeighborReach = {
  artist_id: number
  artist_name: string
  total_records: number
  neighbor_reach: number
}

export type DashboardIntelligenceResponse = {
  iqLeaders: ArtistIQLeader[]
  dominanceLeaders: ArtistDominance[]
  rarityLeaders: ArtistRarity[]
  neighborReachLeaders: ArtistNeighborReach[]
}

export async function getArtistIQLeaders(
  limit = 10,
): Promise<ArtistIQLeader[]> {

  const supabase =
    await createClient()

  const { data, error } =
    await supabase
      .from(
        'artist_iq_leaderboard',
      )
      .select('*')
      .limit(limit)

  if (error) {
    console.error(
      '[Artist IQ Leaders]',
      error,
    )
    return []
  }

  return (
    data?.map((row) => ({
      artist_id:
        Number(
          row.artist_id,
        ),
      artist_name:
        String(
          row.artist_name,
        ),
      total_records:
        Number(
          row.total_records,
        ),
      style_count:
        Number(
          row.style_count,
        ),
      genre_count:
        Number(
          row.genre_count,
        ),
      portfolio_share:
        Number(
          row.portfolio_share,
        ),
      rarity_score:
        Number(
          row.rarity_score,
        ),
      neighbor_reach:
        Number(
          row.neighbor_reach,
        ),
      artist_iq_score:
        Number(
          row.artist_iq_score,
        ),
    })) || []
  )
}

export async function getDominanceLeaders(
  limit = 10,
): Promise<ArtistDominance[]> {

  const supabase =
    await createClient()

  const { data, error } =
    await supabase
      .from(
        'artist_dominance_view',
      )
      .select('*')
      .limit(limit)

  if (error) {
    console.error(
      '[Dominance Leaders]',
      error,
    )
    return []
  }

  return (
    data?.map((row) => ({
      artist_id:
        Number(
          row.artist_id,
        ),
      artist_name:
        String(
          row.artist_name,
        ),
      total_records:
        Number(
          row.total_records,
        ),
      portfolio_percent:
        Number(
          row.portfolio_percent,
        ),
    })) || []
  )
}

export async function getRarityLeaders(
  limit = 10,
): Promise<ArtistRarity[]> {

  const supabase =
    await createClient()

  const { data, error } =
    await supabase
      .from(
        'artist_rarity_view',
      )
      .select('*')
      .limit(limit)

  if (error) {
    console.error(
      '[Rarity Leaders]',
      error,
    )
    return []
  }

  return (
    data?.map((row) => ({
      artist_id:
        Number(
          row.artist_id,
        ),
      artist_name:
        String(
          row.artist_name,
        ),
      total_records:
        Number(
          row.total_records,
        ),
      style_count:
        Number(
          row.style_count,
        ),
      rarity_score:
        Number(
          row.rarity_score,
        ),
    })) || []
  )
}

export async function getNeighborReachLeaders(
  limit = 10,
): Promise<ArtistNeighborReach[]> {

  const supabase =
    await createClient()

  const { data, error } =
    await supabase
      .from(
        'artist_neighbor_reach_view',
      )
      .select('*')
      .limit(limit)

  if (error) {
    console.error(
      '[Neighbor Reach]',
      error,
    )
    return []
  }

  return (
    data?.map((row) => ({
      artist_id:
        Number(
          row.artist_id,
        ),
      artist_name:
        String(
          row.artist_name,
        ),
      total_records:
        Number(
          row.total_records,
        ),
      neighbor_reach:
        Number(
          row.neighbor_reach,
        ),
    })) || []
  )
}

export async function getDashboardIntelligence(): Promise<DashboardIntelligenceResponse> {

  const [
    iqLeaders,
    dominanceLeaders,
    rarityLeaders,
    neighborReachLeaders,
  ] = await Promise.all([
    getArtistIQLeaders(10),
    getDominanceLeaders(10),
    getRarityLeaders(10),
    getNeighborReachLeaders(10),
  ])

  return {
    iqLeaders,
    dominanceLeaders,
    rarityLeaders,
    neighborReachLeaders,
  }
}
