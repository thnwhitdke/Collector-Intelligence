"use client";

import {
  useFormStatus,
} from "react-dom";

function SubmitButton() {

  const {
    pending,
  } = useFormStatus();

  return (

    <button
      type="submit"
      disabled={pending}
      className="
        bg-[#C7A45D]
        hover:bg-[#D6B46A]
        text-black
        font-bold
        rounded-2xl
        py-3
        transition
        disabled:opacity-50
      "
    >

      {pending
        ? "Enriching Metadata..."
        : "Enrich Discogs Metadata"}

    </button>

  );

}

type Props = {

  action: (
    formData: FormData
  ) => void | Promise<void>;

};

export default function EnrichButton({
  action,
}: Props) {

  return (

    <form action={action}>

      <SubmitButton />

    </form>

  );

}