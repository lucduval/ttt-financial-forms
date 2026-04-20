"use server";

import { readFile } from "fs/promises";
import path from "path";
import {
    buildTeamNotificationHtml,
    buildClientThankYouHtml,
    getServiceBranding,
    type EmailData,
    type ConsultationData,
} from "./email-templates";

interface EmailAttachment {
    name: string;
    contentType: string;
    contentBytes: string;
}

interface AttachmentSpec {
    name: string;
    filePath: string;
    contentType: string;
}

const SERVICE_ATTACHMENTS: Record<string, AttachmentSpec[]> = {
    tax: [
        {
            name: "TTT - Tax Services - Letter of Engagement.pdf",
            filePath: path.join(process.cwd(), "public", "attachments", "tax-letter-of-engagement.pdf"),
            contentType: "application/pdf",
        },
    ],
};

async function loadServiceAttachments(serviceType: string): Promise<EmailAttachment[]> {
    const specs = SERVICE_ATTACHMENTS[serviceType.toLowerCase()];
    if (!specs || specs.length === 0) return [];

    return Promise.all(specs.map(async (spec) => {
        const buffer = await readFile(spec.filePath);
        return {
            name: spec.name,
            contentType: spec.contentType,
            contentBytes: buffer.toString("base64"),
        };
    }));
}

async function getGraphAccessToken(): Promise<string> {
    const tenantId = process.env.DYNAMICS_TENANT_ID;
    const clientId = process.env.DYNAMICS_CLIENT_ID;
    const clientSecret = process.env.DYNAMICS_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
        throw new Error("Missing Azure AD credentials for email sending.");
    }

    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/token`;
    const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        resource: "https://graph.microsoft.com",
    });

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Error fetching Graph access token:", response.status, errorText);
        throw new Error(`Failed to get Graph access token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
}

async function sendEmail(
    to: string | string[],
    subject: string,
    htmlBody: string,
    replyTo?: string,
    attachments?: EmailAttachment[]
): Promise<void> {
    const senderAddress = process.env.EMAIL_SENDER_ADDRESS;
    if (!senderAddress) {
        throw new Error("EMAIL_SENDER_ADDRESS environment variable is not set.");
    }

    const recipients = (Array.isArray(to) ? to : [to]).map((address) => ({
        emailAddress: { address },
    }));

    const token = await getGraphAccessToken();

    const message: Record<string, unknown> = {
        subject,
        body: { contentType: "HTML", content: htmlBody },
        toRecipients: recipients,
    };
    if (replyTo) {
        message.replyTo = [{ emailAddress: { address: replyTo } }];
    }
    if (attachments && attachments.length > 0) {
        message.attachments = attachments.map((att) => ({
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: att.name,
            contentType: att.contentType,
            contentBytes: att.contentBytes,
        }));
    }

    const response = await fetch(
        `https://graph.microsoft.com/v1.0/users/${senderAddress}/sendMail`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message,
                saveToSentItems: false,
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Graph sendMail error:", response.status, errorText);
        throw new Error(`Failed to send email: ${response.statusText}`);
    }
}

export async function sendTeamNotificationEmail(
    data: EmailData,
    serviceType: string,
    dynamicsId?: string | null
): Promise<void> {
    const serviceEnv: Record<string, string | undefined> = {
        tax: process.env.EMAIL_TAX_ADDRESSES,
        insurance: process.env.EMAIL_INSURANCE_ADDRESSES,
        advisory: process.env.EMAIL_ADVISORY_ADDRESSES,
    };
    const teamAddresses = serviceEnv[serviceType] || process.env.EMAIL_TEAM_ADDRESSES;
    if (!teamAddresses) {
        console.warn(`No recipient list set for service "${serviceType}" — skipping team notification.`);
        return;
    }

    const recipients = teamAddresses.split(",").map((addr) => addr.trim()).filter(Boolean);
    if (recipients.length === 0) return;

    const clientName = data.contactPerson || data.name || "Unknown";
    const subject = `New ${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} Lead — ${clientName}`;
    const html = buildTeamNotificationHtml(data, serviceType, dynamicsId);

    await sendEmail(recipients, subject, html, data.email);
}

export async function sendClientThankYouEmail(
    data: EmailData,
    serviceType: string,
    consultation?: ConsultationData | null
): Promise<void> {
    if (!data.email) {
        console.warn("No client email provided — skipping thank-you email.");
        return;
    }

    const branding = getServiceBranding(serviceType);
    const subject = `${branding.brandName} — Thank You for Your Submission`;
    const html = buildClientThankYouHtml(data, serviceType, consultation);

    let attachments: EmailAttachment[] = [];
    try {
        attachments = await loadServiceAttachments(serviceType);
    } catch (err) {
        console.error(`Failed to load attachments for service "${serviceType}":`, err);
    }

    await sendEmail(data.email, subject, html, branding.replyEmail, attachments);
}
