"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  genreData: any[];
  velocityData: any[];
}

export default function AnalyticsCharts({
  genreData,
  velocityData,
}: Props) {
  const COLORS = [
    "#8b5cf6",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ef4444",
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

      <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6">

        <h2 className="text-3xl font-bold mb-5">
          Genre Distribution
        </h2>

        <div className="h-[350px]">

          <ResponsiveContainer width="100%" height="100%">

            <PieChart>

              <Pie
                data={genreData}
                dataKey="value"
                outerRadius={120}
                label
              >
                {genreData.map(
                  (_, index) => (
                    <Cell
                      key={index}
                      fill={
                        COLORS[
                          index %
                            COLORS.length
                        ]
                      }
                    />
                  )
                )}
              </Pie>

              <Tooltip />

            </PieChart>

          </ResponsiveContainer>

        </div>

      </div>

      <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6">

        <h2 className="text-3xl font-bold mb-5">
          Market Velocity
        </h2>

        <div className="h-[350px]">

          <ResponsiveContainer width="100%" height="100%">

            <BarChart data={velocityData}>

              <CartesianGrid stroke="#27272a" />

              <XAxis
                dataKey="name"
                stroke="#a1a1aa"
              />

              <YAxis stroke="#a1a1aa" />

              <Tooltip />

              <Bar
                dataKey="velocity"
                fill="#06b6d4"
                radius={[12, 12, 0, 0]}
              />

            </BarChart>

          </ResponsiveContainer>

        </div>

      </div>

    </div>
  );
}