import { Zap } from "lucide-react";
import { useCallback, useId } from "react";
import { Input } from "@/1-components/ui/input.tsx";
import { Label } from "@/1-components/ui/label.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/1-components/ui/select.tsx";
import {
	type CustomFarmSelections,
	type FarmStrategy,
	useGoalPreferencesStore,
} from "@/3-hooks/useGoalPreferencesStore.ts";
import type {
	CampaignEventType,
	HomeScreenEventType,
} from "@/4-lib/general/campaign-events.ts";
import {
	CAMPAIGN_EVENT_LABELS,
	HSE_LABELS,
} from "@/4-lib/general/campaign-events.ts";
import type { CampaignType, RarityString } from "@/4-lib/general/constants.ts";

interface GoalSettingsFormProps {
	detectedCampaignEvent: CampaignEventType;
}

const CAMPAIGN_TYPE_ROWS: { type: CampaignType; label: string }[] = [
	{ type: "Extremis", label: "Extremis CE" },
	{ type: "Elite", label: "Elite" },
	{ type: "Early", label: "Indomitus" },
	{ type: "Standard", label: "Standard CE" },
	{ type: "Mirror", label: "Mirror" },
	{ type: "Normal", label: "Normal" },
];

const RARITY_COLUMNS: RarityString[] = [
	"Mythic",
	"Legendary",
	"Epic",
	"Rare",
	"Uncommon",
	"Common",
];

const ENERGY_PRESETS = [
	{ value: 288, label: "288 (Base)" },
	{ value: 378, label: "378 (Ads)" },
	{ value: 438, label: "438 (25 BP)" },
	{ value: 538, label: "538 (50 BP)" },
	{ value: 638, label: "638 (110 BP)" },
	{ value: 738, label: "738 (250 BP)" },
	{ value: 838, label: "838 (500 BP)" },
	{ value: 938, label: "938 (1000 BP)" },
] as const;

