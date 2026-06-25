import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function countTable(table) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true })
  if (error) {
    console.error(`COUNT FAILED ${table}`, error)
    return 0
  }
  return count || 0
}

const releases = await countTable("release_reference")

const { data: sampleRows, error: sampleError } = await supabase
  .from("release_reference")
  .select("artist,label,country,format")
  .limit(50000)

if (sampleError) {
  console.error(sampleError)
  process.exit(1)
}

const artists = new Set()
const labels = new Set()
const countries = new Set()

for (const row of sampleRows || []) {
  if (row.artist) artists.add(String(row.artist).trim())
  if (row.label) labels.add(String(row.label).trim())
  if (row.country) countries.add(String(row.country).trim())
}

const payload = {
  id: 1,
  releases,
  vinyl_releases: releases,
  artists: artists.size,
  labels: labels.size,
  countries: countries.size,
  refreshed_at: new Date().toISOString(),
}

const { error } = await supabase
  .from("release_warehouse_metrics")
  .upsert(payload, { onConflict: "id" })

if (error) {
  console.error(error)
  process.exit(1)
}

console.log("WAREHOUSE METRICS REFRESHED", payload)
