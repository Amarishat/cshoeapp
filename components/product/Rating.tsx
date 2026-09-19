import Image from "next/image";

/** "5.0 ★" — Inter 17 with the #FFC107 star 29px from the text start (Figma). */
export function Rating({ value }: { value: number }) {
  return (
    <span className="relative inline-block w-[43px] text-label">
      <span className="sr-only">Rated </span>
      {value.toFixed(1)}
      <span className="sr-only"> out of 5</span>
      <Image
        src="/images/icons/star.svg"
        alt=""
        width={14}
        height={13}
        unoptimized
        className="absolute top-1 left-[29px] h-[13.17px] w-[13.86px]"
      />
    </span>
  );
}
