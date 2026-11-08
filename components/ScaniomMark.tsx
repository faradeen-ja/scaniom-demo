import type { CSSProperties } from "react";

type ScaniomMarkProps = {
  size?: number;
  label?: boolean;
  className?: string;
};

export function ScaniomMark({ size = 24, label = false, className = "" }: ScaniomMarkProps) {
  const style = { "--mark-size": `${size}px` } as CSSProperties;

  return (
    <span className={`scaniom-mark-wrap ${className}`.trim()} style={style} aria-label={label ? "Scaniom" : undefined}>
      <span className="scaniom-mark" aria-hidden="true">
        <span className="scaniom-mark-orbit orbit-one" />
        <span className="scaniom-mark-orbit orbit-two" />
        <span className="scaniom-mark-orbit orbit-three" />
        <span className="scaniom-mark-core" />
      </span>
      {label ? <span className="scaniom-wordmark">SCANIOM</span> : null}
    </span>
  );
}
