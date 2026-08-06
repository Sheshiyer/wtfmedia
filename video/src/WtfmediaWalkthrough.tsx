import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const COLORS = {
  cream: "#FFF6EA",
  ink: "#1A1A1A",
  red: "#C53B3A",
  green: "#0C9367",
  yellow: "#F1B333",
  purple: "#6758A5",
  blue: "#2D6BE0",
  orange: "#F07633",
  white: "#FFFFFF",
};

const DISPLAY =
  '"Bricolage Grotesque", "Arial Black", "Impact", system-ui, sans-serif';
const SERIF = '"Fraunces", "Georgia", serif';
const BODY = '"Poppins", "Inter", system-ui, sans-serif';
const ease = Easing.bezier(0.16, 1, 0.3, 1);

const sceneDurations = {
  intro: 120,
  controlRoom: 180,
  library: 210,
  connections: 180,
  ask: 240,
  crew: 180,
  outro: 120,
};

export const TOTAL_FRAMES = Object.values(sceneDurations).reduce(
  (sum, duration) => sum + duration,
  0,
);

type SceneProps = {
  duration: number;
};

type PillProps = {
  children: React.ReactNode;
  color?: string;
  textColor?: string;
  borderColor?: string;
};

type CardProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
};

type LabelProps = {
  children: React.ReactNode;
  color?: string;
};

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const appear = (frame: number, start: number, duration = 18) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    ...clamp,
    easing: ease,
  });

const exit = (frame: number, duration: number) =>
  interpolate(frame, [duration - 20, duration], [1, 0], {
    ...clamp,
    easing: Easing.bezier(0.7, 0, 0.84, 0),
  });

const rise = (frame: number, start: number, amount = 28) =>
  interpolate(frame, [start, start + 24], [amount, 0], {
    ...clamp,
    easing: ease,
  });

const image = (name: string) => staticFile(`brand/${name}.png`);

function sceneMotion(frame: number, duration: number): React.CSSProperties {
  const opacity = Math.min(appear(frame, 0, 16), exit(frame, duration));
  const y = rise(frame, 0, 24);
  const scale = interpolate(frame, [0, duration], [1.01, 1], clamp);

  return {
    opacity,
    transform: `translateY(${y}px) scale(${scale})`,
  };
}

function Texture() {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.cream,
        backgroundImage: `radial-gradient(#e7dcc7 1.4px, transparent 1.5px)`,
        backgroundSize: "16px 16px",
      }}
    >
      <AbsoluteFill
        style={{
          opacity: 0.035,
          backgroundImage:
            "linear-gradient(120deg, rgba(26,26,26,0.16) 0, transparent 34%, rgba(103,88,165,0.2) 68%, transparent 100%)",
        }}
      />
    </AbsoluteFill>
  );
}

function Wordmark({ size = 110 }: { size?: number }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        fontFamily: DISPLAY,
        fontSize: size,
        fontWeight: 900,
        lineHeight: 0.85,
        letterSpacing: 0,
        textTransform: "lowercase",
        textShadow:
          "1px 1px 0 #1A1A1A, 2px 2px 0 #1A1A1A, 3px 3px 0 #1A1A1A, 4px 4px 0 #1A1A1A, 5px 5px 0 #1A1A1A, 8px 8px 18px rgba(0,0,0,0.24)",
      }}
    >
      <span style={{ color: COLORS.red }}>w</span>
      <span style={{ color: COLORS.ink }}>t</span>
      <span style={{ color: COLORS.green }}>f</span>
      <span
        style={{
          color: COLORS.cream,
          WebkitTextStroke: "1.5px #1A1A1A",
        }}
      >
        media
      </span>
    </div>
  );
}

