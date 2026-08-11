type IconProps = { className?: string };

function base(props: IconProps) {
  return {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: props.className,
  };
}

export const Icons = {
  inicio: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  ),
  pos: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 7h16l-1.2 12.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 7Z" />
      <path d="M8.5 10V6a3.5 3.5 0 0 1 7 0v4" />
    </svg>
  ),
  comandas: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M6 2.8h12V21l-2.4-1.6L13.2 21l-2.4-1.6L8.4 21 6 19.4V2.8Z" />
      <path d="M9 7.5h6M9 11h6M9 14.5h3.5" />
    </svg>
  ),
  inventario: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16V8Z" />
      <path d="M3.5 8 12 12.5 20.5 8" />
      <path d="M12 12.5v8" />
    </svg>
  ),
  productos: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M20.6 13.3 13.3 20.6a2 2 0 0 1-2.8 0l-7-7A2 2 0 0 1 3 12.2V5a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6l7 7a2 2 0 0 1 0 2.7Z" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  reportes: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8.5 16v-5M13 16V7.5M17.5 16v-3" />
    </svg>
  ),
  clientes: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3.5 3.5 0 0 1 0 6.4" />
      <path d="M17.5 14.6a5.5 5.5 0 0 1 3 4.9" />
    </svg>
  ),
  corte: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6.2 9.5h.01M17.8 14.5h.01" />
    </svg>
  ),
  ajustes: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 7.5h10M18.5 7.5H20M4 16.5h1.5M10 16.5h10" />
      <circle cx="16" cy="7.5" r="2.2" />
      <circle cx="7.5" cy="16.5" r="2.2" />
    </svg>
  ),
  reset: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 10a8 8 0 1 1 2.3 6.3" />
      <path d="M4 15v-5h5" />
    </svg>
  ),
  help: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.3a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.1.9-1.1 1.8" />
      <path d="M12 17h.01" strokeWidth="2.4" />
    </svg>
  ),
  star: (p: IconProps) => (
    <svg {...base(p)} fill="currentColor" stroke="none">
      <path d="m12 2.8 2.8 5.8 6.4.9-4.6 4.4 1.1 6.3L12 17.2l-5.7 3 1.1-6.3L2.8 9.5l6.4-.9L12 2.8Z" />
    </svg>
  ),
  menu: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  ),
  leaf: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M5 19C5 9 12 4 20 4c0 8-5 15-15 15Z" />
      <path d="M5 19c3-6 7-9 11-11" />
    </svg>
  ),
};

export type IconName = keyof typeof Icons;
