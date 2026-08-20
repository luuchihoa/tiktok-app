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
          if (typedProps?.audioDurationSeconds && typedProps.audioDurationSeconds > 0) {
            return {
              durationInFrames: Math.ceil((typedProps.audioDurationSeconds + 8.0) * 30),
              props,
            };
          }

          const rawAudioStr = typedProps?.audioFile || "current_audio.mp3";
          let cleanAudio =
            rawAudioStr.startsWith("http") || rawAudioStr.startsWith("blob:")
              ? rawAudioStr.split("/").pop() || "current_audio.mp3"
              : rawAudioStr;
          cleanAudio = cleanAudio.split("?")[0].split("#")[0];

          const audioUrl = rawAudioStr.startsWith("blob:")
            ? rawAudioStr
            : `${staticFile(cleanAudio)}?t=${Date.now()}`;
          try {
            const durationSeconds = await getAudioDurationInSeconds(audioUrl);
            return {
              durationInFrames: Math.ceil((durationSeconds + 8.0) * 30),
              props,
            };
          } catch (e) {
            console.warn(
              "Could not calculate audio duration via getAudioDurationInSeconds, fallback to 3600 frames",
              e,
            );
            return {
              durationInFrames: 3600,
              props,
            };
          }
        }}
      />
    </>
  );
};
