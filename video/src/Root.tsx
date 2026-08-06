import "./index.css";
import { Composition } from "remotion";
import { TOTAL_FRAMES, WtfmediaWalkthrough } from "./WtfmediaWalkthrough";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="WtfmediaWalkthrough"
        component={WtfmediaWalkthrough}
        durationInFrames={TOTAL_FRAMES}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
