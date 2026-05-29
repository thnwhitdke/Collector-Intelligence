


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, '', '');
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_ebay_comp_to_value"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.ebay_sold_price is not null then
    new.ebay_last_sold_price := new.ebay_sold_price;
    new.ebay_sold_comp_count := coalesce(new.ebay_sold_comp_count, 1);
    new.ebay_low_sold_price := coalesce(new.ebay_low_sold_price, new.ebay_sold_price);
    new.ebay_median_sold_price := coalesce(new.ebay_median_sold_price, new.ebay_sold_price);
    new.ebay_high_sold_price := coalesce(new.ebay_high_sold_price, new.ebay_sold_price);
    new.current_value := new.ebay_sold_price;
    new.estimated_value := new.ebay_sold_price;
    new.value_source := 'eBay Sold Comp';
    new.value_last_updated := now();
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_ebay_comp_to_value"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_record_ebay_comp_summary"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update records_clean_safe r
  set
    ebay_sold_comp_count = summary.comp_count,
    ebay_low_sold_price = summary.low_price,
    ebay_median_sold_price = summary.median_price,
    ebay_high_sold_price = summary.high_price,
    ebay_last_sold_price = summary.last_price,
    current_value = summary.median_price,
    estimated_value = summary.median_price,
    value_source = 'eBay Multi-Comp Median',
    value_last_updated = now()
  from (
    select
      record_id,
      count(*)::numeric as comp_count,
      min(sold_price) as low_price,
      percentile_cont(0.5) within group (order by sold_price) as median_price,
      max(sold_price) as high_price,
      (
        array_agg(sold_price order by sold_date desc nulls last, created_at desc)
      )[1] as last_price
    from record_ebay_comps
    where record_id = coalesce(new.record_id, old.record_id)
      and sold_price is not null
    group by record_id
  ) summary
  where r.id = summary.record_id;

  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."sync_record_ebay_comp_summary"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity_log" (
    "id" bigint NOT NULL,
    "record_id" bigint,
    "activity_type" "text" NOT NULL,
    "activity_detail" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."activity_log" OWNER TO "postgres";


ALTER TABLE "public"."activity_log" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."activity_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."background_jobs" (
    "id" bigint NOT NULL,
    "job_type" "text" NOT NULL,
    "status" "text" DEFAULT 'queued'::"text",
    "processed_count" integer DEFAULT 0,
    "error_count" integer DEFAULT 0,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."background_jobs" OWNER TO "postgres";


ALTER TABLE "public"."background_jobs" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."background_jobs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."comparable_sales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "record_id" bigint,
    "source" "text",
    "title" "text",
    "artist" "text",
    "sale_price" numeric,
    "shipping_price" numeric,
    "total_price" numeric,
    "currency" "text" DEFAULT 'USD'::"text",
    "condition_media" "text",
    "condition_sleeve" "text",
    "sold_date" timestamp with time zone,
    "listing_url" "text",
    "image_url" "text",
    "seller_name" "text",
    "seller_feedback_score" integer,
    "num_bids" integer,
    "was_best_offer" boolean DEFAULT false,
    "pressing_notes" "text",
    "similarity_score" numeric,
    "confidence_score" numeric,
    "raw_payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."comparable_sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discogs_match_cache" (
    "id" bigint NOT NULL,
    "normalized_query" "text",
    "discogs_release_id" bigint,
    "discogs_title" "text",
    "confidence_score" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."discogs_match_cache" OWNER TO "postgres";


ALTER TABLE "public"."discogs_match_cache" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."discogs_match_cache_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."enrichment_activity_log" (
    "id" bigint NOT NULL,
    "record_id" bigint,
    "queue_job_id" bigint,
    "event_type" "text",
    "status" "text",
    "source" "text",
    "duration_ms" integer,
    "retry_count" integer DEFAULT 0,
    "confidence_score" numeric,
    "error_message" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."enrichment_activity_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."enrichment_activity_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."enrichment_activity_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."enrichment_activity_log_id_seq" OWNED BY "public"."enrichment_activity_log"."id";



