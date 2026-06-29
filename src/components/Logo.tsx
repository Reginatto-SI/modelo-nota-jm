interface LogoProps {
  size?: number;
  className?: string;
}

// JM monogram: balanced dark-blue letters in a light card for a cleaner corporate mark.
export function Logo({ size = 40, className }: LogoProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border) / 0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 1px 2px hsl(214 40% 20% / 0.08), 0 4px 10px hsl(214 40% 20% / 0.05)",
      }}
      aria-label="Logo JM"
    >
      <span
        style={{
          color: "hsl(var(--primary))",
          fontWeight: 700,
          fontSize: size * 0.42,
          letterSpacing: "-0.02em",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          lineHeight: 1,
        }}
      >
        JM
      </span>
    </div>
  );
}