function Star({
  frame,
  size = 38,
  color = COLORS.yellow,
  style,
}: {
  frame: number;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}) {
  const scale = interpolate(
    Math.sin(frame / 10),
    [-1, 1],
    [0.8, 1.12],
    clamp,
  );
  const rotate = frame * 1.5;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{
        position: "absolute",
        overflow: "visible",
        transform: `scale(${scale}) rotate(${rotate}deg)`,
        ...style,
      }}
    >
      <path
        d="M32 3 39 24 61 32 39 40 32 61 24 40 3 32 24 24Z"
        fill={color}
        stroke={COLORS.ink}
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Pill({
  children,
  color = COLORS.white,
  textColor = COLORS.ink,
  borderColor = COLORS.ink,
}: PillProps) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        borderRadius: 999,
        border: `2px solid ${borderColor}`,
        background: color,
        color: textColor,
        padding: "10px 18px",
        fontFamily: SERIF,
        fontSize: 22,
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

function Chip({ children, color = COLORS.yellow }: LabelProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: `2px solid ${COLORS.ink}`,
        borderRadius: 999,
        background: color,
        color: color === COLORS.ink ? COLORS.cream : COLORS.ink,
        fontFamily: DISPLAY,
        fontWeight: 800,
        fontSize: 13,
        letterSpacing: 0,
        textTransform: "uppercase",
        padding: "5px 10px",
      }}
    >
      {children}
    </span>
  );
}

function Card({ children, style }: CardProps) {
  return (
    <div
      style={{
        border: `3px solid ${COLORS.ink}`,
        borderRadius: 18,
        background: COLORS.white,
        boxShadow: `8px 8px 0 ${COLORS.ink}`,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function BrowserFrame({
  children,
  title,
  style,
}: CardProps & { title: string }) {
  return (
    <Card style={{ background: COLORS.cream, ...style }}>
      <div
        style={{
          height: 44,
          borderBottom: `3px solid ${COLORS.ink}`,
          background: COLORS.white,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 18px",
        }}
      >
        {[COLORS.red, COLORS.yellow, COLORS.green].map((color) => (
          <span
            key={color}
            style={{
              width: 13,
              height: 13,
              borderRadius: 999,
              background: color,
              border: `2px solid ${COLORS.ink}`,
            }}
          />
        ))}
        <div
          style={{
            marginLeft: 10,
            fontFamily: BODY,
            fontWeight: 700,
            fontSize: 14,
            color: "rgba(26,26,26,0.58)",
          }}
        >
          {title}
        </div>
      </div>
      <div style={{ position: "relative", height: "calc(100% - 44px)" }}>
        {children}
      </div>
    </Card>
  );
}

function SceneHeading({
  eyebrow,
  title,
  body,
  maxWidth = 560,
}: {
  eyebrow: string;
  title: string;
  body: string;
  maxWidth?: number;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: 16,
          letterSpacing: 0,
          textTransform: "uppercase",
          color: "rgba(26,26,26,0.52)",
          marginBottom: 14,
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          margin: 0,
          fontFamily: SERIF,
          fontWeight: 650,
          fontSize: 56,
          lineHeight: 0.96,
          maxWidth,
          color: COLORS.ink,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          marginTop: 22,
          marginBottom: 0,
          fontFamily: BODY,
          fontSize: 24,
          lineHeight: 1.35,
          color: "rgba(26,26,26,0.68)",
          maxWidth,
        }}
      >
        {body}
      </p>
    </div>
  );
}

function IntroScene({ duration }: SceneProps) {
  const frame = useCurrentFrame();
  const motion = sceneMotion(frame, duration);
  const imageOpacity = interpolate(frame, [20, 58], [0, 0.35], clamp);
  const imageScale = interpolate(frame, [0, duration], [1.08, 1], clamp);

  return (
    <AbsoluteFill style={{ ...motion }}>
      <Texture />
      <Img
        src={image("readme-banner")}
        style={{
          position: "absolute",
          inset: "38px 48px auto auto",
          width: 530,
          height: 298,
          objectFit: "cover",
          opacity: imageOpacity,
          border: `3px solid ${COLORS.ink}`,
          boxShadow: `9px 9px 0 ${COLORS.ink}`,
          transform: `rotate(2deg) scale(${imageScale})`,
        }}
      />
      <Star frame={frame} style={{ left: 108, top: 80 }} />
      <Star
        frame={frame + 25}
        size={26}
        color={COLORS.red}
        style={{ right: 128, bottom: 108 }}
      />
      <div
        style={{
          position: "absolute",
          left: 78,
          top: 116,
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        <div
          style={{
            opacity: appear(frame, 6, 18),
            transform: `translateY(${rise(frame, 6, 24)}px)`,
          }}
        >
          <Wordmark size={128} />
        </div>
        <div
          style={{
            opacity: appear(frame, 30, 18),
            transform: `translateY(${rise(frame, 30, 18)}px)`,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontFamily: SERIF,
              fontSize: 64,
              lineHeight: 0.98,
              fontWeight: 650,
              maxWidth: 720,
            }}
          >
            the WTF catalogue,
            <br />
            now with a memory.
          </h1>
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            opacity: appear(frame, 52, 18),
            transform: `translateY(${rise(frame, 52, 16)}px)`,
          }}
        >
          <Pill color={COLORS.ink} textColor={COLORS.cream}>
            ask anything
          </Pill>
          <Pill color={COLORS.yellow}>cited to the second</Pill>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 78,
          bottom: 66,
          fontFamily: BODY,
          fontSize: 22,
          color: "rgba(26,26,26,0.62)",
          opacity: appear(frame, 70, 18),
        }}
      >
        intro and walkthrough of the full research flow
      </div>
    </AbsoluteFill>
  );
}