export function GoalSettingsForm({
	detectedCampaignEvent,
}: GoalSettingsFormProps) {
	const uid = useId();
	const {
		dailyEnergy,
		shardsEnergy,
		farmStrategy,
		farmOrder,
		campaignEventEnabled,
		homeScreenEvent,
		hseMinEnemyCount,
		customFarmSelections,
		setDailyEnergy,
		setShardsEnergy,
		setFarmStrategy,
		setFarmOrder,
		setCampaignEventEnabled,
		setHomeScreenEvent,
		setHseMinEnemyCount,
		setCustomFarmSelections,
	} = useGoalPreferencesStore();

	const toggleCustomSelection = useCallback(
		(rarity: RarityString, campaignType: CampaignType) => {
			const current = customFarmSelections[rarity] ?? [];
			const next = current.includes(campaignType)
				? current.filter((t) => t !== campaignType)
				: [...current, campaignType];
			setCustomFarmSelections({ ...customFarmSelections, [rarity]: next });
		},
		[customFarmSelections, setCustomFarmSelections],
	);

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor={`${uid}-dailyEnergy`}>Daily Energy</Label>
				<div className="flex items-center gap-2">
					<Select
						value={
							ENERGY_PRESETS.some((p) => p.value === dailyEnergy)
								? String(dailyEnergy)
								: "custom"
						}
						onValueChange={(val) => {
							if (val !== "custom") {
								setDailyEnergy(Number(val));
							}
						}}
					>
						<SelectTrigger className="w-40">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{ENERGY_PRESETS.map((preset) => (
								<SelectItem key={preset.value} value={String(preset.value)}>
									{preset.label}
								</SelectItem>
							))}
							<SelectItem value="custom">Custom</SelectItem>
						</SelectContent>
					</Select>
					<Input
						id={`${uid}-dailyEnergy`}
						type="number"
						min={0}
						max={9999}
						className="w-20"
						value={dailyEnergy}
						onChange={(e) =>
							setDailyEnergy(
								Math.max(0, Number.parseInt(e.target.value, 10) || 0),
							)
						}
					/>
					<Zap className="size-4 text-yellow-400" />
				</div>
			</div>

			<div className="space-y-2">
				<Label htmlFor={`${uid}-shardsEnergy`}>Shards Energy Budget</Label>
				<div className="flex items-center gap-2">
					<Input
						id={`${uid}-shardsEnergy`}
						type="number"
						min={0}
						max={dailyEnergy}
						className="w-20"
						value={shardsEnergy}
						onChange={(e) =>
							setShardsEnergy(
								Math.max(
									0,
									Math.min(
										dailyEnergy,
										Number.parseInt(e.target.value, 10) || 0,
									),
								),
							)
						}
					/>
					<span className="text-xs text-muted-foreground">
						of {dailyEnergy}
					</span>
				</div>
			</div>

			<div className="space-y-2">
				<Label>Farm Strategy</Label>
				<Select
					value={farmStrategy}
					onValueChange={(val) => setFarmStrategy(val as FarmStrategy)}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="leastEnergy">Least Energy</SelectItem>
						<SelectItem value="allLocations">All Locations</SelectItem>
						<SelectItem value="custom">Custom</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{farmStrategy === "custom" && (
				<CustomFarmSelectionsGrid
					selections={customFarmSelections}
					onToggle={toggleCustomSelection}
				/>
			)}

			<div className="space-y-2">
				<Label>Farm Order</Label>
				<Select
					value={farmOrder}
					onValueChange={(val) =>
						setFarmOrder(val as "goalPriority" | "totalMaterials")
					}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="goalPriority">Goal Priority</SelectItem>
						<SelectItem value="totalMaterials">Total Materials</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-2">
				<Label>Campaign Event</Label>
				<div className="flex items-center justify-between">
					<span className="text-sm">
						{detectedCampaignEvent !== "none"
							? CAMPAIGN_EVENT_LABELS[detectedCampaignEvent]
							: "None detected"}
					</span>
					{detectedCampaignEvent !== "none" && (
						<button
							type="button"
							onClick={() => setCampaignEventEnabled(!campaignEventEnabled)}
							className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
								campaignEventEnabled
									? "bg-emerald-500"
									: "bg-muted-foreground/30"
							}`}
						>
							<span
								className={`pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${
									campaignEventEnabled ? "translate-x-4" : "translate-x-0"
								}`}
							/>
						</button>
					)}
				</div>
			</div>

			<div className="space-y-2">
				<Label>Home Screen Event</Label>
				<Select
					value={homeScreenEvent}
					onValueChange={(val) =>
						setHomeScreenEvent(val as HomeScreenEventType)
					}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{Object.entries(HSE_LABELS).map(([key, label]) => (
							<SelectItem key={key} value={key}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{homeScreenEvent !== "none" && (
				<div className="space-y-2">
					<Label htmlFor={`${uid}-hseMinEnemies`}>Min Enemies</Label>
					<div className="flex items-center gap-2">
						<Input
							id={`${uid}-hseMinEnemies`}
							type="number"
							min={1}
							max={15}
							className="w-20"
							value={hseMinEnemyCount}
							onChange={(e) =>
								setHseMinEnemyCount(
									Math.max(
										1,
										Math.min(15, Number.parseInt(e.target.value, 10) || 1),
									),
								)
							}
						/>
						<span className="text-xs text-muted-foreground">per battle</span>
					</div>
				</div>
			)}
		</div>
	);
}

function CustomFarmSelectionsGrid({
	selections,
	onToggle,
}: {
	selections: CustomFarmSelections;
	onToggle: (rarity: RarityString, campaignType: CampaignType) => void;
}) {
	return (
		<div className="space-y-2">
			<Label>Campaign Types by Rarity</Label>
			<div className="overflow-x-auto rounded-md border border-border">
				<table className="w-full text-xs">
					<thead>
						<tr className="border-b border-border bg-muted/30">
							<th className="px-2 py-1.5 text-left font-medium text-muted-foreground" />
							{RARITY_COLUMNS.map((rarity) => (
								<th
									key={rarity}
									className="px-1 py-1.5 text-center font-medium text-muted-foreground"
								>
									{rarity.slice(0, 3)}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{CAMPAIGN_TYPE_ROWS.map((row) => (
							<tr
								key={row.type}
								className="border-b border-border last:border-0"
							>
								<td className="px-2 py-1 whitespace-nowrap text-muted-foreground">
									{row.label}
								</td>
								{RARITY_COLUMNS.map((rarity) => {
									const checked = (selections[rarity] ?? []).includes(row.type);
									return (
										<td key={rarity} className="px-1 py-1 text-center">
											<input
												type="checkbox"
												checked={checked}
												onChange={() => onToggle(rarity, row.type)}
												aria-label={`${row.label} for ${rarity}`}
												className="size-3.5 cursor-pointer accent-emerald-500"
											/>
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
