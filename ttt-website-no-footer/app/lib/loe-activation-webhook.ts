import { createHmac } from "node:crypto";

export async function notifyBotLoeSigned(leadId: string): Promise<void> {
    const url = process.env.LOE_ACTIVATION_WEBHOOK_URL;
    const secret = process.env.LOE_ACTIVATION_WEBHOOK_SECRET;

    if (!url || !secret) {
        console.warn(
            "[LoE webhook] LOE_ACTIVATION_WEBHOOK_URL or LOE_ACTIVATION_WEBHOOK_SECRET not set; skipping bot notification"
        );
        return;
    }

    const body = JSON.stringify({ leadId });
    const signature = createHmac("sha256", secret).update(body).digest("hex");

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-LoE-Signature": signature,
            },
            body,
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            console.error(`[LoE webhook] bot returned ${res.status} for lead ${leadId}: ${text}`);
            return;
        }
        console.log(`[LoE webhook] notified bot for lead ${leadId} (status ${res.status})`);
    } catch (err) {
        console.error("[LoE webhook] failed:", err);
    }
}
