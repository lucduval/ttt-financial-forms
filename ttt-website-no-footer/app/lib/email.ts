"use server";

import { readFile } from "fs/promises";
import path from "path";
import {
    buildTeamNotificationHtml,
    buildClientThankYouHtml,
    buildContactFormTeamHtml,
    getServiceBranding,
    type EmailData,
    type ConsultationData,
    type ContactFormData,
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

export async function sendSignedLoeEmails(params: {
    clientEmail: string;
    clientName: string;
    referenceId: string;
    signedAtDisplay: string;
    signedPdfBase64: string;
    signedPdfFilename: string;
    crmLink?: string;
}): Promise<void> {
    const branding = getServiceBranding("tax");
    const attachment: EmailAttachment = {
        name: params.signedPdfFilename,
        contentType: "application/pdf",
        contentBytes: params.signedPdfBase64,
    };

    const firstName = (params.clientName || "").split(" ")[0] || "there";
    const clientHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
        <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
                <tr><td style="background-color:#0077BB;padding:24px 32px;">
                    <h1 style="margin:0;color:#ffffff;font-size:20px;">${branding.brandName}</h1>
                    <p style="margin:4px 0 0;color:#cce5ff;font-size:14px;">Letter of Engagement Signed</p>
                </td></tr>
                <tr><td style="padding:32px;">
                    <p style="margin:0 0 16px;font-size:14px;color:#333;">Dear ${firstName},</p>
                    <p style="margin:0 0 16px;font-size:14px;color:#333;">Thank you for signing your Letter of Engagement with ${branding.brandName}. A signed copy is attached to this email for your records.</p>
                    <p style="margin:0 0 16px;font-size:14px;color:#333;">Reference: <strong>${params.referenceId}</strong><br>Signed on: ${params.signedAtDisplay}</p>
                    <p style="margin:0 0 16px;font-size:14px;color:#333;">Our team has been notified and will be in touch shortly to begin work on your matter.</p>
                    <p style="margin:24px 0 4px;font-size:14px;color:#333;">Kind Regards,</p>
                    <p style="margin:0 0 4px;font-size:14px;color:#333;font-weight:600;">${branding.brandName}</p>
                    <p style="margin:0;font-size:13px;color:#555;">Tel: ${branding.phone} | Email: <a href="mailto:${branding.replyEmail}" style="color:#0077BB;">${branding.replyEmail}</a></p>
                </td></tr>
            </table>
        </td></tr>
    </table>
</body></html>`;

    const teamHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
        <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
                <tr><td style="background-color:#0077BB;padding:24px 32px;">
                    <h1 style="margin:0;color:#ffffff;font-size:20px;">Letter of Engagement Signed</h1>
                </td></tr>
                <tr><td style="padding:24px 32px;font-size:14px;color:#333;">
                    <p style="margin:0 0 12px;"><strong>${params.clientName}</strong> has signed their Letter of Engagement.</p>
                    <p style="margin:0 0 6px;"><strong>Reference:</strong> ${params.referenceId}</p>
                    <p style="margin:0 0 6px;"><strong>Signed at:</strong> ${params.signedAtDisplay}</p>
                    <p style="margin:0 0 6px;"><strong>Client email:</strong> <a href="mailto:${params.clientEmail}" style="color:#0077BB;">${params.clientEmail}</a></p>
                    <p style="margin:12px 0 0;">The signed PDF is attached.</p>
                    ${params.crmLink ? `<p style="margin:16px 0 0;"><a href="${params.crmLink}" style="display:inline-block;padding:10px 18px;background-color:#0077BB;color:#ffffff;text-decoration:none;border-radius:4px;font-size:13px;">View lead in CRM</a></p>` : ""}
                </td></tr>
            </table>
        </td></tr>
    </table>
</body></html>`;

    const tasks: Promise<void>[] = [];
    if (params.clientEmail) {
        tasks.push(
            sendEmail(
                params.clientEmail,
                `${branding.brandName} — Your Signed Letter of Engagement`,
                clientHtml,
                branding.replyEmail,
                [attachment]
            )
        );
    }

    const teamAddresses = process.env.EMAIL_TAX_ADDRESSES;
    if (teamAddresses) {
        const recipients = teamAddresses.split(",").map((addr) => addr.trim()).filter(Boolean);
        if (recipients.length > 0) {
            tasks.push(
                sendEmail(
                    recipients,
                    `LoE signed by ${params.clientName}`,
                    teamHtml,
                    params.clientEmail || branding.replyEmail,
                    [attachment]
                )
            );
        }
    }

    await Promise.all(tasks);
}

export async function sendContactFormTeamEmail(
    data: ContactFormData,
    dynamicsId?: string | null
): Promise<void> {
    const teamAddresses = process.env.EMAIL_TEAM_ADDRESSES;
    if (!teamAddresses) {
        console.warn("EMAIL_TEAM_ADDRESSES not set — skipping contact-form team notification.");
        return;
    }
    const recipients = teamAddresses.split(",").map((addr) => addr.trim()).filter(Boolean);
    if (recipients.length === 0) {
        console.warn("EMAIL_TEAM_ADDRESSES has no valid entries — skipping contact-form team notification.");
        return;
    }

    const subject = `New Website Contact — ${data.firstName} ${data.lastName}`;
    const html = buildContactFormTeamHtml(data, dynamicsId);
    await sendEmail(recipients, subject, html, data.email);
}

export async function sendClientThankYouEmail(
    data: EmailData,
    serviceType: string,
    consultation?: ConsultationData | null,
    loeSignUrl?: string
): Promise<void> {
    if (!data.email) {
        console.warn("No client email provided — skipping thank-you email.");
        return;
    }

    const branding = getServiceBranding(serviceType);
    const subject = `${branding.brandName} — Thank You for Your Submission`;
    const html = buildClientThankYouHtml(data, serviceType, consultation, undefined, loeSignUrl);

    let attachments: EmailAttachment[] = [];
    try {
        attachments = await loadServiceAttachments(serviceType);
    } catch (err) {
        console.error(`Failed to load attachments for service "${serviceType}":`, err);
    }

    await sendEmail(data.email, subject, html, branding.replyEmail, attachments);
}
