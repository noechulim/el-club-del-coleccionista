type ArrowIconProps = {
  direction?: "right" | "left" | "up-right";
  className?: string;
};

export function ArrowIcon({ direction = "right", className = "" }: ArrowIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`ui-arrow ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      {direction === "up-right" ? (
        <path d="M5 19 19 5M8 5h11v11" />
      ) : direction === "left" ? (
        <path d="M19 12H5m7 7-7-7 7-7" />
      ) : (
        <path d="M5 12h14m-7-7 7 7-7 7" />
      )}
    </svg>
  );
}
