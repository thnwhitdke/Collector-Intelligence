import {
  MoodIntent,
} from "./track-mood-curation";

export function sessionStageCount(
  mood: MoodIntent["mood"],
) {
  switch (mood) {
    case "grounding":
      return {
        opening: 3,
        deepening: 4,
        peak: 3,
        resolve: 2,
      };

    case "focus":
      return {
        opening: 2,
        deepening: 5,
        peak: 4,
        resolve: 1,
      };

    default:
      return {
        opening: 3,
        deepening: 3,
        peak: 3,
        resolve: 3,
      };
  }
}
