import type { SVGProps } from "react";

// Vietnam flag — red field with centered yellow star
export function FlagVN(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 30 20" {...props}>
      <rect width="30" height="20" fill="#DA251D" />
      <polygon
        points="15,4 16.76,9.42 22.46,9.42 17.85,12.76 19.61,18.18 15,14.84 10.39,18.18 12.15,12.76 7.54,9.42 13.24,9.42"
        fill="#FFFF00"
      />
    </svg>
  );
}

// United Kingdom flag — Union Jack (used to represent English)
export function FlagGB(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 60 30" {...props}>
      <clipPath id="flag-gb-clip">
        <rect width="60" height="30" />
      </clipPath>
      <g clipPath="url(#flag-gb-clip)">
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path
          d="M0,0 L60,30 M60,0 L0,30"
          clipPath="url(#flag-gb-clip)"
          stroke="#C8102E"
          strokeWidth="4"
        />
        <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}
