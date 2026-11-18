import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

let initialized = false;

/** Mermaid 다이어그램 코드 → SVG (문서 본문용) */
export default function Mermaid({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (!initialized) {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });
      initialized = true;
    }
    const render = async () => {
      try {
        const { svg } = await mermaid.render(
          `mmd-${Math.random().toString(36).slice(2, 10)}`,
          code,
        );
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch (e: any) {
        if (!cancelled && ref.current) {
          ref.current.innerHTML = `<div class="mermaid-error">Mermaid 렌더링 실패:\n${String(
            e?.message || e,
          ).replace(/</g, '&lt;')}</div>`;
        }
      }
    };
    render();
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div className="mermaid-block" role="img" aria-label="Mermaid 다이어그램">
      <div ref={ref} />
    </div>
  );
}
