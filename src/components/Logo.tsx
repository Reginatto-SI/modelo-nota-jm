interface LogoProps {
  size?: number;
  className?: string;
}

// JM monogram: white letters on dark corporate blue square.
export function Logo({ size = 40, className }: LogoProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        background: "var(--gradient-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "var(--shadow-card)",
      }}
      aria-label="Logo JM"
    >
      <span
        style={{
          color: "hsl(var(--primary-foreground))",
          fontWeight: 800,
          fontSize: size * 0.42,
          letterSpacing: "-0.04em",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        JM
      </span>
    </div>
  );
}
