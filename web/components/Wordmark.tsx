import { Sparkle } from "./Sparkle";

// 3D extruded "wtfmedia" wordmark — wtf in WTF brand colours, media in ink.
export function Wordmark({
  className = "",
  size = "text-7xl sm:text-8xl",
  withSparkles = true,
}: {
  className?: string;
  size?: string;
  withSparkles?: boolean;
}) {
  return (
    <div className={`relative inline-block ${className}`}>
      {withSparkles && (
        <>
          <Sparkle
            className="absolute -left-6 -top-3 animate-twinkle"
            size={26}
          />
          <Sparkle
            className="absolute -right-4 top-1/2 animate-twinkle"
            size={18}
            color="#C53B3A"
          />
        </>
      )}
      <span className={`extrude ${size} select-none`}>
        <span style={{ color: "#C53B3A" }}>w</span>
        <span style={{ color: "#1A1A1A" }}>t</span>
        <span style={{ color: "#0C9367" }}>f</span>
        <span style={{ color: "#FFF6EA" }}>media</span>
      </span>
    </div>
  );
}

// Small inline lockup for nav/headers
export function WordmarkMini({ className = "" }: { className?: string }) {
  return (
    <span className={`extrude extrude-sm text-2xl select-none ${className}`}>
      <span style={{ color: "#C53B3A" }}>w</span>
      <span style={{ color: "#1A1A1A" }}>t</span>
      <span style={{ color: "#0C9367" }}>f</span>
      <span style={{ color: "#FFF6EA", WebkitTextStroke: "0" }}>media</span>
    </span>
  );
}
