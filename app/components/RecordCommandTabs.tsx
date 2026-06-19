"use client";

import { ReactNode, useState } from "react";

type TabKey = "overview" | "value" | "tracks" | "pressing" | "details" | "tools";

type Tab = {
  key: TabKey;
  label: string;
  content: ReactNode;
};

export default function RecordCommandTabs({
  overview,
  value,
  tracks,
  pressing,
  details,
  tools,
}: {
  overview: ReactNode;
  value: ReactNode;
  tracks: ReactNode;
  pressing: ReactNode;
  details: ReactNode;
  tools: ReactNode;
}) {
  const [active, setActive] = useState<TabKey>("overview");

  const tabs: Tab[] = [
    { key: "overview", label: "Overview", content: overview },
    { key: "value", label: "Value", content: value },
    { key: "tracks", label: "Tracks", content: tracks },
    { key: "pressing", label: "Pressing", content: pressing },
    { key: "details", label: "Details", content: details },
    { key: "tools", label: "Tools", content: tools },
  ];

  const activeTab = tabs.find((tab) => tab.key === active) ?? tabs[0];

  return (
    <section className="space-y-6">
      <div className="sticky top-0 z-20 rounded-[28px] border border-white/10 bg-black/80 p-2 shadow-2xl backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
          {tabs.map((tab) => {
            const selected = tab.key === active;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActive(tab.key)}
                className={`rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.16em] transition ${
                  selected
                    ? "bg-[#D8B86A] text-black"
                    : "border border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-8">{activeTab.content}</div>
    </section>
  );
}