CREATE TABLE IF NOT EXISTS "public"."enrichment_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_type" "text" DEFAULT 'discogs_enrichment'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "priority" integer DEFAULT 5 NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "record_id" bigint,
    "retry_count" integer DEFAULT 0,
    "max_retries" integer DEFAULT 5,
    "next_retry_at" timestamp with time zone,
    "last_error" "text",
    "permanently_failed" boolean DEFAULT false,
    "failure_stage" "text",
    "last_attempted_at" timestamp with time zone,
    "last_attempt" timestamp with time zone
);


ALTER TABLE "public"."enrichment_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."market_changes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text",
    "artist" "text",
    "field_changed" "text",
    "old_value" numeric,
    "new_value" numeric,
    "change_amount" numeric,
    "change_percent" numeric,
    "change_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "record_id" bigint
);


ALTER TABLE "public"."market_changes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."market_comps" (
    "id" bigint NOT NULL,
    "record_id" bigint NOT NULL,
    "source" "text",
    "sold_price" numeric(10,2),
    "listing_title" "text",
    "sold_date" timestamp with time zone,
    "condition" "text",
    "confidence_score" numeric(5,2),
    "url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."market_comps" OWNER TO "postgres";


ALTER TABLE "public"."market_comps" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."market_comps_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."market_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "artist" "text",
    "album" "text",
    "event_type" "text",
    "event_value" numeric,
    "description" "text",
    "image_url" "text"
);


ALTER TABLE "public"."market_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."market_history" (
    "id" bigint NOT NULL,
    "record_id" "text" NOT NULL,
    "discogs_low_price" numeric,
    "discogs_median_price" numeric,
    "discogs_high_price" numeric,
    "discogs_for_sale" integer,
    "market_signal" "text",
    "captured_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."market_history" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."market_history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."market_history_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."market_history_id_seq" OWNED BY "public"."market_history"."id";



CREATE TABLE IF NOT EXISTS "public"."market_intelligence" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "record_id" "uuid",
    "discogs_release_id" bigint,
    "median_price" numeric,
    "lowest_price" numeric,
    "highest_price" numeric,
    "sales_volume" integer,
    "demand_score" integer,
    "rarity_score" integer,
    "market_velocity" numeric,
    "last_market_sync" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."market_intelligence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."market_search_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "record_id" bigint,
    "normalized_fingerprint" "text",
    "ebay_search_query" "text",
    "discogs_search_query" "text",
    "search_keywords" "text"[],
    "last_search_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."market_search_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "display_name" "text",
    "avatar_url" "text" DEFAULT '''free'''::"text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."record_ebay_comps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "record_id" bigint NOT NULL,
    "sold_price" numeric,
    "sold_date" "date",
    "sold_url" "text",
    "confidence" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."record_ebay_comps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."record_value_history" (
    "id" bigint NOT NULL,
    "record_id" bigint,
    "title" "text",
    "artist" "text",
    "low_value" numeric,
    "median_value" numeric,
    "high_value" numeric,
    "snapshot_date" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."record_value_history" OWNER TO "postgres";


ALTER TABLE "public"."record_value_history" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."record_value_history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "artist" "text" NOT NULL,
    "title" "text" NOT NULL,
    "year" integer,
    "format" "text",
    "label" "text",
    "catalog_number" "text",
    "condition_media" "text",
    "condition_sleeve" "text",
    "notes" "text",
    "rating" integer,
    "purchased_at" "date",
    "purchase_price" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "country" "text",
    "pressing" "text",
    "condition" "text",
    "cover_url" "text",
    "value" numeric,
    "discogs_release_id" bigint,
    "discogs_resource_url" "text",
    "discogs_master_id" bigint,
    CONSTRAINT "records_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 10)))
);


ALTER TABLE "public"."records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."records_clean" (
    "id" bigint NOT NULL,
    "artist" "text",
    "title" "text",
    "format" "text",
    "cover_present" "text",
    "label" "text",
    "catalogue_number" "text",
    "year_released" "text",
    "country" "text",
    "notes" "text",
    "sealed_status" "text",
    "discogs_url" "text",
    "median_price" "text",
    "discogs_release_id" "text",
    "discogs_master_id" "text",
    "source_row_number" bigint,
    "cover_url" "text",
    "discogs_resource_url" "text",
    "condition" "text",
    "price" "text",
    "value" "text",
    "date_acquired" "date",
    "discogs_image_url" "text",
    "discogs_thumbnail_url" "text",
    "last_discogs_sync" timestamp with time zone,
    "market_price_updated_at" timestamp with time zone,
    "metadata_confidence" numeric,
    "auto_enriched" boolean DEFAULT false
);


