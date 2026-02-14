export interface TacticusPlayerResponse {
	player: TacticusPlayer;
}

interface TacticusPlayer {
	units: TacticusUnit[];
	inventory: TacticusInventory;
	progress: TacticusProgress;
}

export interface TacticusEquipment {
	id: string;
	level: number;
	name: string;
	rarity: string;
	slotId: string;
}

export interface TacticusInventory {
	upgrades: TacticusUpgrade[];
	shards: TacticusShard[];
	mythicShards: TacticusShard[];
	xpBooks: TacticusXpBook[];
	abilityBadges: TacticusAbilityBadges;
	orbs: TacticusOrbs;
	forgeBadges: TacticusForgeBadge[];
	components: TacticusComponents[];
}

interface TacticusOrb {
	rarity: string;
	amount: number;
}

interface TacticusOrbs {
	Imperial: TacticusOrb[];
	Xenos: TacticusOrb[];
	Chaos: TacticusOrb[];
}

interface TacticusForgeBadge {
	name: string;
	rarity: string;
	amount: number;
}

interface TacticusComponents {
	name: string;
	grandAlliance: string;
	amount: number;
}

interface TacticusAbility {
	id: string;
	/** 0 = ability is locked */
	level: number;
}

interface TacticusXpBook {
	id: string;
	rarity: string;
	amount: number;
}

interface TacticusAbilityBadge {
	id: string;
	rarity: string;
	amount: number;
}

interface TacticusAbilityBadges {
	Imperial: TacticusAbilityBadge[];
	Xenos: TacticusAbilityBadge[];
	Chaos: TacticusAbilityBadge[];
}

export interface TacticusUnit {
	id: string;
	name: string;
	/** 0 = Common, 3 = Uncommon, 6 = Rare, 9 = Epic, 12 = Legendary */
	progressionIndex: number;
	xp: number;
	xpLevel: number;
	/** 0 = Stone I, 3 = Iron I, 6 = Bronze I, 9 = Silver I, 12 = Gold I, 15 = Diamond I, 17 = Diamond III */
	rank: number;
	abilities: [TacticusAbility, TacticusAbility];
	/** 2*3 matrix, 0 = top left, 1 = bottom left, 2 = top center etc */
	upgrades: number[];
	shards: number;
	mythicShards: number;
	items: TacticusEquipment[];
}

export interface TacticusUpgrade {
	id: string;
	name: string;
	amount: number;
}

export interface TacticusShard {
	id: string;
	name: string;
	amount: number;
}

interface TacticusProgress {
	campaigns: TacticusCampaignProgress[];
	legendaryEvents: TacticusLegendaryEventProgress[];
}

export interface TacticusCampaignProgress {
	id: string;
	name: string;
	type: string;
	battles: TacticusCampaignLevel[];
}

interface TacticusCampaignLevel {
	battleIndex: number;
	attemptsLeft: number;
	attemptsUsed: number;
}

export interface TacticusLegendaryEventProgress {
	id: string;
	lanes: TacticusLegendaryEventLane[];
	currentPoints: number;
	currentCurrency: number;
	currentShards: number;
	currentClaimedChestIndex: number | undefined;
	currentEvent: TacticusLegendaryEventCurrentEvent | undefined;
}

export interface TacticusLegendaryEventLane {
	id: number;
	name: string;
	battleConfigs: TacticusLegendaryEventBattleConfig[];
	progress: TacticusLegendaryEventBattlesProgress[];
}

export interface TacticusLegendaryEventBattleConfig {
	numEnemies: number;
	objectives: TacticusLegendaryEventObjective[];
	disallowedFactions: string[];
}

export interface TacticusLegendaryEventObjective {
	objectiveType: string;
	objectiveTarget: string;
	score: number;
}

export interface TacticusLegendaryEventBattlesProgress {
	objectivesCleared: number[];
	highScore: number;
	encounterPoints: number;
}

export interface TacticusLegendaryEventCurrentEvent {
	run: number;
	tokens: TacticusLegendaryEventTokens;
	hasUsedAdForExtraTokenToday: boolean;
	extraCurrencyPerPayout: number;
}

export interface TacticusLegendaryEventTokens {
	current: number;
	max: number;
	nextTokenInSeconds: number;
	regenDelayInSeconds: number;
}

export interface TacticusGuildResponse {
	guild: TacticusGuild;
}

export interface TacticusGuild {
	guildId: string;
	guildTag: string;
	name: string;
	level: number;
	members: TacticusGuildMember[];
	guildRaidSeasons: number[];
}

export interface TacticusGuildMember {
	userId: string;
	role: TacticusGuildRole;
	level: number;
	lastActivityOn?: string | null;
}

export enum TacticusGuildRole {
	MEMBER = 0,
	OFFICER = 1,
	CO_LEADER = 2,
	LEADER = 3,
}

export interface TacticusGuildRaidResponse {
	season: number;
	seasonConfigId: string;
	entries: TacticusGuildRaidEntry[];
}

export interface TacticusGuildRaidEntry {
	userId: string;
	tier: number;
	set: number;
	encounterIndex: number;
	remainingHp: number;
	maxHp: number;
	encounterType: TacticusEncounterType;
	unitId: string;
	type: string;
	rarity: string;
	damageDealt: number;
	damageType: TacticusDamageType;
	startedOn?: number | null;
	completedOn?: number | null;
	heroDetails: TacticusGuildRaidUnit[];
	machineOfWarDetails?: TacticusGuildRaidUnit;
	globalConfigHash: string;
}

export interface TacticusGuildRaidUnit {
	unitId: string;
	power: number;
}

export enum TacticusEncounterType {
	SideBoss = 0,
	Boss = 1,
}

export enum TacticusDamageType {
	Bomb = 0,
	Battle = 1,
}
