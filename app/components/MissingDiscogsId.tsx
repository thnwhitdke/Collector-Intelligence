"use client";

import Link from "next/link";
import { AlertCircle, Disc3, Pencil, ArrowLeft } from "lucide-react";

type Props = {
  recordId: string | number;
};

export default function MissingDiscogsId({ recordId }: Props) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-3xl rounded-3xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-neutral-800 px-8 py-6 flex items-center justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.25em] text-neutral-400">
              Collector Intelligence
            </div>

            <h1 className="mt-2 text-2xl font-semibold">
              Discogs ID Missing
            </h1>
          </div>

          <Disc3 className="h-10 w-10 text-amber-400" />
        </div>

        {/* Content */}
        <div className="p-8 md:p-12">
          <div className="flex justify-center mb-10">
            <div className="h-28 w-28 rounded-full bg-neutral-800 flex items-center justify-center">
              <AlertCircle className="h-14 w-14 text-amber-400" />
            </div>
          </div>

          <h2 className="text-4xl font-bold text-center">
            We couldn’t load this release
          </h2>

          <p className="mt-6 text-center text-lg text-neutral-300 leading-relaxed max-w-2xl mx-auto">
            This item does not currently have a Discogs Release ID attached.
            Collector Intelligence uses the Discogs ID to retrieve release
            metadata, market values, cover art, and collector insights.
          </p>

          {/* Why */}
          <div className="mt-12 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <h3 className="text-lg font-semibold mb-4">
              Why this happens
            </h3>

            <ul className="space-y-3 text-neutral-300">
              <li>• The record was added manually</li>
              <li>• The Discogs match was never completed</li>
              <li>• The Discogs ID field is empty or invalid</li>
              <li>• Metadata import was interrupted</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="mt-12 flex flex-col md:flex-row gap-4">
            <Link
              href={`/collection/${recordId}/edit`}
              className="flex-1 rounded-2xl bg-amber-500 hover:bg-amber-400 transition-all px-6 py-4 text-black font-semibold flex items-center justify-center gap-3"
            >
              <Pencil className="h-5 w-5" />
              Edit Record
            </Link>

            <Link
              href="/collection"
              className="flex-1 rounded-2xl border border-neutral-700 hover:border-neutral-500 transition-all px-6 py-4 font-semibold flex items-center justify-center gap-3"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Collection
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-sm text-neutral-500">
            Collector Intelligence gracefully handled this missing metadata.
          </div>
        </div>
      </div>
    </div>
  );
}