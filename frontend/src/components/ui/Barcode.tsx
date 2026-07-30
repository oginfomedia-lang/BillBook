import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeProps {
  value: string;
  height?: number;
  width?: number;
  fontSize?: number;
  displayValue?: boolean;
  className?: string;
}

export function Barcode({
  value,
  height = 40,
  width = 1.4,
  fontSize = 11,
  displayValue = false,
  className,
}: BarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        height,
        width,
        fontSize,
        displayValue,
        margin: 0,
      });
    } catch {
      // CODE128 can't encode a handful of exotic characters -- leave the
      // SVG empty rather than crashing the page over a bad barcode value.
    }
  }, [value, height, width, fontSize, displayValue]);

  if (!value) return null;

  return <svg ref={svgRef} className={className} />;
}
