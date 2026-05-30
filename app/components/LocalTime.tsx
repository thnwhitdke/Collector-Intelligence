"use client";

type LocalTimeProps = {
  value: string | null;
};

export default function LocalTime({ value }: LocalTimeProps) {
  if (!value) return <>—</>;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return <>—</>;

  return (
    <>
      {date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}
    </>
  );
}
