import React from "react";
import { Composition, staticFile } from "remotion";
import { CatholicVideo } from "./CatholicVideo";
import { videoData } from "./data/today";
import { VideoInput, VideoInputSchema } from "./data/videoInput";
import { getAudioDurationInSeconds } from "@remotion/media-utils";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CatholicVideo"
        component={CatholicVideo as React.FC<VideoInput>}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        schema={VideoInputSchema}
        defaultProps={{
          ...videoData,
        }}
        calculateMetadata={async ({ props }) => {
          const typedProps = props as VideoInput;
          const rawAudioStr = typedProps?.audioFile || "audio.mp3";
          let cleanAudio =
            rawAudioStr.startsWith("http") || rawAudioStr.startsWith("blob:")
              ? rawAudioStr.split("/").pop() || "audio.mp3"
              : rawAudioStr;
          cleanAudio = cleanAudio.split("?")[0].split("#")[0];

          const audioUrl = rawAudioStr.startsWith("blob:")
            ? rawAudioStr
            : staticFile(cleanAudio);
          try {
            const durationSeconds = await getAudioDurationInSeconds(audioUrl);
            // Duration calculation:
            //   intro  = 3.5 s (105 frames at 30 fps)
            //   outro  = 4.5 s (135 frames at 30 fps)
            //   total padding = 3.5 + 4.5 = 8.0 s
            // The outro Sequence starts at (durationInFrames - 135), which equals
            // audioDuration * 30 + 105 frames — exactly when main voice audio ends.
            // This guarantees the outro receives its full 4.5 s and does not get cut.
            return {
              durationInFrames: Math.ceil((durationSeconds + 8.0) * 30),
              props,
            };
          } catch (e) {
            console.warn(
              "Could not calculate audio duration, fallback to 1500 frames",
              e,
            );
            return {
              durationInFrames: 1500,
              props,
            };
          }
        }}
      />
    </>
  );
};
