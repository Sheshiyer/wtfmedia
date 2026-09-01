import raw from "@/src/data/uncut-activation.json";

export type PublicUncutActivation = {
  schema: "wtfmedia.public_uncut_activation.v1";
  snapshotAt: string;
  activationCount: number;
  activationTitles: string[];
  videoIds: string[];
};

const receipt = raw as PublicUncutActivation;
const activeVideoIds = new Set(receipt.videoIds);
const activeTitles = new Set(receipt.activationTitles);

export const publicUncutActivation = receipt;

export function isPublicUncutActivated(videoId: string): boolean {
  return activeVideoIds.has(videoId);
}

export function isPublicUncutTitleActivated(title: string): boolean {
  return activeTitles.has(title);
}
