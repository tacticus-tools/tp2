export enum Rank {
	Locked,
	Stone1,
	Stone2,
	Stone3,
	Iron1,
	Iron2,
	Iron3,
	Bronze1,
	Bronze2,
	Bronze3,
	Silver1,
	Silver2,
	Silver3,
	Gold1,
	Gold2,
	Gold3,
	Diamond1,
	Diamond2,
	Diamond3,
	Adamantine1,
	Adamantine2,
	Adamantine3,
}

export enum Rarity {
	Common,
	Uncommon,
	Rare,
	Epic,
	Legendary,
	Mythic,
}

export enum RarityString {
	Common = "Common",
	Uncommon = "Uncommon",
	Rare = "Rare",
	Epic = "Epic",
	Legendary = "Legendary",
	Mythic = "Mythic",
}

export enum RarityStars {
	None,
	OneStar,
	TwoStars,
	ThreeStars,
	FourStars,
	FiveStars,
	RedOneStar,
	RedTwoStars,
	RedThreeStars,
	RedFourStars,
	RedFiveStars,
	OneBlueStar,
	TwoBlueStars,
	ThreeBlueStars,
	MythicWings,
}

export enum Alliance {
	Chaos = "Chaos",
	Imperial = "Imperial",
	Xenos = "Xenos",
}

export enum PersonalGoalType {
	UpgradeRank = 1,
	Ascend = 2,
	Unlock = 3,
	MowAbilities = 4,
	CharacterAbilities = 5,
}

export enum CampaignsLocationsUsage {
	None = 0,
	BestTime = 1,
	LeastEnergy = 2,
}

export enum Campaign {
	I = "Indomitus",
	IE = "Indomitus Elite",
	IM = "Indomitus Mirror",
	IME = "Indomitus Mirror Elite",
	FoC = "Fall of Cadia",
	FoCE = "Fall of Cadia Elite",
	FoCM = "Fall of Cadia Mirror",
	FoCME = "Fall of Cadia Mirror Elite",
	O = "Octarius",
	OE = "Octarius Elite",
	OM = "Octarius Mirror",
	OME = "Octarius Mirror Elite",
	SH = "Saim-Hann",
	SHE = "Saim-Hann Elite",
	SHM = "Saim-Hann Mirror",
	SHME = "Saim-Hann Mirror Elite",
	AMS = "Adeptus Mechanicus Standard",
	AMSC = "Adeptus Mechanicus Standard Challenge",
	AME = "Adeptus Mechanicus Extremis",
	AMEC = "Adeptus Mechanicus Extremis Challenge",
	TS = "Tyranids Standard",
	TSC = "Tyranids Standard Challenge",
	TE = "Tyranids Extremis",
	TEC = "Tyranids Extremis Challenge",
	TAS = "T'au Empire Standard",
	TASC = "T'au Empire Standard Challenge",
	TAE = "T'au Empire Extremis",
	TAEC = "T'au Empire Extremis Challenge",
	DGS = "Death Guard Standard",
	DGSC = "Death Guard Standard Challenge",
	DGE = "Death Guard Extremis",
	DGEC = "Death Guard Extremis Challenge",
	Onslaught = "Onslaught",
}

export enum CampaignType {
	SuperEarly = "SuperEarly",
	Early = "Early",
	EarlyChars = "EarlyChars",
	EarlyMirrorChars = "EarlyMirrorChars",
	Normal = "Normal",
	Mirror = "Mirror",
	Elite = "Elite",
	Onslaught = "Onslaught",
	Standard = "Standard",
	Extremis = "Extremis",
}