ALTER TABLE "public"."records_clean" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."records_clean_backup" (
    "id" bigint,
    "artist" "text",
    "title" "text",
    "format" "text",
    "cover_present" "text",
    "label" "text",
    "catalogue_number" "text",
    "year_released" "text",
    "country" "text",
    "notes" "text",
    "sealed_status" "text",
    "discogs_url" "text",
    "median_price" "text",
    "discogs_release_id" "text",
    "discogs_master_id" "text",
    "source_row_number" bigint,
    "cover_url" "text",
    "discogs_resource_url" "text"
);


ALTER TABLE "public"."records_clean_backup" OWNER TO "postgres";


ALTER TABLE "public"."records_clean" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."records_clean_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE SEQUENCE IF NOT EXISTS "public"."records_clean_safe_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."records_clean_safe_id_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."records_clean_safe" (
    "id" bigint DEFAULT "nextval"('"public"."records_clean_safe_id_seq"'::"regclass") NOT NULL,
    "artist" "text",
    "title" "text",
    "format" "text",
    "cover_present" "text",
    "label" "text",
    "catalogue_number" "text",
    "year_released" "text",
    "country" "text",
    "notes" "text",
    "sealed_status" "text",
    "discogs_url" "text",
    "median_price" "text",
    "discogs_release_id" "text",
    "discogs_master_id" "text",
    "source_row_number" bigint,
    "cover_url" "text",
    "discogs_resource_url" "text",
    "media_condition" "text",
    "sleeve_condition" "text",
    "purchase_price" "text",
    "estimated_value" "text",
    "purchase_date" "text",
    "condition" "text",
    "price" "text",
    "value" "text",
    "date_acquired" "date",
    "possible_duplicate" boolean DEFAULT false,
    "media_grade" "text",
    "sleeve_grade" "text",
    "grading_notes" "text",
    "current_value" numeric,
    "ebay_last_sold_price" numeric,
    "value_source" "text",
    "discogs_low_price" numeric,
    "discogs_median_price" numeric,
    "discogs_high_price" numeric,
    "value_last_updated" timestamp with time zone,
    "price_history" "jsonb" DEFAULT '[]'::"jsonb",
    "ebay_last_sold_date" "date",
    "ebay_sold_comp_count" integer,
    "ebay_low_sold_price" numeric,
    "ebay_median_sold_price" numeric,
    "ebay_high_sold_price" numeric,
    "ebay_confidence_score" integer,
    "ebay_confidence_label" "text",
    "ebay_last_checked" timestamp with time zone,
    "ebay_comp_source" "text",
    "ebay_query_used" "text",
    "ebay_notes" "text",
    "ebay_sold_price" numeric,
    "ebay_sold_date" "date",
    "ebay_sold_url" "text",
    "ebay_confidence" "text",
    "discogs_num_for_sale" integer,
    "discogs_lowest_price" numeric,
    "discogs_num_have" integer,
    "discogs_num_want" integer,
    "discogs_market_last_updated" timestamp without time zone,
    "discogs_for_sale" integer,
    "discogs_last_sold_date" "text",
    "value_pull_status" "text",
    "value_pull_note" "text",
    "value_pull_last_attempted_at" timestamp with time zone,
    "discogs_sale_blocked" boolean DEFAULT false,
    "discogs_sale_blocked_reason" "text",
    "user_id" "uuid",
    "ebay_avg_sold_price" numeric,
    "ebay_sold_count" integer,
    "ebay_comp_url" "text",
    "manual_comp_price" numeric,
    "manual_comp_note" "text",
    "condition_grade" "text",
    "value_confidence_score" integer,
    "value_signal" "text",
    "value_badges" "text"[],
    "styles" "text",
    "genre" "text",
    "style" "text",
    "genres" "text"[],
    "enrichment_status" "text",
    "valuation_confidence" "text",
    "collector_iq_score" numeric,
    "market_signal" "text",
    "market_signal_reason" "text",
    "market_signal_updated_at" timestamp without time zone,
    "market_spread" numeric,
    "market_activity_days" integer,
    "next_refresh_due_at" timestamp without time zone,
    "market_value_change_percent" numeric,
    "market_supply_change" integer,
    "market_momentum" "text",
    "market_trend" "text",
    "demand_score" numeric DEFAULT 0,
    "supply_pressure" numeric DEFAULT 0,
    "volatility_score" numeric DEFAULT 0,
    "rarity_index" numeric DEFAULT 0,
    "collector_velocity" numeric DEFAULT 0,
    "discogs_image_url" "text",
    "discogs_thumbnail_url" "text",
    "enrichment_last_run" timestamp with time zone,
    "enrichment_attempts" integer DEFAULT 0,
    "discogs_confidence" numeric DEFAULT 0,
    "metadata_confidence" numeric DEFAULT 0,
    "needs_review" boolean DEFAULT false,
    "self_healed" boolean DEFAULT false,
    "last_self_heal_reason" "text",
    "year" integer,
    "normalized_artist" "text",
    "normalized_title" "text",
    "canonical_display_title" "text",
    "confidence_score" integer,
    "review_status" "text",
    "market_num_for_sale" integer,
    "market_blocked_from_sale" boolean,
    "market_low_price" numeric DEFAULT 0,
    "market_median_price" numeric DEFAULT 0,
    "market_high_price" numeric DEFAULT 0,
    "market_for_sale_ratio" numeric DEFAULT 0,
    "market_sales_velocity" numeric DEFAULT 0,
    "rarity_score" numeric DEFAULT 0,
    "valuation_source" "text" DEFAULT 'discogs'::"text",
    "valuation_updated_at" timestamp with time zone
);


