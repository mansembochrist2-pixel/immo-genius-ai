/**
 * Animated cadastral grid — parcels light up like an isometric map.
 * Direct reference to real-estate (plot/zoning) without being a stock image.
 */
export function CadastralGrid({ className = "" }: { className?: string }) {
  const parcels = [
    { x: 1, y: 1, w: 2, h: 2, delay: 0, label: "PLU · ZH" },
    { x: 4, y: 1, w: 3, h: 1, delay: 0.6 },
    { x: 0, y: 4, w: 2, h: 3, delay: 1.2, label: "DPE A" },
    { x: 3, y: 3, w: 2, h: 2, delay: 1.8, hot: true, label: "Vendeur" },
    { x: 6, y: 2, w: 1, h: 3, delay: 2.4 },
    { x: 5, y: 5, w: 2, h: 2, delay: 3.0 },
    { x: 0, y: 0, w: 1, h: 1, delay: 3.6 },
  ];

  return (
    <div className={`relative w-full aspect-[4/3] ${className}`}>
      <svg viewBox="0 0 700 525" className="w-full h-full">
        <defs>
          <pattern id="cad-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="hsl(var(--border))" strokeWidth="0.6" />
          </pattern>
          <filter id="parcel-glow">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#cad-grid)" opacity="0.5" />

        {/* Roads */}
        <line x1="0" y1="200" x2="700" y2="200" stroke="hsl(var(--muted-foreground) / 0.35)" strokeWidth="2" strokeDasharray="8 4" />
        <line x1="350" y1="0" x2="350" y2="525" stroke="hsl(var(--muted-foreground) / 0.35)" strokeWidth="2" strokeDasharray="8 4" />

        {parcels.map((p, i) => {
          const color = p.hot ? "hsl(var(--accent))" : "hsl(var(--primary))";
          return (
            <g key={i} style={{ animation: `grid-pulse 4s ${p.delay}s ease-in-out infinite` }}>
              <rect
                x={p.x * 75 + 8}
                y={p.y * 60 + 8}
                width={p.w * 75 - 12}
                height={p.h * 60 - 12}
                rx="6"
                fill={color}
                fillOpacity="0.12"
                stroke={color}
                strokeWidth="1"
              />

              {p.label && (
                <text
                  x={p.x * 75 + 18}
                  y={p.y * 60 + 28}
                  fill="hsl(var(--foreground))"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                  opacity="0.85"
                >
                  {p.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Scanner sweep */}
        <line
          x1="0" y1="0" x2="700" y2="0"
          stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.4"
        >
          <animate attributeName="y1" values="0;525;0" dur="6s" repeatCount="indefinite" />
          <animate attributeName="y2" values="0;525;0" dur="6s" repeatCount="indefinite" />
        </line>
      </svg>
    </div>
  );
}