function ControlRoomScene({ duration }: SceneProps) {
  const frame = useCurrentFrame();
  const motion = sceneMotion(frame, duration);
  const cursorX = interpolate(frame, [55, 110, 150], [826, 985, 760], clamp);
  const cursorY = interpolate(frame, [55, 110, 150], [470, 530, 530], clamp);

  return (
    <AbsoluteFill style={{ ...motion }}>
      <Texture />
      <div
        style={{
          position: "absolute",
          left: 64,
          top: 76,
          opacity: appear(frame, 0),
          transform: `translateY(${rise(frame, 0)}px)`,
        }}
      >
        <SceneHeading
          eyebrow="01 / control room"
          title="start at the brand surface"
          body="The first decision is simple: ask the catalogue, browse the library, or open the connection map."
        />
      </div>
      <BrowserFrame
        title="wtfmedia · home"
        style={{
          position: "absolute",
          right: 58,
          top: 76,
          width: 596,
          height: 520,
          opacity: appear(frame, 20),
          transform: `translateY(${rise(frame, 20, 30)}px)`,
        }}
      >
        <Img
          src={image("control-room")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 30,
            top: 60,
            opacity: 0.96,
          }}
        >
          <Wordmark size={48} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 30,
            bottom: 60,
            display: "flex",
            gap: 12,
            opacity: appear(frame, 46),
          }}
        >
          <Pill color={COLORS.ink} textColor={COLORS.cream}>
            Ask the catalogue
          </Pill>
          <Pill>Browse episodes</Pill>
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 38,
            borderTop: `3px solid ${COLORS.ink}`,
            background: COLORS.yellow,
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 18,
            display: "flex",
            alignItems: "center",
            gap: 28,
            paddingLeft: 26,
            whiteSpace: "nowrap",
            transform: `translateX(${interpolate(frame, [0, duration], [0, -210])}px)`,
          }}
        >
          <span>ask wtf anything</span>
          <span>Elon Musk</span>
          <span>Sam Altman</span>
          <span>cited to the second</span>
          <span>browse episodes</span>
        </div>
      </BrowserFrame>

      <div
        style={{
          position: "absolute",
          left: cursorX,
          top: cursorY,
          width: 0,
          height: 0,
          borderLeft: `18px solid ${COLORS.red}`,
          borderTop: "10px solid transparent",
          borderBottom: "10px solid transparent",
          filter: "drop-shadow(3px 3px 0 #1A1A1A)",
          opacity: appear(frame, 58, 14),
          transform: "rotate(36deg)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 64,
          bottom: 82,
          display: "flex",
          gap: 16,
          opacity: appear(frame, 76),
        }}
      >
        <FlowStep n="1" label="ask" active={frame > 72} />
        <FlowStep n="2" label="browse" active={frame > 105} />
        <FlowStep n="3" label="connect" active={frame > 136} />
      </div>
    </AbsoluteFill>
  );
}

