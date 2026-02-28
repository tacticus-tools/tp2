import { z } from "zod";

export const GOAL_TYPES = [
	"UpgradeRank",
	"Ascend",
	"Unlock",
	"MowAbilities",
	"CharacterAbilities",
] as const;

export type GoalType = (typeof GOAL_TYPES)[number];
export const GoalTypeSchema = z.enum(GOAL_TYPES);

/** Named access object — preserves PersonalGoalType.UpgradeRank usage pattern */
export const PersonalGoalType = {
	UpgradeRank: "UpgradeRank",
	Ascend: "Ascend",
	Unlock: "Unlock",
	MowAbilities: "MowAbilities",
	CharacterAbilities: "CharacterAbilities",
} as const satisfies Record<GoalType, GoalType>;
export type PersonalGoalType = GoalType;

/** Maps old numeric DB values to new string values (for migration) */
export const NUMERIC_TO_GOAL_TYPE: Record<number, GoalType> = {
	1: "UpgradeRank",
	2: "Ascend",
	3: "Unlock",
	4: "MowAbilities",
	5: "CharacterAbilities",
};
