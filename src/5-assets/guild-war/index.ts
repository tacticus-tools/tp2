import type { DeepReadonly } from "@/types.ts";
import data from "./data.generated.json" with { type: "json" };
import type { GuildWarData } from "./generate-data.ts";

export type { GuildWarData };
export type { GuildWarSection } from "./generate-data.ts";

export const GUILD_WAR = Object.freeze(data) as DeepReadonly<GuildWarData>;
