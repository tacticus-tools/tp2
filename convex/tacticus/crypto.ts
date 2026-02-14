const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;
const ENC_PREFIX = "enc:";

function base64ToBytes(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

async function getKey(): Promise<CryptoKey> {
	const keyBase64 = process.env.ENCRYPTION_KEY;
	if (!keyBase64) {
		throw new Error(
			"Missing ENCRYPTION_KEY environment variable. Generate one with: openssl rand -base64 32",
		);
	}
	const keyBytes = base64ToBytes(keyBase64);
	if (keyBytes.length !== 32) {
		throw new Error("ENCRYPTION_KEY must be a base64-encoded 32-byte key");
	}
	return crypto.subtle.importKey(
		"raw",
		keyBytes.buffer as ArrayBuffer,
		ALGORITHM,
		false,
		["encrypt", "decrypt"],
	);
}

export async function encrypt(plaintext: string): Promise<string> {
	const key = await getKey();
	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
	const encoded = new TextEncoder().encode(plaintext);
	const ciphertext = await crypto.subtle.encrypt(
		{ name: ALGORITHM, iv },
		key,
		encoded,
	);

	const combined = new Uint8Array(iv.length + ciphertext.byteLength);
	combined.set(iv);
	combined.set(new Uint8Array(ciphertext), iv.length);

	return ENC_PREFIX + bytesToBase64(combined);
}

export async function decrypt(stored: string): Promise<string> {
	// Handle legacy plaintext values (before encryption was added)
	if (!stored.startsWith(ENC_PREFIX)) {
		return stored;
	}

	const key = await getKey();
	const combined = base64ToBytes(stored.slice(ENC_PREFIX.length));

	const iv = combined.slice(0, IV_LENGTH);
	const ciphertext = combined.slice(IV_LENGTH);

	const decrypted = await crypto.subtle.decrypt(
		{ name: ALGORITHM, iv },
		key,
		ciphertext,
	);
	return new TextDecoder().decode(decrypted);
}

export function maskValue(plaintext: string): string {
	if (plaintext.length <= 4) {
		return "••••••••";
	}
	return `••••••••${plaintext.slice(-4)}`;
}
