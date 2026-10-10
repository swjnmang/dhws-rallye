// Logo: die Postenflagge (weiß/orange, diagonal geteilt) plus Schriftzug.
export default function BrandMark({
  tone = "light",
  size = "md",
}: {
  tone?: "light" | "dark";
  size?: "sm" | "md";
}) {
  const flag = size === "sm" ? "h-7 w-7" : "h-10 w-10";
  const text = size === "sm" ? "text-xl" : "text-3xl";
  return (
    <span className="flex items-center gap-3">
      <span
        aria-hidden
        className={`ol-flag ${flag} shrink-0 rounded-[3px] border-2 ${
          tone === "dark" ? "border-white" : "border-ink"
        }`}
      />
      <span
        className={`font-display ${text} font-extrabold uppercase leading-none tracking-wide ${
          tone === "dark" ? "text-white" : "text-ink"
        }`}
      >
        My Rallye
      </span>
    </span>
  );
}
