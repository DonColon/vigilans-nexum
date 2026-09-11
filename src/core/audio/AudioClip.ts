/**
 * A decoded sound as it sits in AssetStorage: the samples and the channel it
 * belongs on. A clip is never played directly and never changes - every
 * playback is an `AudioVoice` built from it, and any number of voices can play
 * the same clip at once. That is what lets two sword hits overlap instead of
 * the second one orphaning the first.
 */
export interface AudioClip {
	readonly buffer: AudioBuffer;
	readonly channel: string;
}
