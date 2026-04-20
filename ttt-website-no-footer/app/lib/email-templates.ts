export interface EmailData {
    name?: string;
    contactPerson?: string;
    email: string;
    phone: string;
    companyName?: string;
    message?: string;
    notes?: string;
    clientType?: number;
    services?: Record<string, boolean | string | undefined>;
    industryName?: string;
}

export interface ConsultationData {
    date: string;
    time: string;
    accountant: string;
}

export interface ServiceBranding {
    brandName: string;
    serviceLabel: string;
    replyEmail: string;
    phone: string;
    roleTerm: string;
}

const SERVICE_BRANDING: Record<string, ServiceBranding> = {
    tax: {
        brandName: "TTT Tax Services",
        serviceLabel: "tax services",
        replyEmail: "admin@ttt-tax.co.za",
        phone: "010 442 9222",
        roleTerm: "Designated Accountant",
    },
    insurance: {
        brandName: "TTT Financial Group",
        serviceLabel: "insurance services",
        replyEmail: "admin@ttt-insurance.co.za",
        phone: "010 442 9222",
        roleTerm: "Insurance Advisor",
    },
    advisory: {
        brandName: "TTT Financial Group",
        serviceLabel: "financial advisory services",
        replyEmail: "admin@ttt-finance.co.za",
        phone: "010 442 9222",
        roleTerm: "Financial Advisor",
    },
    accounting: {
        brandName: "TTT Adaptive Accounting",
        serviceLabel: "accounting services",
        replyEmail: "registrations@ttt-tax.co.za",
        phone: "010 442 9222",
        roleTerm: "Designated Accountant",
    },
};

export function getServiceBranding(serviceType: string): ServiceBranding {
    return SERVICE_BRANDING[serviceType.toLowerCase()] || SERVICE_BRANDING.accounting;
}

const CLIENT_TYPE_LABELS: Record<number, string> = {
    0: "Individual",
    1: "Business",
    2: "Private Company",
    3: "Closed Corporation",
    4: "Business Trust",
    5: "Sole Proprietorship",
};

const SERVICE_LABELS: Record<string, string> = {
    companyRegistration: "Company Registration",
    vatRegistration: "VAT Registration",
    payeRegistration: "PAYE Registration",
    publicOfficesRegistration: "Public Offices Registration",
    financialStatements: "Financial Statements",
    otherRegistration: "Other Registration",
    fullAccountingRetainer: "Full Accounting Service / Retainer",
    managementAccountsQuarterly: "Management Accounts (Quarterly)",
    finalYearEndAccounts: "Final Year End Accounts",
    companyTaxReturn: "Company Tax Return",
    companyProvisionalReturn: "Company Provisional Return",
    personalTaxReturns: "Personal Tax Returns",
    personalProvisionalReturn: "Personal Provisional Return",
    cipcAnnualReturn: "CIPC Annual Return",
    bookkeeping: "Monthly Bookkeeping",
    payroll: "Payroll Services",
    taxReturns: "Corporate Tax Returns",
    secretarial: "Company Secretarial",
    advisory: "Business Advisory",
    audit: "Independent Review / Audit",
};

function getClientName(data: EmailData): string {
    return data.contactPerson || data.name || "Unknown";
}

function getSelectedServices(services?: Record<string, boolean | string | undefined>): string[] {
    if (!services) return [];
    return Object.entries(services)
        .filter(([k, v]) => v === true && k !== "otherRegistrationDescription")
        .map(([k]) => SERVICE_LABELS[k] || k);
}

