interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = '', size = 40 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Vibrant gradient background */}
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="50%" stopColor="#764ba2" />
          <stop offset="100%" stopColor="#f093fb" />
        </linearGradient>
        
        {/* Glowing effect */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        {/* Neon gradient for elements */}
        <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f5ff" />
          <stop offset="100%" stopColor="#00ff9f" />
        </linearGradient>
      </defs>
      
      {/* Background with rounded corners */}
      <rect
        x="5"
        y="5"
        width="90"
        height="90"
        rx="22"
        fill="url(#bgGradient)"
      />
      
      {/* Animated-like rings (static representation) */}
      <circle
        cx="50"
        cy="50"
        r="35"
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="2"
      />
      <circle
        cx="50"
        cy="50"
        r="28"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="2"
      />
      
      {/* Central hexagon shape */}
      <path
        d="M50 25 L67 35 L67 55 L50 65 L33 55 L33 35 Z"
        fill="rgba(0,0,0,0.3)"
        stroke="url(#neonGradient)"
        strokeWidth="3"
        filter="url(#glow)"
      />
      
      {/* Inner code symbol - stylized </> */}
      <path
        d="M38 42 L32 50 L38 58"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M62 42 L68 50 L62 58"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="45"
        y1="60"
        x2="55"
        y2="40"
        stroke="#00f5ff"
        strokeWidth="4"
        strokeLinecap="round"
      />
      
      {/* Connection dots at corners */}
      <circle cx="50" cy="25" r="4" fill="#00ff9f" filter="url(#glow)" />
      <circle cx="67" cy="35" r="4" fill="#00f5ff" filter="url(#glow)" />
      <circle cx="67" cy="55" r="4" fill="#00ff9f" filter="url(#glow)" />
      <circle cx="50" cy="65" r="4" fill="#00f5ff" filter="url(#glow)" />
      <circle cx="33" cy="55" r="4" fill="#00ff9f" filter="url(#glow)" />
      <circle cx="33" cy="35" r="4" fill="#00f5ff" filter="url(#glow)" />
      
      {/* Connecting lines between dots */}
      <path
        d="M50 25 L67 35 L67 55 L50 65 L33 55 L33 35 Z"
        fill="none"
        stroke="url(#neonGradient)"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        opacity="0.6"
      />
    </svg>
  );
}

export function LogoWithText({ className = '', size = 40 }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Logo size={size} />
      <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
        ILLYUSTRATE
      </span>
    </div>
  );
}
