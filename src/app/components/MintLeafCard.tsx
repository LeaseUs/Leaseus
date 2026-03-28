import { useEffect, useRef } from "react";

interface MintLeafCardProps {
  amount: number;
  qrToken: string;
  recipientName?: string;
  onDownload?: () => void;
}

interface CardConfig {
  gradient: [string, string];
  label: string;
  textColor: string;
}

const CARD_CONFIGS: Record<number, CardConfig> = {
  1:   { gradient: ["#c9f2d6", "#7fd3a4"], label: "ONE LEUS",           textColor: "#0b3d3b" },
  5:   { gradient: ["#d6f0f7", "#8ecae6"], label: "FIVE LEUS",          textColor: "#0b3d3b" },
  10:  { gradient: ["#d6f0f7", "#8ecae6"], label: "TEN LEUS",           textColor: "#0b3d3b" },
  25:  { gradient: ["#d9f5f2", "#6ec6c3"], label: "TWENTY FIVE LEUS",   textColor: "#0b3d3b" },
  50:  { gradient: ["#e8d5f5", "#b388e8"], label: "FIFTY LEUS",         textColor: "#1a0b3b" },
  100: { gradient: ["#d9f5f2", "#6ec6c3"], label: "ONE HUNDRED LEUS",   textColor: "#0b3d3b" },
};

const DEFAULT_CONFIG: CardConfig = {
  gradient: ["#d6f0f7", "#8ecae6"],
  label: "LEUS",
  textColor: "#0b3d3b",
};

// Simple QR-like pattern generator using canvas (deterministic from token)
function drawQR(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, token: string) {
  const modules = 10;
  const cell    = size / modules;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 4);
  ctx.fill();

  ctx.fillStyle = "#0b3d3b";

  // Deterministic pattern from token
  const hash = token.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      const seed = (hash * (row + 1) * (col + 1) * 7919) % 100;
      const filled = seed < 45
        || (row < 3 && col < 3)                              // top-left finder
        || (row < 3 && col >= modules - 3)                   // top-right finder
        || (row >= modules - 3 && col < 3);                  // bottom-left finder

      if (filled) {
        ctx.fillRect(x + col * cell + 1, y + row * cell + 1, cell - 1, cell - 1);
      }
    }
  }
}

function drawCard(
  canvas: HTMLCanvasElement,
  amount: number,
  qrToken: string,
  recipientName?: string,
) {
  const W = 700, H = 252;
  canvas.width  = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d")!;
  const cfg: CardConfig = CARD_CONFIGS[amount] ?? DEFAULT_CONFIG;

  // ── Background gradient ───────────────────────────────────────
  const grad = ctx.createLinearGradient(0, 0, W * 0.707, H * 0.707);
  grad.addColorStop(0, cfg.gradient[0]);
  grad.addColorStop(1, cfg.gradient[1]);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 22);
  ctx.fill();

  // ── Subtle inner glow ─────────────────────────────────────────
  const innerGrad = ctx.createRadialGradient(W * 0.3, H * 0.3, 0, W * 0.3, H * 0.3, W * 0.6);
  innerGrad.addColorStop(0, "rgba(255,255,255,0.35)");
  innerGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 22);
  ctx.fill();

  // ── Left section ──────────────────────────────────────────────
  const padL = 36;

  // "LeaseUs" brand top-left
  ctx.fillStyle = cfg.textColor;
  ctx.globalAlpha = 0.5;
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.fillText("LeaseUs", padL, 38);
  ctx.globalAlpha = 1;

  // Amount number
  ctx.fillStyle = cfg.textColor;
  ctx.font      = `bold 86px Arial, sans-serif`;
  ctx.fillText(String(amount), padL, 142);

  // "Ł" symbol
  ctx.font      = `bold 28px Arial, sans-serif`;
  ctx.globalAlpha = 0.7;
  ctx.fillText("Ł LEUS", padL, 175);
  ctx.globalAlpha = 1;

  // Label
  ctx.font      = "14px Arial, sans-serif";
  ctx.globalAlpha = 0.65;
  ctx.fillText(cfg.label, padL, 200);
  ctx.globalAlpha = 1;

  // Recipient name
  if (recipientName) {
    ctx.font      = "12px Arial, sans-serif";
    ctx.globalAlpha = 0.55;
    ctx.fillText(`For: ${recipientName}`, padL, 224);
    ctx.globalAlpha = 1;
  }

  // Token (small, bottom left)
  ctx.font      = "10px monospace";
  ctx.globalAlpha = 0.4;
  ctx.fillText(qrToken.slice(0, 20) + "...", padL, 242);
  ctx.globalAlpha = 1;

  // ── Right section ─────────────────────────────────────────────
  const rightX = W - 180;
  const rightCenter = rightX + 70;

  // QR code
  drawQR(ctx, rightX, 28, 100, qrToken);

  // Logo circle
  const logoY = 144;
  ctx.beginPath();
  ctx.arc(rightCenter, logoY, 44, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth   = 2;
  ctx.stroke();

  // "L" monogram
  ctx.fillStyle   = cfg.textColor;
  ctx.font        = "bold 32px Arial, sans-serif";
  ctx.textAlign   = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("L", rightCenter, logoY);
  ctx.textAlign    = "left";
  ctx.textBaseline = "alphabetic";

  // "MintLeaf" under logo
  ctx.font      = "11px Arial, sans-serif";
  ctx.globalAlpha = 0.6;
  ctx.textAlign   = "center";
  ctx.fillStyle   = cfg.textColor;
  ctx.fillText("MintLeaf", rightCenter, logoY + 58);
  ctx.globalAlpha = 1;
  ctx.textAlign   = "left";

  // ── Divider line ──────────────────────────────────────────────
  ctx.beginPath();
  ctx.moveTo(rightX - 24, 20);
  ctx.lineTo(rightX - 24, H - 20);
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth   = 1;
  ctx.stroke();
}

export function MintLeafCard({ amount, qrToken, recipientName, onDownload }: MintLeafCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      drawCard(canvasRef.current, amount, qrToken, recipientName);
    }
  }, [amount, qrToken, recipientName]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link    = document.createElement("a");
    link.download = `leus-${amount}-${qrToken.slice(0, 8)}.png`;
    link.href     = canvas.toDataURL("image/png");
    link.click();
    onDownload?.();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        style={{ width: "100%", maxWidth: 500, borderRadius: 16, boxShadow: "0 10px 25px rgba(0,0,0,0.12)" }}
      />
      <button
        onClick={handleDownload}
        className="w-full max-w-xs bg-[#1E3A8A] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#152d6b] transition-colors flex items-center justify-center gap-2"
      >
        ⬇ Download Card
      </button>
    </div>
  );
}

// ── Preview page showing all denominations ─────────────────────
export function MintLeafCardPreview() {
  const cards = [
    { amount: 1,   token: "demo-token-1-leus-abc123" },
    { amount: 10,  token: "demo-token-10-leus-def456" },
    { amount: 100, token: "demo-token-100-leus-ghi789" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4 gap-6">
      <h1 className="text-2xl font-bold text-[#1E3A8A]">LEUS Coin Cards</h1>
      <p className="text-sm text-gray-500 -mt-3">Preview of all denominations</p>
      {cards.map(c => (
        <MintLeafCard
          key={c.amount}
          amount={c.amount}
          qrToken={c.token}
          recipientName="Demo User"
        />
      ))}
    </div>
  );
}