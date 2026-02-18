export const Rank = {
	Locked: 0,
	Stone1: 1,
	Stone2: 2,
	Stone3: 3,
	Iron1: 4,
	Iron2: 5,
	Iron3: 6,
	Bronze1: 7,
	Bronze2: 8,
	Bronze3: 9,
	Silver1: 10,
	Silver2: 11,
	Silver3: 12,
	Gold1: 13,
	Gold2: 14,
	Gold3: 15,
	Diamond1: 16,
	Diamond2: 17,
	Diamond3: 18,
	Adamantine1: 19,
	Adamantine2: 20,
	Adamantine3: 21,
} as const;
export type Rank = (typeof Rank)[keyof typeof Rank];

export const Rarity = {
	Common: 0,
	Uncommon: 1,
	Rare: 2,
	Epic: 3,
	Legendary: 4,
	Mythic: 5,
} as const;
export type Rarity = (typeof Rarity)[keyof typeof Rarity];

export const RarityString = {
	Common: "Common",
	Uncommon: "Uncommon",
	Rare: "Rare",
	Epic: "Epic",
	Legendary: "Legendary",
	Mythic: "Mythic",
} as const;
export type RarityString = (typeof RarityString)[keyof typeof RarityString];

export const RarityStars = {
	None: 0,
	OneStar: 1,
	TwoStars: 2,
	ThreeStars: 3,
	FourStars: 4,
	FiveStars: 5,
	RedOneStar: 6,
	RedTwoStars: 7,
	RedThreeStars: 8,
	RedFourStars: 9,
	RedFiveStars: 10,
	OneBlueStar: 11,
	TwoBlueStars: 12,
	ThreeBlueStars: 13,
	MythicWings: 14,
} as const;
export type RarityStars = (typeof RarityStars)[keyof typeof RarityStars];

export const Alliance = {
	Chaos: "Chaos",
	Imperial: "Imperial",
	Xenos: "Xenos",
} as const;
export type Alliance = (typeof Alliance)[keyof typeof Alliance];

export const PersonalGoalType = {
	UpgradeRank: 1,
	Ascend: 2,
	Unlock: 3,
	MowAbilities: 4,
	CharacterAbilities: 5,
} as const;
export type PersonalGoalType =
	(typeof PersonalGoalType)[keyof typeof PersonalGoalType];

export const CampaignsLocationsUsage = {
	None: 0,
	BestTime: 1,
	LeastEnergy: 2,
} as const;
export type CampaignsLocationsUsage =
	(typeof CampaignsLocationsUsage)[keyof typeof CampaignsLocationsUsage];

export const Campaign = {
	I: "Indomitus",
	IE: "Indomitus Elite",
	IM: "Indomitus Mirror",
	IME: "Indomitus Mirror Elite",
	FoC: "Fall of Cadia",
	FoCE: "Fall of Cadia Elite",
	FoCM: "Fall of Cadia Mirror",
	FoCME: "Fall of Cadia Mirror Elite",
	O: "Octarius",
	OE: "Octarius Elite",
	OM: "Octarius Mirror",
	OME: "Octarius Mirror Elite",
	SH: "Saim-Hann",
	SHE: "Saim-Hann Elite",
	SHM: "Saim-Hann Mirror",
	SHME: "Saim-Hann Mirror Elite",
	AMS: "Adeptus Mechanicus Standard",
	AMSC: "Adeptus Mechanicus Standard Challenge",
	AME: "Adeptus Mechanicus Extremis",
	AMEC: "Adeptus Mechanicus Extremis Challenge",
	TS: "Tyranids Standard",
	TSC: "Tyranids Standard Challenge",
	TE: "Tyranids Extremis",
	TEC: "Tyranids Extremis Challenge",
	TAS: "T'au Empire Standard",
	TASC: "T'au Empire Standard Challenge",
	TAE: "T'au Empire Extremis",
	TAEC: "T'au Empire Extremis Challenge",
	DGS: "Death Guard Standard",
	DGSC: "Death Guard Standard Challenge",
	DGE: "Death Guard Extremis",
	DGEC: "Death Guard Extremis Challenge",
	Onslaught: "Onslaught",
} as const;
export type Campaign = (typeof Campaign)[keyof typeof Campaign];

export const CampaignType = {
	SuperEarly: "SuperEarly",
	Early: "Early",
	EarlyChars: "EarlyChars",
	EarlyMirrorChars: "EarlyMirrorChars",
	Normal: "Normal",
	Mirror: "Mirror",
	Elite: "Elite",
	Onslaught: "Onslaught",
	Standard: "Standard",
	Extremis: "Extremis",
} as const;
export type CampaignType = (typeof CampaignType)[keyof typeof CampaignType];
