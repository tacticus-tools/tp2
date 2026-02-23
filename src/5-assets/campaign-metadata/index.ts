import type { DeepReadonly } from "@/types.ts";
import { DATA as BASE_NAMES_DATA } from "./base-names.generated.ts";
import { DATA as CHALLENGE_NODES_DATA } from "./challenge-nodes.generated.ts";
import { DATA as METADATA } from "./data.generated.ts";
import { DATA as EVENT_BATTLE_MAPS_DATA } from "./event-battle-maps.generated.ts";

/** Campaign metadata keyed by campaign display name */
export const CAMPAIGN_METADATA = Object.freeze(METADATA) as DeepReadonly<
	typeof METADATA
>;

/** Campaign base name lists in game progression order */
export const CAMPAIGN_BASE_NAMES = Object.freeze(
	BASE_NAMES_DATA,
) as DeepReadonly<typeof BASE_NAMES_DATA>;

/** Flat battle orderings per event base campaign (Standard/Extremis) */
export const EVENT_BATTLE_MAPS = Object.freeze(
	EVENT_BATTLE_MAPS_DATA,
) as DeepReadonly<typeof EVENT_BATTLE_MAPS_DATA>;

/** Sorted challenge node numbers per challenge campaign */
export const CHALLENGE_NODES = Object.freeze(
	CHALLENGE_NODES_DATA,
) as DeepReadonly<typeof CHALLENGE_NODES_DATA>;

export type CampaignMetadataEntry =
	(typeof CAMPAIGN_METADATA)[keyof typeof CAMPAIGN_METADATA];
