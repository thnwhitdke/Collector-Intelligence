"use client";

import { useFormStatus } from "react-dom";

function SubmitButton() {

  const { pending } = useFormStatus();

  return (

    <button
      type="submit"
      disabled={pending}
      className={`
        relative
        overflow-hidden
        rounded-2xl
        py-3
        px-6
        font-bold
        w-full
        transition-all
        duration-300
        flex
        items-center
        justify-center
        gap-3
        ${
          pending
            ? "bg-[#8B6B1F] text-[#F4EFE6] cursor-not-allowed"
            : "bg-[#C7A45D] hover:bg-[#D6B56D] text-[#11100E]"
        }
      `}
    >

      {pending && (
        <div
          className="
            w-5
            h-5
            border-2
            border-[#F4EFE6]/40
            border-t-[#F4EFE6]
            rounded-full
            animate-spin
          "
        />
      )}

      <span>
        {
          pending
            ? "Enriching Metadata..."
            : "Enrich Discogs Metadata"
        }
      </span>

    </button>

  );
}

export default function EnrichButton({
  action,
}: {
  action: () => Promise<void>;
}) {

  return (

    <form action={action}>
      <SubmitButton />
    </form>

  );
}