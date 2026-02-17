import data from "./data.generated.json";
import type { OnslaughtData } from "./regenerate-onslaught-data";

type OnslaughtTrack = OnslaughtData[number];
export type OnslaughtBadgeAlliance = OnslaughtTrack["badgeAlliance"];
export type OnslaughtSector = OnslaughtTrack["sectors"][number];
export type OnslaughtKillzone = OnslaughtSector["killzones"][number];

export const onslaughtData = data as OnslaughtData; // Safe to cast since it's generated from the same zod schema