ALTER TABLE "public"."records_clean_safe" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saved_views" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "preset" "text" DEFAULT 'all'::"text" NOT NULL,
    "sort" "text" DEFAULT 'id_desc'::"text" NOT NULL,
    "search_query" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "public"."saved_views" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."saved_views_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."saved_views_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."saved_views_id_seq" OWNED BY "public"."saved_views"."id";



CREATE TABLE IF NOT EXISTS "public"."value_history" (
    "id" bigint NOT NULL,
    "record_id" bigint NOT NULL,
    "estimated_value" numeric(10,2),
    "discogs_low" numeric(10,2),
    "discogs_median" numeric(10,2),
    "discogs_high" numeric(10,2),
    "market_num_for_sale" integer,
    "momentum_score" numeric(6,2),
    "value_source" "text" DEFAULT 'discogs'::"text",
    "snapshot_date" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."value_history" OWNER TO "postgres";


ALTER TABLE "public"."value_history" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."value_history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."want_list" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "discogs_release_id" bigint NOT NULL,
    "artist" "text",
    "title" "text",
    "label" "text",
    "year_released" "text",
    "format" "text",
    "cover_url" "text",
    "discogs_url" "text",
    "discogs_low_price" numeric,
    "discogs_median_price" numeric,
    "discogs_high_price" numeric,
    "estimated_value" numeric,
    "marketplace_for_sale_count" integer,
    "marketplace_lowest_price" numeric,
    "marketplace_currency" "text",
    "marketplace_url" "text",
    "notes" "text",
    "priority" "text" DEFAULT 'Medium'::"text",
    "purchased" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."want_list" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."want_list_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."want_list_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."want_list_id_seq" OWNED BY "public"."want_list"."id";



CREATE TABLE IF NOT EXISTS "public"."watchlist" (
    "id" bigint NOT NULL,
    "record_id" bigint NOT NULL,
    "target_price" numeric(10,2),
    "alert_enabled" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."watchlist" OWNER TO "postgres";


ALTER TABLE "public"."watchlist" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."watchlist_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."enrichment_activity_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."enrichment_activity_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."market_history" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."market_history_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."saved_views" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."saved_views_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."want_list" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."want_list_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."background_jobs"
    ADD CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comparable_sales"
    ADD CONSTRAINT "comparable_sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discogs_match_cache"
    ADD CONSTRAINT "discogs_match_cache_normalized_query_key" UNIQUE ("normalized_query");



ALTER TABLE ONLY "public"."discogs_match_cache"
    ADD CONSTRAINT "discogs_match_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrichment_activity_log"
    ADD CONSTRAINT "enrichment_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrichment_queue"
    ADD CONSTRAINT "enrichment_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_changes"
    ADD CONSTRAINT "market_changes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_comps"
    ADD CONSTRAINT "market_comps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_events"
    ADD CONSTRAINT "market_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_history"
    ADD CONSTRAINT "market_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_intelligence"
    ADD CONSTRAINT "market_intelligence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_search_profiles"
    ADD CONSTRAINT "market_search_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."record_ebay_comps"
    ADD CONSTRAINT "record_ebay_comps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."record_value_history"
    ADD CONSTRAINT "record_value_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."records_clean"
    ADD CONSTRAINT "records_clean_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."records_clean_safe"
    ADD CONSTRAINT "records_clean_safe_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."records"
    ADD CONSTRAINT "records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_views"
    ADD CONSTRAINT "saved_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."value_history"
    ADD CONSTRAINT "value_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."want_list"
    ADD CONSTRAINT "want_list_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."watchlist"
    ADD CONSTRAINT "watchlist_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "comparable_sales_unique_idx" ON "public"."comparable_sales" USING "btree" ("record_id", "source", "title");



CREATE INDEX "idx_activity_created_at" ON "public"."enrichment_activity_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activity_event_type" ON "public"."enrichment_activity_log" USING "btree" ("event_type");



CREATE INDEX "idx_activity_log_record" ON "public"."activity_log" USING "btree" ("record_id");



CREATE INDEX "idx_activity_log_type" ON "public"."activity_log" USING "btree" ("activity_type");



CREATE INDEX "idx_activity_record_id" ON "public"."enrichment_activity_log" USING "btree" ("record_id");



CREATE INDEX "idx_activity_status" ON "public"."enrichment_activity_log" USING "btree" ("status");



CREATE INDEX "idx_background_jobs_status" ON "public"."background_jobs" USING "btree" ("status");



CREATE INDEX "idx_market_changes_created_at" ON "public"."market_changes" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_market_comps_record" ON "public"."market_comps" USING "btree" ("record_id");



CREATE INDEX "idx_market_comps_source" ON "public"."market_comps" USING "btree" ("source");



CREATE INDEX "idx_record_ebay_comps_record_id" ON "public"."record_ebay_comps" USING "btree" ("record_id");



CREATE INDEX "idx_records_clean_discogs_release_id" ON "public"."records_clean" USING "btree" ("discogs_release_id");



CREATE INDEX "idx_value_history_record" ON "public"."value_history" USING "btree" ("record_id");



CREATE INDEX "idx_value_history_snapshot" ON "public"."value_history" USING "btree" ("snapshot_date");



CREATE INDEX "idx_watchlist_record" ON "public"."watchlist" USING "btree" ("record_id");



CREATE INDEX "records_user_id_idx" ON "public"."records" USING "btree" ("user_id");



CREATE INDEX "saved_views_created_at_idx" ON "public"."saved_views" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "want_list_user_release_unique" ON "public"."want_list" USING "btree" ("user_id", "discogs_release_id");



CREATE OR REPLACE TRIGGER "trg_records_updated_at" BEFORE UPDATE ON "public"."records" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sync_ebay_comp_to_value" BEFORE INSERT OR UPDATE OF "ebay_sold_price" ON "public"."records_clean_safe" FOR EACH ROW EXECUTE FUNCTION "public"."sync_ebay_comp_to_value"();



CREATE OR REPLACE TRIGGER "trg_sync_record_ebay_comp_summary_delete" AFTER DELETE ON "public"."record_ebay_comps" FOR EACH ROW EXECUTE FUNCTION "public"."sync_record_ebay_comp_summary"();



CREATE OR REPLACE TRIGGER "trg_sync_record_ebay_comp_summary_insert" AFTER INSERT ON "public"."record_ebay_comps" FOR EACH ROW EXECUTE FUNCTION "public"."sync_record_ebay_comp_summary"();



CREATE OR REPLACE TRIGGER "trg_sync_record_ebay_comp_summary_update" AFTER UPDATE ON "public"."record_ebay_comps" FOR EACH ROW EXECUTE FUNCTION "public"."sync_record_ebay_comp_summary"();



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "public"."records_clean_safe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comparable_sales"
    ADD CONSTRAINT "comparable_sales_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "public"."records_clean_safe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."market_changes"
    ADD CONSTRAINT "market_changes_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "public"."records_clean_safe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."market_comps"
    ADD CONSTRAINT "market_comps_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "public"."records_clean_safe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."market_search_profiles"
    ADD CONSTRAINT "market_search_profiles_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "public"."records_clean_safe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."record_value_history"
    ADD CONSTRAINT "record_value_history_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "public"."records_clean_safe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."records_clean_safe"
    ADD CONSTRAINT "records_clean_safe_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."records"
    ADD CONSTRAINT "records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."value_history"
    ADD CONSTRAINT "value_history_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "public"."records_clean_safe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."watchlist"
    ADD CONSTRAINT "watchlist_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "public"."records_clean_safe"("id") ON DELETE CASCADE;



CREATE POLICY "Allow authenticated insert background jobs" ON "public"."background_jobs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated insert market history" ON "public"."market_history" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated insert value history" ON "public"."value_history" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated select background jobs" ON "public"."background_jobs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated select market history" ON "public"."market_history" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated select value history" ON "public"."value_history" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated update background jobs" ON "public"."background_jobs" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated update value history" ON "public"."value_history" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public insert access to records_clean_safe" ON "public"."records_clean_safe" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Allow public read access to records_clean_safe" ON "public"."records_clean_safe" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public update access to records_clean_safe" ON "public"."records_clean_safe" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Users can delete own want list" ON "public"."want_list" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own records" ON "public"."records_clean_safe" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own want list" ON "public"."want_list" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own records" ON "public"."records_clean_safe" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own want list" ON "public"."want_list" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own records" ON "public"."records_clean_safe" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can see their own records" ON "public"."records_clean_safe" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own want list" ON "public"."want_list" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own records" ON "public"."records_clean_safe" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."background_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comparable_sales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discogs_match_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enrichment_activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enrichment_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."market_changes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."market_comps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."market_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."market_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."market_intelligence" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."market_search_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."record_ebay_comps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."record_value_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."records_clean" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."records_clean_backup" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."records_clean_safe" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "records_delete_own" ON "public"."records" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "records_insert_own" ON "public"."records" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "records_select_own" ON "public"."records" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "records_update_own" ON "public"."records" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."saved_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."value_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."want_list" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."watchlist" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_ebay_comp_to_value"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_ebay_comp_to_value"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_ebay_comp_to_value"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_record_ebay_comp_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_record_ebay_comp_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_record_ebay_comp_summary"() TO "service_role";


















GRANT ALL ON TABLE "public"."activity_log" TO "anon";
GRANT ALL ON TABLE "public"."activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."activity_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."activity_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."activity_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."background_jobs" TO "anon";
GRANT ALL ON TABLE "public"."background_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."background_jobs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."background_jobs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."background_jobs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."background_jobs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."comparable_sales" TO "anon";
GRANT ALL ON TABLE "public"."comparable_sales" TO "authenticated";
GRANT ALL ON TABLE "public"."comparable_sales" TO "service_role";



GRANT ALL ON TABLE "public"."discogs_match_cache" TO "anon";
GRANT ALL ON TABLE "public"."discogs_match_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."discogs_match_cache" TO "service_role";



GRANT ALL ON SEQUENCE "public"."discogs_match_cache_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."discogs_match_cache_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."discogs_match_cache_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."enrichment_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."enrichment_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."enrichment_activity_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."enrichment_activity_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."enrichment_activity_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."enrichment_activity_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."enrichment_queue" TO "anon";
GRANT ALL ON TABLE "public"."enrichment_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."enrichment_queue" TO "service_role";



GRANT ALL ON TABLE "public"."market_changes" TO "anon";
GRANT ALL ON TABLE "public"."market_changes" TO "authenticated";
GRANT ALL ON TABLE "public"."market_changes" TO "service_role";



GRANT ALL ON TABLE "public"."market_comps" TO "anon";
GRANT ALL ON TABLE "public"."market_comps" TO "authenticated";
GRANT ALL ON TABLE "public"."market_comps" TO "service_role";



GRANT ALL ON SEQUENCE "public"."market_comps_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."market_comps_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."market_comps_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."market_events" TO "anon";
GRANT ALL ON TABLE "public"."market_events" TO "authenticated";
GRANT ALL ON TABLE "public"."market_events" TO "service_role";



GRANT ALL ON TABLE "public"."market_history" TO "anon";
GRANT ALL ON TABLE "public"."market_history" TO "authenticated";
GRANT ALL ON TABLE "public"."market_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."market_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."market_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."market_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."market_intelligence" TO "anon";
GRANT ALL ON TABLE "public"."market_intelligence" TO "authenticated";
GRANT ALL ON TABLE "public"."market_intelligence" TO "service_role";



GRANT ALL ON TABLE "public"."market_search_profiles" TO "anon";
GRANT ALL ON TABLE "public"."market_search_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."market_search_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."record_ebay_comps" TO "anon";
GRANT ALL ON TABLE "public"."record_ebay_comps" TO "authenticated";
GRANT ALL ON TABLE "public"."record_ebay_comps" TO "service_role";



GRANT ALL ON TABLE "public"."record_value_history" TO "anon";
GRANT ALL ON TABLE "public"."record_value_history" TO "authenticated";
GRANT ALL ON TABLE "public"."record_value_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."record_value_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."record_value_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."record_value_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."records" TO "anon";
GRANT ALL ON TABLE "public"."records" TO "authenticated";
GRANT ALL ON TABLE "public"."records" TO "service_role";



GRANT ALL ON TABLE "public"."records_clean" TO "anon";
GRANT ALL ON TABLE "public"."records_clean" TO "authenticated";
GRANT ALL ON TABLE "public"."records_clean" TO "service_role";



GRANT ALL ON TABLE "public"."records_clean_backup" TO "anon";
GRANT ALL ON TABLE "public"."records_clean_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."records_clean_backup" TO "service_role";



GRANT ALL ON SEQUENCE "public"."records_clean_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."records_clean_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."records_clean_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."records_clean_safe_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."records_clean_safe_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."records_clean_safe_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."records_clean_safe" TO "anon";
GRANT ALL ON TABLE "public"."records_clean_safe" TO "authenticated";
GRANT ALL ON TABLE "public"."records_clean_safe" TO "service_role";



GRANT ALL ON TABLE "public"."saved_views" TO "anon";
GRANT ALL ON TABLE "public"."saved_views" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_views" TO "service_role";



GRANT ALL ON SEQUENCE "public"."saved_views_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."saved_views_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."saved_views_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."value_history" TO "anon";
GRANT ALL ON TABLE "public"."value_history" TO "authenticated";
GRANT ALL ON TABLE "public"."value_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."value_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."value_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."value_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."want_list" TO "anon";
GRANT ALL ON TABLE "public"."want_list" TO "authenticated";
GRANT ALL ON TABLE "public"."want_list" TO "service_role";



GRANT ALL ON SEQUENCE "public"."want_list_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."want_list_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."want_list_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."watchlist" TO "anon";
GRANT ALL ON TABLE "public"."watchlist" TO "authenticated";
GRANT ALL ON TABLE "public"."watchlist" TO "service_role";



GRANT ALL ON SEQUENCE "public"."watchlist_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."watchlist_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."watchlist_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

drop policy "Allow public insert access to records_clean_safe" on "public"."records_clean_safe";

drop policy "Allow public read access to records_clean_safe" on "public"."records_clean_safe";

drop policy "Allow public update access to records_clean_safe" on "public"."records_clean_safe";


  create policy "Allow public insert access to records_clean_safe"
  on "public"."records_clean_safe"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "Allow public read access to records_clean_safe"
  on "public"."records_clean_safe"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Allow public update access to records_clean_safe"
  on "public"."records_clean_safe"
  as permissive
  for update
  to anon, authenticated
using (true)
with check (true);


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