export function buildTeamNotificationHtml(data: EmailData, serviceType: string, dynamicsId?: string | null): string {
    const clientName = getClientName(data);
    const clientTypeLabel = CLIENT_TYPE_LABELS[data.clientType ?? 0] || "Unknown";
    const selectedServices = getSelectedServices(data.services);
    const now = new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" });
    const crmBaseUrl = process.env.DYNAMICS_RESOURCE_URL?.replace(/\/$/, "") || "";
    const crmLink = dynamicsId && crmBaseUrl
        ? `${crmBaseUrl}/main.aspx?pagetype=entityrecord&etn=new_lead&id=${dynamicsId}`
        : "";

    let servicesHtml = "";
    if (selectedServices.length > 0) {
        servicesHtml = `
            <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #555; font-weight: 600;">Services</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${selectedServices.join(", ")}</td>
            </tr>`;
    }

    let companyHtml = "";
    if (data.companyName) {
        companyHtml = `
            <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #555; font-weight: 600;">Company</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${data.companyName}</td>
            </tr>`;
    }

    const industryHtml = data.industryName
        ? `<tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #555; font-weight: 600;">Industry</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${data.industryName}</td>
            </tr>`
        : "";

    const notesContent = data.notes || data.message || "N/A";

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #0077BB; padding: 24px 32px;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 20px;">New Lead Submission</h1>
                            <p style="margin: 4px 0 0; color: #cce5ff; font-size: 14px;">${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} Services</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 24px 32px;">
                            <p style="margin: 0 0 16px; color: #333; font-size: 14px;">A new lead has been submitted via the website form.</p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #333;">
                                <tr>
                                    <td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #555; font-weight: 600; width: 140px;">Name</td>
                                    <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${clientName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #555; font-weight: 600;">Email</td>
                                    <td style="padding: 8px 12px; border-bottom: 1px solid #eee;"><a href="mailto:${data.email}" style="color: #0077BB;">${data.email}</a></td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #555; font-weight: 600;">Phone</td>
                                    <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${data.phone}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #555; font-weight: 600;">Client Type</td>
                                    <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${clientTypeLabel}</td>
                                </tr>${companyHtml}${industryHtml}${servicesHtml}
                                <tr>
                                    <td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #555; font-weight: 600;">Notes</td>
                                    <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${notesContent}</td>
                                </tr>
                            </table>
                            ${crmLink ? `<a href="${crmLink}" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background-color: #0077BB; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;">View in CRM</a>` : ""}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 16px 32px; background-color: #f9f9f9; font-size: 12px; color: #999;">
                            Submitted on ${now}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

export function buildClientThankYouHtml(
    data: EmailData,
    serviceType: string,
    consultation?: ConsultationData | null,
    footerImageUrl?: string
): string {
    const clientName = getClientName(data);
    const firstName = clientName.split(" ")[0];
    footerImageUrl = footerImageUrl || process.env.EMAIL_FOOTER_IMAGE_URL || "";
    const logoUrl = process.env.EMAIL_LOGO_URL || "";
    const branding = getServiceBranding(serviceType);

    let consultationSection: string;
    if (consultation) {
        consultationSection = `
            <p style="margin: 0 0 12px; font-style: italic; color: #555;">If a consultation has been booked:</p>
            <p style="margin: 0 0 16px;">Please see below for your 15 min consultation details:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFFDE7; border: 1px solid #FFF9C4; border-radius: 6px; margin: 0 0 20px;">
                <tr><td style="padding: 16px 20px; font-size: 14px; color: #333;">
                    <strong>Date:</strong> ${consultation.date}<br>
                    <strong>Time:</strong> ${consultation.time}<br>
                    <strong>${branding.roleTerm}:</strong> ${consultation.accountant}
                </td></tr>
            </table>
            <p style="margin: 0 0 16px;">We are looking forward to meeting you.</p>
            <p style="margin: 0 0 16px;">Should you have any questions after this consultation, please feel free to contact your ${branding.roleTerm}.</p>`;
    } else {
        consultationSection = `
            <p style="margin: 0 0 16px;">Please note that we will be in contact with you as soon as possible to continue this process.</p>
            <p style="margin: 0 0 16px;">Should you have any questions, please share these questions with your ${branding.roleTerm}.</p>`;
    }

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #0077BB; padding: 24px 32px;">
                            ${logoUrl ? `<img src="${logoUrl}" alt="TTT Logo" height="40" style="display: block; height: 40px; width: auto; margin-bottom: 12px;" />` : ""}
                            <h1 style="margin: 0; color: #ffffff; font-size: 20px;">${branding.brandName}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px;">
                            <p style="margin: 0 0 16px; font-size: 14px; color: #333;">Dear ${firstName},</p>
                            <p style="margin: 0 0 16px; font-size: 14px; color: #333;">Thank you for your interest in our ${branding.serviceLabel}. We have received your introduction form and we are currently busy processing your information. We strive to provide accurate and timely information and services.</p>
                            <div style="font-size: 14px; color: #333;">
                                ${consultationSection}
                            </div>
                            <p style="margin: 24px 0 4px; font-size: 14px; color: #333;">Kind Regards,</p>
                            <p style="margin: 0 0 4px; font-size: 14px; color: #333; font-weight: 600;">${branding.brandName}</p>
                            <p style="margin: 0; font-size: 13px; color: #555;">Tel: ${branding.phone} | Email: <a href="mailto:${branding.replyEmail}" style="color: #0077BB;">${branding.replyEmail}</a></p>
                        </td>
                    </tr>
                    ${footerImageUrl ? `<tr>
                        <td style="padding: 24px 32px 0;">
                            <img src="${footerImageUrl}" alt="TTT Accounting" width="536" style="display: block; width: 100%; height: auto;" />
                        </td>
                    </tr>` : ""}
                    <tr>
                        <td style="padding: 16px 32px; background-color: #f9f9f9; font-size: 10px; color: #999; line-height: 1.4;">
                            This e-mail and any files transmitted with it may contain information that is confidential, privileged or otherwise protected from disclosure. If you are not an intended recipient of this e-mail, do not duplicate or redistribute it by any means. Please delete it and any attachments and notify the sender that you have received it in error. Unless specifically indicated, this e-mail is not an offer to buy or sell or a solicitation to buy or sell any securities, investment products or other financial product or service. Any views or opinions presented are solely those of the author and do not necessarily represent those of TTT Tax Services.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}