function FlowStep({
  n,
  label,
  active,
}: {
  n: string;
  label: string;
  active: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 16px",
        border: `3px solid ${COLORS.ink}`,
        borderRadius: 14,
        background: active ? COLORS.yellow : COLORS.white,
        boxShadow: active ? `5px 5px 0 ${COLORS.ink}` : "none",
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          border: `2px solid ${COLORS.ink}`,
          background: active ? COLORS.ink : COLORS.cream,
          color: active ? COLORS.cream : COLORS.ink,
          display: "grid",
          placeItems: "center",
          fontFamily: DISPLAY,
          fontWeight: 900,
        }}
      >
        {n}
      </span>
      <span
        style={{
          fontFamily: DISPLAY,
          fontSize: 21,
          fontWeight: 850,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
}

const episodeCards = [
  { title: "AI, India and the next platform shift", show: "WTF is", color: COLORS.purple },
  { title: "Building companies with receipts", show: "People by WTF", color: COLORS.green },
  { title: "Markets, memory and media", show: "WTF with Nikhil", color: COLORS.red },
];

function LibraryScene({ duration }: SceneProps) {
  const frame = useCurrentFrame();
  const motion = sceneMotion(frame, duration);
  const drawer = interpolate(frame, [102, 140], [390, 0], {
    ...clamp,
    easing: ease,
  });

  return (
    <AbsoluteFill style={{ ...motion }}>
      <Texture />
      <div
        style={{
          position: "absolute",
          left: 58,
          top: 62,
          opacity: appear(frame, 0),
        }}
      >
        <SceneHeading
          eyebrow="02 / library"
          title="open an episode and jump to a moment"
          body="Rows of real conversations become a transcript drawer with timestamped lines, then one click turns the episode into a question."
          maxWidth={444}
        />
      </div>

      <BrowserFrame
        title="wtfmedia · episodes"
        style={{
          position: "absolute",
          right: 58,
          top: 62,
          width: 650,
          height: 570,
          opacity: appear(frame, 18),
        }}
      >
        <Img
          src={image("contact-sheet")}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.26,
          }}
        />
        <div
          style={{
            padding: 26,
            display: "flex",
            flexDirection: "column",
            gap: 18,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h3
              style={{
                margin: 0,
                fontFamily: DISPLAY,
                fontWeight: 900,
                fontSize: 40,
              }}
            >
              every episode
            </h3>
            <Chip color={COLORS.yellow}>53 conversations</Chip>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {episodeCards.map((card, index) => {
              const selected = frame > 76 && index === 1;
              return (
                <div
                  key={card.title}
                  style={{
                    width: 172,
                    height: 220,
                    border: `3px solid ${COLORS.ink}`,
                    borderRadius: 16,
                    background: COLORS.white,
                    overflow: "hidden",
                    boxShadow: selected
                      ? `9px 9px 0 ${COLORS.ink}`
                      : `4px 4px 0 ${COLORS.ink}`,
                    transform: `translateY(${selected ? -14 : index % 2 ? 12 : 0}px)`,
                    opacity: appear(frame, 28 + index * 10),
                  }}
                >
                  <div
                    style={{
                      height: 94,
                      background: card.color,
                      borderBottom: `3px solid ${COLORS.ink}`,
                      display: "grid",
                      placeItems: "center",
                      color: COLORS.cream,
                      fontFamily: DISPLAY,
                      fontSize: 34,
                      fontWeight: 900,
                    }}
                  >
                    WTF
                  </div>
                  <div style={{ padding: 13 }}>
                    <Chip color={COLORS.cream}>{card.show}</Chip>
                    <div
                      style={{
                        marginTop: 12,
                        fontFamily: BODY,
                        fontWeight: 700,
                        fontSize: 15,
                        lineHeight: 1.25,
                      }}
                    >
                      {card.title}
                    </div>
                    <div
                      style={{
                        marginTop: 14,
                        fontFamily: DISPLAY,
                        fontSize: 13,
                        color: COLORS.purple,
                      }}
                    >
                      open transcript
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            right: 0,
            top: 44,
            width: 382,
            bottom: 0,
            background: COLORS.cream,
            borderLeft: `3px solid ${COLORS.ink}`,
            transform: `translateX(${drawer}px)`,
            boxShadow: `-8px 0 0 rgba(26,26,26,0.18)`,
            padding: 22,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Chip color={COLORS.yellow}>transcript</Chip>
            <Chip color={COLORS.red}>close</Chip>
          </div>
          <h3
            style={{
              fontFamily: SERIF,
              fontSize: 24,
              lineHeight: 1.15,
              margin: "18px 0 16px",
            }}
          >
            Building companies with receipts
          </h3>
          <TranscriptLine time="2:14" text="India is not just a market. It is a context." />
          <TranscriptLine time="18:42" text="The company only works if the evidence loop works." />
          <TranscriptLine time="47:09" text="Ask the catalogue where this pattern repeats." />
          <div style={{ marginTop: 20 }}>
            <Pill color={COLORS.ink} textColor={COLORS.cream}>
              Ask about this episode
            </Pill>
          </div>
        </div>
      </BrowserFrame>
    </AbsoluteFill>
  );
}

function TranscriptLine({ time, text }: { time: string; text: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "10px 0",
        borderBottom: "2px solid rgba(26,26,26,0.1)",
        fontFamily: BODY,
        fontSize: 15,
        lineHeight: 1.3,
      }}
    >
      <span
        style={{
          flex: "0 0 auto",
          background: COLORS.yellow,
          border: `2px solid ${COLORS.ink}`,
          borderRadius: 7,
          fontFamily: DISPLAY,
          fontSize: 13,
          padding: "3px 6px",
          height: 25,
        }}
      >
        {time}
      </span>
      <span>{text}</span>
    </div>
  );
}

const graphNodes = [
  { x: 386, y: 180, r: 42, label: "AI", color: COLORS.purple },
  { x: 518, y: 130, r: 32, label: "India", color: COLORS.yellow },
  { x: 592, y: 252, r: 38, label: "Capital", color: COLORS.green },
  { x: 444, y: 336, r: 30, label: "Media", color: COLORS.blue },
  { x: 266, y: 292, r: 34, label: "Society", color: COLORS.red },
  { x: 250, y: 118, r: 26, label: "Startups", color: COLORS.orange },
];

const graphEdges = [
  [0, 1, 5],
  [0, 2, 4],
  [1, 2, 3],
  [0, 3, 3],
  [1, 4, 4],
  [2, 5, 2],
  [4, 3, 2],
  [5, 0, 3],
];

function ConnectionsScene({ duration }: SceneProps) {
  const frame = useCurrentFrame();
  const motion = sceneMotion(frame, duration);
  const pulse = interpolate(Math.sin(frame / 12), [-1, 1], [0.9, 1.07], clamp);

  return (
    <AbsoluteFill style={{ ...motion }}>
      <Texture />
      <div
        style={{
          position: "absolute",
          left: 64,
          top: 78,
          opacity: appear(frame, 0),
        }}
      >
        <SceneHeading
          eyebrow="03 / connections"
          title="see what keeps coming back"
          body="The graph surfaces people, companies and themes that recur across the catalogue, then lets the team ask how they relate."
          maxWidth={444}
        />
      </div>
      <BrowserFrame
        title="wtfmedia · connections"
        style={{
          position: "absolute",
          right: 58,
          top: 62,
          width: 682,
          height: 568,
          opacity: appear(frame, 18),
        }}
      >
        <Img
          src={image("flow-diagram")}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.18,
          }}
        />
        <svg
          width="682"
          height="524"
          viewBox="0 0 682 524"
          style={{ position: "absolute", left: 0, top: 0 }}
        >
          {graphEdges.map(([a, b, strength], index) => {
            const start = graphNodes[a];
            const end = graphNodes[b];
            const visible = appear(frame, 42 + index * 4, 14);
            return (
              <line
                key={`${a}-${b}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={COLORS.ink}
                strokeOpacity={0.18 + visible * 0.42}
                strokeWidth={strength}
              />
            );
          })}
          {graphNodes.map((node, index) => {
            const visible = appear(frame, 28 + index * 7, 16);
            const isAi = node.label === "AI";
            return (
              <g
                key={node.label}
                opacity={visible}
                transform={`translate(${node.x} ${node.y}) scale(${isAi ? pulse : 1})`}
              >
                <circle
                  r={node.r}
                  fill={node.color}
                  stroke={COLORS.ink}
                  strokeWidth="3"
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontFamily={DISPLAY}
                  fontWeight="900"
                  fontSize={node.label.length > 6 ? 15 : 19}
                  fill={node.color === COLORS.yellow ? COLORS.ink : COLORS.cream}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
        <div
          style={{
            position: "absolute",
            left: 26,
            bottom: 26,
            display: "flex",
            gap: 10,
            opacity: appear(frame, 100),
          }}
        >
          <Chip color={COLORS.white}>20+ episodes</Chip>
          <Chip color={COLORS.yellow}>category overlaps</Chip>
          <Chip color={COLORS.green}>strongest links</Chip>
        </div>
      </BrowserFrame>
      <div
        style={{
          position: "absolute",
          left: 64,
          bottom: 86,
          display: "flex",
          gap: 12,
          opacity: appear(frame, 94),
        }}
      >
        <Pill color={COLORS.ink} textColor={COLORS.cream}>
          Ask how these connect
        </Pill>
        <Pill>Browse episodes</Pill>
      </div>
    </AbsoluteFill>
  );
}

function AskScene({ duration }: SceneProps) {
  const frame = useCurrentFrame();
  const motion = sceneMotion(frame, duration);
  const prompt = "Where do AI and India overlap, and in which conversations?";
  const answer =
    "AI and India overlap around infrastructure, sovereignty, talent and capital. The same thread returns through builders, policymakers and investors. [1] [2]";
  const promptText = prompt.slice(0, Math.floor(Math.max(0, frame - 45) * 1.35));
  const answerText = answer.slice(0, Math.floor(Math.max(0, frame - 96) * 1.7));

  return (
    <AbsoluteFill style={{ ...motion }}>
      <Texture />
      <div
        style={{
          position: "absolute",
          left: 58,
          top: 60,
          opacity: appear(frame, 0),
        }}
      >
        <SceneHeading
          eyebrow="04 / ask wtf"
          title="ask once, get the answer with receipts"
          body="Fast mode streams a grounded RAG answer. Citations become deep links to the exact second in the original episode."
          maxWidth={430}
        />
      </div>
      <BrowserFrame
        title="wtfmedia · ask wtf"
        style={{
          position: "absolute",
          right: 58,
          top: 60,
          width: 704,
          height: 600,
          opacity: appear(frame, 18),
        }}
      >
        <Img
          src={image("ask-wtf")}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.07,
          }}
        />
        <div style={{ padding: 28 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontFamily: DISPLAY,
                  fontSize: 38,
                  fontWeight: 900,
                }}
              >
                ask <span style={{ color: COLORS.red }}>wtf</span> anything
              </h3>
              <div
                style={{
                  marginTop: 7,
                  fontFamily: BODY,
                  fontSize: 13,
                  color: "rgba(26,26,26,0.56)",
                }}
              >
                retrieval nv-embedqa-e5-v5 · 1,422 chunks
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Chip color={COLORS.ink}>fast</Chip>
              <Chip color={COLORS.white}>crew</Chip>
            </div>
          </div>

          <div
            style={{
              marginTop: 26,
              border: `3px solid ${COLORS.ink}`,
              borderRadius: 18,
              background: COLORS.cream,
              minHeight: 296,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <ChatBubble role="user" text={promptText} />
            <ChatBubble role="assistant" text={answerText} />
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 9,
                opacity: appear(frame, 194),
              }}
            >
              <SourcePill n="1" title="Sam Altman episode" time="18:42" />
              <SourcePill n="2" title="Dario Amodei episode" time="47:09" />
              <SourcePill n="3" title="India + AI roundtable" time="1:05:12" />
            </div>
          </div>

        </div>
      </BrowserFrame>
    </AbsoluteFill>
  );
}

function ChatBubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  const assistant = role === "assistant";
  return (
    <div
      style={{
        alignSelf: assistant ? "flex-start" : "flex-end",
        maxWidth: assistant ? "88%" : "78%",
        minHeight: 54,
        border: assistant ? `3px solid ${COLORS.ink}` : "none",
        borderRadius: 18,
        background: assistant ? COLORS.white : COLORS.ink,
        color: assistant ? COLORS.ink : COLORS.cream,
        boxShadow: assistant ? `5px 5px 0 ${COLORS.ink}` : "none",
        padding: "14px 16px",
        fontFamily: BODY,
        fontSize: 18,
        lineHeight: 1.36,
      }}
    >
      {text}
      {text.length > 0 ? <span style={{ opacity: 0.55 }}>▍</span> : ""}
    </div>
  );
}

function SourcePill({
  n,
  title,
  time,
}: {
  n: string;
  title: string;
  time: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        maxWidth: 214,
        border: `2px solid ${COLORS.ink}`,
        borderRadius: 999,
        background: COLORS.yellow,
        padding: "7px 10px",
        fontFamily: BODY,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      <span>[{n}]</span>
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </span>
      <span
        style={{
          flex: "0 0 auto",
          background: COLORS.ink,
          color: COLORS.cream,
          borderRadius: 4,
          padding: "2px 5px",
        }}
      >
        {time}
      </span>
    </div>
  );
}

const crewSteps = [
  { role: "planner", line: "turn the question into retrievable intents" },
  { role: "retriever", line: "rank timestamped transcript chunks" },
  { role: "synthesizer", line: "write the grounded answer with sources" },
];

function CrewScene({ duration }: SceneProps) {
  const frame = useCurrentFrame();
  const motion = sceneMotion(frame, duration);

  return (
    <AbsoluteFill style={{ ...motion }}>
      <Texture />
      <div
        style={{
          position: "absolute",
          left: 70,
          top: 82,
          opacity: appear(frame, 0),
        }}
      >
        <SceneHeading
          eyebrow="05 / crew mode"
          title="slow path when the question needs agents"
          body="Planner, retriever and synthesizer work through the same catalogue, instrumented by the NVIDIA stack."
        />
      </div>

      <div
        style={{
          position: "absolute",
          right: 74,
          top: 96,
          width: 578,
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {crewSteps.map((step, index) => {
          const visible = appear(frame, 26 + index * 28, 18);
          return (
            <div
              key={step.role}
              style={{
                opacity: visible,
                transform: `translateX(${interpolate(
                  visible,
                  [0, 1],
                  [46, 0],
                  clamp,
                )}px)`,
              }}
            >
              <Card
                style={{
                  padding: 22,
                  background:
                    index === 0
                      ? COLORS.white
                      : index === 1
                        ? COLORS.yellow
                        : COLORS.cream,
                }}
              >
                <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                  <div
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 999,
                      background: index === 2 ? COLORS.purple : COLORS.ink,
                      color: COLORS.cream,
                      display: "grid",
                      placeItems: "center",
                      fontFamily: DISPLAY,
                      fontSize: 26,
                      fontWeight: 900,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: DISPLAY,
                        fontSize: 31,
                        fontWeight: 900,
                        textTransform: "uppercase",
                      }}
                    >
                      {step.role}
                    </div>
                    <div
                      style={{
                        fontFamily: BODY,
                        fontSize: 19,
                        color: "rgba(26,26,26,0.66)",
                      }}
                    >
                      {step.line}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: 70,
          bottom: 84,
          display: "flex",
          gap: 14,
          opacity: appear(frame, 112),
        }}
      >
        <Pill color={COLORS.green} textColor={COLORS.cream}>
          NVIDIA NIM
        </Pill>
        <Pill color={COLORS.yellow}>CrewAI</Pill>
        <Pill>timestamped sources</Pill>
      </div>
    </AbsoluteFill>
  );
}

function OutroScene({ duration }: SceneProps) {
  const frame = useCurrentFrame();
  const motion = sceneMotion(frame, duration);

  return (
    <AbsoluteFill style={{ ...motion }}>
      <Texture />
      <Img
        src={image("og-image")}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.18,
        }}
      />
      <Star frame={frame} size={42} style={{ left: 190, top: 104 }} />
      <Star
        frame={frame + 20}
        size={32}
        color={COLORS.green}
        style={{ right: 228, top: 156 }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 142,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 34,
          textAlign: "center",
        }}
      >
        <div
          style={{
            opacity: appear(frame, 0),
            transform: `translateY(${rise(frame, 0)}px)`,
          }}
        >
          <Wordmark size={128} />
        </div>
        <h2
          style={{
            margin: 0,
            fontFamily: SERIF,
            fontSize: 58,
            lineHeight: 1,
            maxWidth: 760,
            fontWeight: 650,
            opacity: appear(frame, 26),
          }}
        >
          every conversation,
          <br />
          cited to the second.
        </h2>
        <div
          style={{
            display: "flex",
            gap: 14,
            opacity: appear(frame, 58),
          }}
        >
          <Pill color={COLORS.ink} textColor={COLORS.cream}>
            stop scrubbing
          </Pill>
          <Pill color={COLORS.yellow}>start asking</Pill>
        </div>
      </div>
    </AbsoluteFill>
  );
}

export function WtfmediaWalkthrough() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sceneList = [
    { key: "intro", duration: sceneDurations.intro, component: IntroScene },
    {
      key: "controlRoom",
      duration: sceneDurations.controlRoom,
      component: ControlRoomScene,
    },
    { key: "library", duration: sceneDurations.library, component: LibraryScene },
    {
      key: "connections",
      duration: sceneDurations.connections,
      component: ConnectionsScene,
    },
    { key: "ask", duration: sceneDurations.ask, component: AskScene },
    { key: "crew", duration: sceneDurations.crew, component: CrewScene },
    { key: "outro", duration: sceneDurations.outro, component: OutroScene },
  ];
  let from = 0;

  return (
    <AbsoluteFill
      style={{
        background: COLORS.cream,
        fontFamily: BODY,
        overflow: "hidden",
      }}
    >
      {sceneList.map((scene) => {
        const Scene = scene.component;
        const start = from;
        from += scene.duration;
        return (
          <Sequence
            key={scene.key}
            from={start}
            durationInFrames={scene.duration}
            premountFor={fps}
          >
            <Scene duration={scene.duration} />
          </Sequence>
        );
      })}
      <div
        style={{
          position: "absolute",
          right: 32,
          bottom: 24,
          zIndex: 10,
          opacity: interpolate(frame, [0, 30], [0, 0.58], clamp),
          fontFamily: DISPLAY,
          fontSize: 13,
          fontWeight: 800,
          textTransform: "uppercase",
          color: COLORS.ink,
          background: "rgba(255,246,234,0.78)",
          border: `2px solid ${COLORS.ink}`,
          borderRadius: 999,
          padding: "7px 12px",
        }}
      >
        wtfmedia walkthrough
      </div>
    </AbsoluteFill>
  );
}
