/**
 * Animated isometric blueprint of a building.
 * Performance-optimized: no SVG filter on animated groups,
 * no box-shadow animation, no spin on the heavy group.
 */
export function BlueprintBuilding({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative ${className}`}
      style={{ contain: "layout paint", willChange: "transform" }}
    >
      {/* Static glow base — no animation (was box-shadow pulse = paint storm) */}
      <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-primary/15 via-primary/5 to-transparent blur-3xl" />

      <svg
        viewBox="0 0 600 600"
        className="relative w-full h-full"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="0.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <defs>
          <linearGradient id="floor-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="line-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(217 100% 75%)" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(217 91% 50%)" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Subtle ground grid */}
        <g opacity="0.18">
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={`gx-${i}`} x1={0} y1={420 + i * 12} x2={600} y2={420 + i * 12 - 80} />
          ))}
          {Array.from({ length: 18 }).map((_, i) => (
            <line key={`gy-${i}`} x1={40 + i * 30} y1={420} x2={40 + i * 30 - 80} y2={540} />
          ))}
        </g>

        {/* Building group — STATIC (no rotation, no filter). Floors draw once on mount. */}
        <g>
          {Array.from({ length: 9 }).map((_, i) => {
            const y = 380 - i * 32;
            const fill = i === 6 ? "url(#floor-gradient)" : "transparent";
            return (
              <g key={i} stroke="url(#line-gradient)">
                <polygon
                  points={`200,${y} 380,${y - 50} 480,${y} 300,${y + 50}`}
                  fill={fill}
                  strokeDasharray="1200"
                  strokeDashoffset="1200"
                  style={{ animation: `blueprint-draw 3s ${i * 0.1}s ease-out forwards` }}
                />
                <polygon
                  points={`480,${y} 480,${y + 28} 300,${y + 78} 300,${y + 50}`}
                  fill="hsl(var(--primary) / 0.04)"
                />
                <polygon
                  points={`200,${y} 300,${y + 50} 300,${y + 78} 200,${y + 28}`}
                  fill="hsl(var(--primary) / 0.08)"
                />
              </g>
            );
          })}

          {/* Antenna with a tiny pulse — cheap, just radius */}
          <line x1="340" y1="100" x2="340" y2="50" stroke="hsl(217 100% 75%)" strokeWidth="1" />
          <circle cx="340" cy="48" r="3" fill="hsl(217 100% 75%)">
            <animate attributeName="r" values="2;4;2" dur="3s" repeatCount="indefinite" />
          </circle>
        </g>
      </svg>

      {/* Floating glass info-cards — float animation uses transform only (GPU-cheap) */}
      <div
        className="absolute top-[22%] -left-2 sm:left-4 glass-card rounded-2xl px-4 py-3 shadow-xl animate-float"
        style={{ animationDelay: "0s", willChange: "transform" }}
      >
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Score quartier</div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-display font-semibold text-foreground">92</span>
          <span className="text-xs text-success">+8 pts</span>
        </div>
      </div>

      <div
        className="absolute bottom-[18%] -right-2 sm:right-4 glass-card rounded-2xl px-4 py-3 shadow-xl animate-float"
        style={{ animationDelay: "1.5s", willChange: "transform" }}
      >
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Vendeur détecté</div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="text-sm font-medium">Mandat exclusif probable</span>
        </div>
      </div>

      <div
        className="absolute top-[55%] right-[8%] glass-card rounded-2xl px-4 py-3 shadow-xl animate-float hidden md:block"
        style={{ animationDelay: "3s", willChange: "transform" }}
      >
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">DVF · 12 mois</div>
        <div className="text-sm font-medium">4 380 €/m² · <span className="text-primary">+5,2%</span></div>
      </div>
    </div>
  );
}
