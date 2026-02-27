import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/1-components/ui/select.tsx";
import { LRE_EVENTS } from "@/5-assets/lre/index.ts";

export function LreEventSelector({
	selectedEventId,
	onSelect,
}: {
	selectedEventId: number;
	onSelect: (eventId: number) => void;
}) {
	return (
		<Select
			value={String(selectedEventId)}
			onValueChange={(v) => onSelect(Number(v))}
		>
			<SelectTrigger className="w-48">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{LRE_EVENTS.map((event) => (
					<SelectItem key={event.id} value={String(event.id)}>
						{event.name}
						{event.finished ? "" : " *"}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
