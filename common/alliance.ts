export const ALLIANCES = ["Imperial", "Xenos", "Chaos"] as const;
export type Alliance = (typeof ALLIANCES)[number];
