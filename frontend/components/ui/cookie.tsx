// Galleta dibujada con CSS (.cookie en globals.css): clásica, chocolate,
// rollo, pan, calabaza o dorada.
export function Cookie({ look = "", size }: { look?: string; size?: number }) {
  return <span className={`cookie ${look}`} style={size ? ({ "--s": `${size}px` } as React.CSSProperties) : undefined} aria-hidden="true" />
}
