interface ZebraPatternProps {
  opacity?: number;
  className?: string;
}

export function ZebraPattern({ opacity = 0.05, className = "" }: ZebraPatternProps) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`} style={{ opacity }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="zebra-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            {/* Diagonal zebra stripes */}
            <path d="M0 0 L100 100 M-25 25 L25 75 M75 -25 L125 25" 
              stroke="currentColor" 
              strokeWidth="15" 
              fill="none"
              opacity="0.8"
            />
            <path d="M25 0 L100 75 M0 50 L50 100 M50 -25 L100 25" 
              stroke="currentColor" 
              strokeWidth="8" 
              fill="none"
              opacity="0.5"
            />
            <path d="M10 0 L60 50 M40 0 L90 50 M0 10 L50 60 M0 40 L50 90" 
              stroke="currentColor" 
              strokeWidth="3" 
              fill="none"
              opacity="0.3"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#zebra-pattern)" />
      </svg>
    </div>
  );
}
