import { useId } from 'react';

/** Escena decorativa de paquetería; no representa un envío real. */
export function RouteArtwork({ className = '' }: { className?: string }) {
  const gridId = useId();
  return (
    <svg viewBox="0 0 520 380" fill="none" className={className} aria-hidden="true">
      <defs>
        <pattern id={gridId} width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#7395C6" fillOpacity=".2" />
        </pattern>
      </defs>
      <rect width="520" height="380" rx="28" fill={`url(#${gridId})`} />
      <circle cx="278" cy="193" r="148" fill="#1A3560" fillOpacity=".45" />
      <circle cx="278" cy="193" r="148" stroke="#507CF5" strokeOpacity=".25" strokeDasharray="5 9" />
      <path d="M44 292H112Q132 292 132 272V119Q132 99 152 99H402Q424 99 424 121V282" stroke="#507CF5" strokeWidth="3" strokeDasharray="7 9" />
      <path d="M48 319H478" stroke="#365075" strokeWidth="2" />
      {/* Camioneta de reparto */}
      <path d="M91 220a10 10 0 0 1 10-10h145v96H91v-86Z" fill="#507CF5" />
      <path d="M246 237h49l37 40v29h-86v-69Z" fill="#3256B0" />
      <path d="M258 246h32l23 27h-55v-27Z" fill="#101E34" />
      <rect x="105" y="226" width="65" height="7" rx="3.5" fill="#94B5FF" fillOpacity=".5" />
      <path d="m183 281 12-26 17 26" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="212" cy="281" r="4" fill="#FF7F4D" />
      <rect x="84" y="298" width="254" height="12" rx="4" fill="#233A5F" />
      <circle cx="130" cy="308" r="18" fill="#080F1E" stroke="#365075" strokeWidth="5" /><circle cx="130" cy="308" r="6" fill="#94B5FF" />
      <circle cx="292" cy="308" r="18" fill="#080F1E" stroke="#365075" strokeWidth="5" /><circle cx="292" cy="308" r="6" fill="#94B5FF" />
      {/* Paquetes apilados y cinta de embalaje */}
      <path d="m327 212 66-30 65 30-65 33-66-33Z" fill="#FF9A63" />
      <path d="M327 212v75l66 33v-75l-66-33Z" fill="#EA5B24" />
      <path d="m393 245 65-33v75l-65 33v-75Z" fill="#C83F16" />
      <path d="m351 201 66 32v25l17-9v-25l-66-31-17 8Z" fill="#FFD5A6" />
      <path d="m352 146 42-20 42 20-42 21-42-21Z" fill="#FFC08A" />
      <path d="M352 146v47l42 21v-47l-42-21Z" fill="#FF8746" />
      <path d="m394 167 42-21v47l-42 21v-47Z" fill="#E96328" />
      <path d="m368 138 42 21v16l11-5v-17l-42-20-11 5Z" fill="#FFE0BA" />
      <path d="m342 263 19 9m-19 0 12 6" stroke="#FFD5A6" strokeWidth="3" strokeLinecap="round" />
      {/* Pin de destino */}
      <path d="M264 66a28 28 0 0 1 28 28c0 21-28 43-28 43s-28-22-28-43a28 28 0 0 1 28-28Z" fill="#FF5A1F" /><circle cx="264" cy="94" r="9" fill="#0B1020" />
      <circle cx="48" cy="292" r="7" fill="#507CF5" />
    </svg>
  );
}
