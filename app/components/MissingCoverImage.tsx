"use client";

import Link from "next/link";
import {
  ImageOff,
  ArrowLeft,
  Upload,
  Disc3,
} from "lucide-react";

type Props = {
  discogsUrl?: string | null;
};

export default function MissingCoverImage({
  discogsUrl,
}: Props) {
  return (
    <div className="rounded-3xl border border-neutral-800 bg-neutral-900 overflow-hidden">
      {/* Header */}
      <div className="border-b border-neutral-800 px-6 py-5 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-neutral-500">
            Collector Intelligence
          </div>

          <h2 className="mt-2 text-2xl font-semibold text-white">
            No Cover Image Available
          </h2>
        </div>

        <Disc3 className="h-8 w-8 text-neutral-400" />
      </div>

      {/* Body */}
      <div className="p-10">
        <div className="flex justify-center mb-8">
          <div className="h-28 w-28 rounded-full bg-neutral-800 flex items-center justify-center">
            <ImageOff className="h-14 w-14 text-neutral-400" />
          </div>
        </div>

        <p className="text-center text-lg text-neutral-300 max-w-2xl mx-auto leading-relaxed">
          Discogs does not currently have a cover image for this release.
          This is common with extremely rare pressings, private releases,
          promos, acetates, or newly-added entries.
        </p>

        {/* Info Box */}
        <div className="mt-10 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            What you can still do
          </h3>

          <ul className="space-y-3 text-neutral-300">
            <li>• View release metadata</li>
            <li>• Track collection value</li>
            <li>• Edit grading and notes</li>
            <li>• Upload your own archival image later</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="mt-10 flex flex-col md:flex-row gap-4">
          {discogsUrl ? (
            <a
              href={discogsUrl}
              target="_blank"
              className="flex-1 rounded-2xl bg-white text-black hover:bg-neutral-200 transition-all px-6 py-4 font-semibold flex items-center justify-center gap-3"
            >
              <Upload className="h-5 w-5" />
              View on Discogs
            </a>
          ) : null}

          <Link
            href="/collection"
            className="flex-1 rounded-2xl border border-neutral-700 hover:border-neutral-500 transition-all px-6 py-4 font-semibold flex items-center justify-center gap-3 text-white"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Collection
          </Link>
        </div>
      </div>
    </div>
  );
}