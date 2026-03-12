"use server";

import {
    buildTeamNotificationHtml,
    buildClientThankYouHtml,
    type EmailData,
    type ConsultationData,
} from "./email-templates";

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
    htmlBody: string
): Promise<void> {
    const senderAddress = process.env.EMAIL_SENDER_ADDRESS;
    if (!senderAddress) {
        throw new Error("EMAIL_SENDER_ADDRESS environment variable is not set.");
    }

    const recipients = (Array.isArray(to) ? to : [to]).map((address) => ({
        emailAddress: { address },
    }));

    const token = await getGraphAccessToken();

    const response = await fetch(
        `https://graph.microsoft.com/v1.0/users/${senderAddress}/sendMail`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: {
                    subject,
                    body: { contentType: "HTML", content: htmlBody },
                    toRecipients: recipients,
                },
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
    const teamAddresses = process.env.EMAIL_TEAM_ADDRESSES;
    if (!teamAddresses) {
        console.warn("EMAIL_TEAM_ADDRESSES not set — skipping team notification.");
        return;
    }

    const recipients = teamAddresses.split(",").map((addr) => addr.trim()).filter(Boolean);
    if (recipients.length === 0) return;

    const clientName = data.contactPerson || data.name || "Unknown";
    const subject = `New ${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} Lead — ${clientName}`;
    const html = buildTeamNotificationHtml(data, serviceType, dynamicsId);

    await sendEmail(recipients, subject, html);
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

    const subject = "TTT Adaptive Accounting — Thank You for Your Submission";
    const html = buildClientThankYouHtml(data, serviceType, consultation);

    await sendEmail(data.email, subject, html);
}
