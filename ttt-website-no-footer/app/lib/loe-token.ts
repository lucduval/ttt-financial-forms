import crypto from "crypto";

const TOKEN_TTL_SECONDS = 60 * 60 * 72;

function getSecret(): string {
    const secret = process.env.LOE_SIGNING_SECRET;
    if (!secret || secret.length < 16) {
        throw new Error("LOE_SIGNING_SECRET environment variable must be set (32+ random bytes recommended).");
    }
    return secret;
}

function base64url(buf: Buffer): string {
    return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sign(leadId: string, issuedAt: number): string {
    const payload = `${leadId}:${issuedAt}`;
    const mac = crypto.createHmac("sha256", getSecret()).update(payload).digest();
    return base64url(mac);
}

export function mintLoeToken(leadId: string): string {
    const issuedAt = Math.floor(Date.now() / 1000);
    const mac = sign(leadId, issuedAt);
    return `${issuedAt}.${mac}`;
}

export function verifyLoeToken(leadId: string, token: string): { valid: true } | { valid: false; reason: string } {
    if (!token || typeof token !== "string") {
        return { valid: false, reason: "Missing token." };
    }
    const dot = token.indexOf(".");
    if (dot < 1) {
        return { valid: false, reason: "Malformed token." };
    }
    const issuedAtStr = token.slice(0, dot);
    const presentedMac = token.slice(dot + 1);
    const issuedAt = Number(issuedAtStr);
    if (!Number.isFinite(issuedAt) || issuedAt <= 0) {
        return { valid: false, reason: "Malformed token." };
    }

    const ageSeconds = Math.floor(Date.now() / 1000) - issuedAt;
    if (ageSeconds > TOKEN_TTL_SECONDS) {
        return { valid: false, reason: "This signing link has expired. Please contact us for a new one." };
    }
    if (ageSeconds < -300) {
        return { valid: false, reason: "Malformed token." };
    }

    const expected = sign(leadId, issuedAt);
    const expectedBuf = Buffer.from(expected);
    const presentedBuf = Buffer.from(presentedMac);
    if (expectedBuf.length !== presentedBuf.length) {
        return { valid: false, reason: "Invalid signing link." };
    }
    if (!crypto.timingSafeEqual(expectedBuf, presentedBuf)) {
        return { valid: false, reason: "Invalid signing link." };
    }

    return { valid: true };
}
