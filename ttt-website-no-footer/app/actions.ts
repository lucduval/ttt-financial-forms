"use server";

import { headers } from "next/headers";
import { createRecord, updateRecord, getRecords, uploadFileColumn } from "./lib/dynamics";
import {
    sendTeamNotificationEmail,
    sendClientThankYouEmail,
    sendSignedLoeEmails,
    sendContactFormTeamEmail,
} from "./lib/email";
import { mintLoeToken, verifyLoeToken } from "./lib/loe-token";
import {
    buildReferenceId,
    buildSignedLoePdf,
    loadLoeSourceBytes,
    type SignatureMetadata,
} from "./lib/loe-pdf";
import { LOE_DOCUMENT_VERSION } from "./components/LoeTermsContent";

export async function getIndustries() {
    try {
        if (!process.env.DYNAMICS_CLIENT_ID) {
            return [];
        }
        const res = await getRecords('riivo_industries', "?$select=riivo_industry,riivo_industryid&$filter=statecode eq 0");
        if (res.success && res.value) {
            return res.value.map((ind: any) => ({
                id: ind.riivo_industryid,
                name: ind.riivo_industry
            })).sort((a: any, b: any) => a.name.localeCompare(b.name));
        }
        return [];
    } catch (error) {
        console.error("Failed to fetch industries:", error);
        return [];
    }
}

export async function getBrandAssociates(): Promise<{ slug: string; displayName: string }[]> {
    try {
        if (!process.env.DYNAMICS_CLIENT_ID) {
            return [];
        }
        const res = await getRecords(
            'systemusers',
            "?$select=firstname&$filter=jobtitle eq 'Brand Associate' and isdisabled eq false"
        );
        if (!res.success || !res.value) return [];
        const seen = new Set<string>();
        const list: { slug: string; displayName: string }[] = [];
        for (const u of res.value) {
            const firstName = typeof u.firstname === 'string' ? u.firstname.trim() : '';
            if (!firstName) continue;
            const slug = firstName.toLowerCase();
            if (seen.has(slug)) continue;
            seen.add(slug);
            list.push({ slug, displayName: firstName });
        }
        return list.sort((a, b) => a.displayName.localeCompare(b.displayName));
    } catch (error) {
        console.error("Failed to fetch brand associates:", error);
        return [];
    }
}

const MARKETER_SLUG_RE = /^[a-z0-9-]{1,40}$/;

type DuplicateLookupResult = { isDuplicate: false } | { isDuplicate: true; referralCodeOnFile: string | null };

async function findDuplicateLead(rawEmail: string): Promise<DuplicateLookupResult> {
    const email = rawEmail.trim().toLowerCase();
    if (!email) return { isDuplicate: false };
    if (!process.env.DYNAMICS_CLIENT_ID) return { isDuplicate: false };
    const escaped = email.replace(/'/g, "''");

    let referralCodeOnFile: string | null = null;
    let matched = false;

    try {
        const contactRes = await getRecords(
            'contacts',
            `?$select=contactid,riivo_referralcode&$filter=emailaddress1 eq '${escaped}' and statecode eq 0&$top=1`
        );
        const contact = contactRes.success && contactRes.value && contactRes.value[0];
        if (contact) {
            matched = true;
            const code = typeof contact.riivo_referralcode === 'string' ? contact.riivo_referralcode.trim() : '';
            referralCodeOnFile = code || null;
        }
    } catch (err) {
        console.error("Duplicate lookup (contacts) failed:", err);
    }

    if (!matched) {
        try {
            const leadRes = await getRecords(
                'new_leads',
                `?$select=new_leadid&$filter=ttt_email eq '${escaped}'&$top=1`
            );
            if (leadRes.success && leadRes.value && leadRes.value[0]) {
                matched = true;
            }
        } catch (err) {
            console.error("Duplicate lookup (new_leads) failed:", err);
        }
    }

    return matched ? { isDuplicate: true, referralCodeOnFile } : { isDuplicate: false };
}

async function resolveMarketerSystemUserId(rawSlug: string): Promise<string | null> {
    const slug = rawSlug.trim().toLowerCase();
    if (!slug || !MARKETER_SLUG_RE.test(slug)) {
        console.warn(`Marketer slug "${rawSlug}" failed validation — skipping attribution.`);
        return null;
    }
    if (!process.env.DYNAMICS_CLIENT_ID) return null;
    const escaped = slug.replace(/'/g, "''");
    const lookup = await getRecords(
        'systemusers',
        `?$select=systemuserid&$filter=jobtitle eq 'Brand Associate' and isdisabled eq false and tolower(firstname) eq '${escaped}'&$top=2`
    );
    const matches = lookup.success && lookup.value ? lookup.value : [];
    if (matches.length === 1) {
        return matches[0].systemuserid;
    }
    console.warn(`Marketer slug "${slug}" matched ${matches.length} brand associates — skipping attribution.`);
    return null;
}

export async function submitContactForm(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    message: string;
}): Promise<{ success: boolean; error?: string }> {
    const leadData: Record<string, unknown> = {
        ttt_firstname: data.firstName,
        ttt_lastname: data.lastName,
        ttt_email: data.email,
        ttt_mobilephone: data.phone,
        riivo_notes: `Website Contact\n\n${data.message}`,
        riivo_clienttype: 0,
        riivo_leadtype: 100000000,
        riivo_leadsource: 463630001,
    };

    const taxOwnerId = process.env.DYNAMICS_TAX_OWNER_ID;
    const ownerTeamId = process.env.DYNAMICS_OWNER_TEAM_ID;
    if (taxOwnerId) {
        leadData["ownerid@odata.bind"] = `/systemusers(${taxOwnerId})`;
    } else if (ownerTeamId) {
        leadData["ownerid@odata.bind"] = `/teams(${ownerTeamId})`;
    }

    let dynamicsId: string | null = null;
    try {
        if (process.env.DYNAMICS_CLIENT_ID) {
            const result = await createRecord('new_leads', leadData);
            dynamicsId = result.id ?? null;
        } else {
            await new Promise(resolve => setTimeout(resolve, 800));
            return { success: true };
        }
    } catch (error) {
        console.error("Contact form submission failed:", error);
        return { success: false, error: "Submission failed. Please try again." };
    }

    try {
        await sendContactFormTeamEmail(data, dynamicsId);
    } catch (emailError) {
        console.error("Contact form team email failed (lead was created):", emailError);
    }

    return { success: true };
}

interface FormSubmitData {
    companyName?: string;
    vatNumber?: string;
    payeNumber?: string;
    taxNumber?: string;
    idNumber?: string;
    industry?: string;
    industryName?: string;
    notes?: string;
    contactPerson?: string;
    email: string;
    phone: string;
    companyEmail?: string;
    companyPhone?: string;
    address?: string;
    message?: string;
    name?: string;
    clientType?: number;
    companyAddress?: string;
    annualTurnover?: string;
    currentSystem?: string;
    hasExistingAccountant?: string;
    referralSource?: string;
    referrerName?: string;
    referralCode?: string;
    marketerSlug?: string;
    services?: {
        // Legacy fields
        bookkeeping?: boolean;
        payroll?: boolean;
        taxReturns?: boolean;
        financialStatements?: boolean;
        secretarial?: boolean;
        advisory?: boolean;
        audit?: boolean;
        vatRegistration?: boolean;
        // New service fields
        companyRegistration?: boolean;
        payeRegistration?: boolean;
        publicOfficesRegistration?: boolean;
        otherRegistration?: boolean;
        otherRegistrationDescription?: string;
        fullAccountingRetainer?: boolean;
        managementAccountsQuarterly?: boolean;
        finalYearEndAccounts?: boolean;
        companyTaxReturn?: boolean;
        companyProvisionalReturn?: boolean;
        personalTaxReturns?: boolean;
        personalProvisionalReturn?: boolean;
        cipcAnnualReturn?: boolean;
    };
    existingRegistrations?: {
        existing_vat?: boolean;
        existing_paye?: boolean;
        existing_incomeTax?: boolean;
        existing_uif?: boolean;
        existing_customs?: boolean;
        existing_coida?: boolean;
    };
    files?: Array<{ name: string; content: string; type: string }>;
}


export async function submitTargetData(data: FormSubmitData, serviceType: string, options?: { sendEmails?: boolean; existingLeadId?: string }) {
    console.log(`Submitting data for service: ${serviceType}`);

    if (!options?.existingLeadId && data.email) {
        const dup = await findDuplicateLead(data.email);
        if (dup.isDuplicate) {
            const enteredCode = (data.referralCode || '').trim().toLowerCase();
            const ownCode = (dup.referralCodeOnFile || '').trim().toLowerCase();
            const matchesOwnCode = enteredCode.length > 0 && ownCode.length > 0 && enteredCode === ownCode;
            console.log(`Duplicate signup blocked for ${data.email} (reason: ${matchesOwnCode ? 'own-code' : 'generic'}).`);
            return { success: false as const, duplicate: matchesOwnCode ? ('own-code' as const) : ('generic' as const) };
        }
    }

    let description = `Service Type: ${serviceType}\n\n`;

    const riivo_clienttype = data.clientType !== undefined ? data.clientType : 0;
    const riivo_leadsource = 463630001;
    let riivo_leadtype = 100000000;

    const st = serviceType.toLowerCase();
    if (st === 'tax') {
        riivo_leadtype = 100000000;
    } else if (st === 'accounting') {
        riivo_leadtype = 100000001;
    } else if (st === 'advisory') {
        riivo_leadtype = 463630001;
    } else if (st === 'insurance') {
        riivo_leadtype = 463630002;
    }

    let _riivo_industry_lookup_value = data.industry || null;
    let leadData: Record<string, unknown> = {};

    if (serviceType === 'accounting') {
        const contactName = data.contactPerson || data.name || 'Unknown';
        if (data.companyName) description += `Company: ${data.companyName}\n`;
        description += `Notes: ${data.notes || 'N/A'}\n`;

        // Build services summary for description
        const serviceLabels: Record<string, string> = {
            companyRegistration: 'Company Registration',
            vatRegistration: 'VAT Registration',
            payeRegistration: 'PAYE Registration',
            publicOfficesRegistration: 'Public Offices Registration',
            financialStatements: 'Financial Statements',
            otherRegistration: 'Other Registration',
            fullAccountingRetainer: 'Full Accounting Service / Retainer',
            managementAccountsQuarterly: 'Management Accounts (Quarterly)',
            finalYearEndAccounts: 'Final Year End Accounts',
            companyTaxReturn: 'Company Tax Return',
            companyProvisionalReturn: 'Company Provisional Return',
            personalTaxReturns: 'Personal Tax Returns',
            personalProvisionalReturn: 'Personal Provisional Return',
            cipcAnnualReturn: 'CIPC Annual Return',
            // Legacy
            bookkeeping: 'Monthly Bookkeeping',
            payroll: 'Payroll Services',
            taxReturns: 'Corporate Tax Returns',
            secretarial: 'Company Secretarial',
            advisory: 'Business Advisory',
            audit: 'Independent Review / Audit',
        };
        if (data.services) {
            const selected = Object.entries(data.services)
                .filter(([k, v]) => v === true && k !== 'otherRegistrationDescription')
                .map(([k]) => serviceLabels[k] || k);
            if (selected.length > 0) {
                description += `Services: ${selected.join(', ')}\n`;
            }
            if (data.services.otherRegistration && data.services.otherRegistrationDescription) {
                description += `Other Registration Details: ${data.services.otherRegistrationDescription}\n`;
            }
        }

        const nameParts = contactName.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown';

        leadData = {
            ttt_firstname: firstName,
            ttt_lastname: lastName,
            ttt_email: data.email,
            ttt_mobilephone: data.phone,
            riivo_companyname: data.companyName,
            // Legacy service fields (map new fields to existing CRM fields where possible)
            riivo_vatregistrationfiling: data.services?.vatRegistration ?? false,
            riivo_annualfinancialstatements: data.services?.financialStatements ?? false,
            riivo_corporatetaxreturns: data.services?.companyTaxReturn ?? data.services?.taxReturns ?? false,
            riivo_monthlybookkeeping: data.services?.bookkeeping ?? false,
            riivo_payrollservices: data.services?.payroll ?? false,
            riivo_companysecretarial: data.services?.secretarial ?? false,
            riivo_businessadvisory: data.services?.advisory ?? false,
            riivo_independentreviewaudit: data.services?.audit ?? false,
            riivo_notes: description,
            riivo_clienttype,
            riivo_leadtype,
            riivo_leadsource,
            ...(_riivo_industry_lookup_value && { "riivo_Industry_lookup@odata.bind": `/riivo_industries(${_riivo_industry_lookup_value})` })
        };
    } else {
        description += `Message: ${data.message || 'N/A'}`;
        if (data.referralCode) {
            description += `\nReferral Code: ${data.referralCode}`;
        }

        const nameParts = data.name?.trim().split(' ') || ['Unknown'];
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown';

        leadData = {
            ttt_firstname: firstName,
            ttt_lastname: lastName,
            ttt_email: data.email,
            ttt_mobilephone: data.phone,
            ttt_idnumber: data.idNumber,
            riivo_notes: description,
            riivo_clienttype,
            riivo_leadtype,
            riivo_leadsource,
            ...(_riivo_industry_lookup_value && { "riivo_Industry_lookup@odata.bind": `/riivo_industries(${_riivo_industry_lookup_value})` })
        };

        if (st === 'tax' && data.referralCode) {
            const code = data.referralCode.trim();
            if (code) {
                try {
                    const escaped = code.replace(/'/g, "''");
                    const lookup = await getRecords(
                        'contacts',
                        `?$select=contactid&$filter=riivo_referralcode eq '${escaped}'&$top=1`
                    );
                    const referrerId = lookup.success && lookup.value && lookup.value[0]?.contactid;
                    if (referrerId) {
                        const src = (data.referralSource || '').toLowerCase();
                        let referralSourceValue = 463630002; // Other
                        if (src === 'campaign' || src === 'may2026' || src === 'may-2026') {
                            referralSourceValue = 463630000;
                        } else if (src === 'whatsapp' || src === 'wa') {
                            referralSourceValue = 463630001;
                        }
                        leadData["riivo_Referrer@odata.bind"] = `/contacts(${referrerId})`;
                        leadData["riivo_validreferral"] = true;
                        leadData["riivo_referralcode"] = code;
                        leadData["riivo_referralcodeused"] = code;
                        leadData["riivo_referraldate"] = new Date().toISOString();
                        leadData["riivo_referralsource"] = referralSourceValue;
                    } else {
                        console.log(`Referral code "${code}" did not match any contact.`);
                    }
                } catch (err) {
                    console.error("Referral code lookup failed:", err);
                }
            }
        }
    }

    if (data.marketerSlug) {
        try {
            const marketerId = await resolveMarketerSystemUserId(data.marketerSlug);
            if (marketerId) {
                leadData["riivo_Marketer@odata.bind"] = `/systemusers(${marketerId})`;
            }
        } catch (err) {
            console.error("Marketer slug lookup failed:", err);
        }
    }

    try {
        if (!process.env.DYNAMICS_CLIENT_ID) {
            console.warn("Dynamics credentials not found. simulating success.");
            return { success: true, simulated: true };
        }

        // Assign lead owner based on service type
        const serviceOwnerEnv: Record<string, string | undefined> = {
            tax: process.env.DYNAMICS_TAX_OWNER_ID,
            insurance: process.env.DYNAMICS_INSURANCE_OWNER_ID,
            advisory: process.env.DYNAMICS_ADVISORY_OWNER_ID,
        };
        const serviceOwnerId = serviceOwnerEnv[serviceType];
        if (serviceOwnerId) {
            leadData["ownerid@odata.bind"] = `/systemusers(${serviceOwnerId})`;
        } else {
            const teamId = process.env.DYNAMICS_OWNER_TEAM_ID;
            if (teamId) {
                leadData["ownerid@odata.bind"] = `/teams(${teamId})`;
            }
        }

        let dynamicsId: string | null = null;

        if (options?.existingLeadId) {
            console.log("Updating existing Lead in Dynamics:", options.existingLeadId);
            await updateRecord('new_leads', options.existingLeadId, leadData);
            dynamicsId = options.existingLeadId;
            console.log("Lead updated with ID:", dynamicsId);
        } else {
            console.log("Creating Lead in Dynamics...");
            const result = await createRecord('new_leads', leadData);
            dynamicsId = result.id;
            console.log("Lead created with ID:", dynamicsId);
        }

        if (!dynamicsId) {
            console.warn("No lead ID returned — skipping document upload.");
        } else if (data.files && data.files.length > 0) {
            console.log(`Uploading ${data.files.length} documents for lead ${dynamicsId}...`);
            for (const file of data.files) {
                const annotationData = {
                    subject: `Document: ${file.name}`,
                    filename: file.name,
                    documentbody: file.content,
                    mimetype: file.type,
                    isdocument: true,
                    "objectid_new_lead@odata.bind": `/new_leads(${dynamicsId})`
                };
                console.log(`Uploading annotation for file: ${file.name}`);
                await createRecord('annotations', annotationData);
            }
            console.log("All documents uploaded successfully.");
        }

        let loeToken: string | null = null;
        if (dynamicsId && st === 'tax' && process.env.LOE_SIGNING_SECRET) {
            try {
                loeToken = mintLoeToken(dynamicsId);
            } catch (tokenError) {
                console.error("Failed to mint LoE signing token:", tokenError);
            }
        }

        let loeSignUrl: string | undefined;
        if (dynamicsId && loeToken) {
            try {
                const h = await headers();
                const host = h.get("x-forwarded-host") || h.get("host");
                const proto = h.get("x-forwarded-proto") || "https";
                if (host) {
                    loeSignUrl = `${proto}://${host}/onboarding/loe/${dynamicsId}?token=${encodeURIComponent(loeToken)}`;
                }
            } catch (urlError) {
                console.error("Failed to build LoE signing URL:", urlError);
            }
        }

        // Send emails after successful lead creation
        if (options?.sendEmails !== false) {
            try {
                await Promise.all([
                    sendTeamNotificationEmail(data, serviceType, dynamicsId),
                    sendClientThankYouEmail(data, serviceType, null, loeSignUrl),
                ]);
                console.log("Emails sent successfully.");
            } catch (emailError) {
                console.error("Email sending failed:", emailError);
            }
        }

        return { success: true, dynamicsId: dynamicsId, loeToken };

    } catch (error: any) {
        console.error("Failed to submit to Dynamics:", error);
        throw new Error(`Failed to submit to Dynamics CRM: ${error.message}`);
    }
}

interface SignLoeInput {
    leadId: string;
    token: string;
    fullName: string;
    idNumber: string;
    taxNumber: string;
    bankName: string;
    accountName: string;
    accountType: string;
    accountNumber: string;
    branchCode: string;
    signaturePng: string;
    optOutMarketing: boolean;
    userAgent?: string;
}

interface SignLoeResult {
    success: boolean;
    error?: string;
    reference?: string;
}

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function signLoE(input: SignLoeInput): Promise<SignLoeResult> {
    if (!input.leadId || !GUID_RE.test(input.leadId)) {
        return { success: false, error: "Invalid signing request." };
    }
    if (!input.fullName || input.fullName.trim().length < 2) {
        return { success: false, error: "Please provide your full legal name." };
    }
    const requiredDetails: Array<[string, string]> = [
        ["ID number", input.idNumber],
        ["Income tax number", input.taxNumber],
        ["Bank name", input.bankName],
        ["Account name", input.accountName],
        ["Account type", input.accountType],
        ["Account number", input.accountNumber],
        ["Branch name / code", input.branchCode],
    ];
    for (const [label, value] of requiredDetails) {
        if (!value || !value.trim()) {
            return { success: false, error: `Please provide your ${label}.` };
        }
    }
    if (!input.signaturePng || !input.signaturePng.startsWith("data:image/png;base64,")) {
        return { success: false, error: "Please draw your signature before submitting." };
    }

    if (!process.env.LOE_SIGNING_SECRET) {
        console.error("LOE_SIGNING_SECRET is not configured.");
        return { success: false, error: "Signing is not currently configured. Please contact us." };
    }

    const tokenCheck = verifyLoeToken(input.leadId, input.token);
    if (!tokenCheck.valid) {
        return { success: false, error: tokenCheck.reason };
    }

    if (!process.env.DYNAMICS_CLIENT_ID) {
        console.warn("Dynamics not configured — LoE signing will not persist.");
        return { success: false, error: "Signing service is unavailable. Please try again shortly." };
    }

    let leadEmail = "";
    let leadPhone = "";
    let leadAddress = "";
    let leadIndustry = "";
    let crmName = input.fullName.trim();
    try {
        const selectFields = [
            "ttt_firstname",
            "ttt_lastname",
            "ttt_email",
            "ttt_mobilephone",
            "riivo_loesigned",
            "riivo_otherindustry",
            "riivo_address1street1",
            "riivo_address1street2",
            "riivo_address1street3",
            "riivo_city",
            "riivo_province",
            "riivo_zippostalcode",
        ].join(",");
        const res = await getRecords(
            "new_leads",
            `?$select=${selectFields}&$expand=riivo_Industry_lookup($select=riivo_industry)&$filter=new_leadid eq ${input.leadId}`
        );
        const row = res.success && res.value && res.value[0];
        if (!row) {
            return { success: false, error: "We could not locate your lead record. Please contact us." };
        }
        if (row.riivo_loesigned === true) {
            return { success: false, error: "This Letter of Engagement has already been signed. A copy was emailed to you." };
        }
        leadEmail = row.ttt_email || "";
        leadPhone = row.ttt_mobilephone || "";
        leadAddress = [row.riivo_address1street1, row.riivo_address1street2, row.riivo_address1street3, row.riivo_city, row.riivo_province, row.riivo_zippostalcode]
            .filter(Boolean)
            .join(", ");
        leadIndustry = row.riivo_Industry_lookup?.riivo_industry || row.riivo_otherindustry || "";
        const dynamicsName = [row.ttt_firstname, row.ttt_lastname].filter(Boolean).join(" ").trim();
        if (dynamicsName) crmName = dynamicsName;
    } catch (err) {
        console.error("Failed to fetch lead before signing:", err);
        return { success: false, error: "We could not verify your record. Please try again." };
    }

    const signedAt = new Date();
    const signedAtIso = signedAt.toISOString();
    const signedAtDisplay = signedAt.toLocaleString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        dateStyle: "long",
        timeStyle: "short",
    });
    const referenceId = buildReferenceId(input.leadId, signedAt);

    let ipAddress = "";
    try {
        const h = await headers();
        ipAddress = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "";
    } catch {
        ipAddress = "";
    }

    const metadata: SignatureMetadata = {
        fullName: input.fullName.trim(),
        leadId: input.leadId,
        referenceId,
        signedAtIso,
        signedAtDisplay,
        ipAddress,
        userAgent: input.userAgent || "",
        documentVersion: LOE_DOCUMENT_VERSION,
        optOutMarketing: input.optOutMarketing,
        idNumber: input.idNumber.trim(),
        taxNumber: input.taxNumber.trim(),
        bankName: input.bankName.trim(),
        accountName: input.accountName.trim(),
        accountType: input.accountType.trim(),
        accountNumber: input.accountNumber.trim(),
        branchCode: input.branchCode.trim(),
        email: leadEmail,
        phone: leadPhone,
        physicalAddress: leadAddress,
        industry: leadIndustry,
    };

    let signedPdfBase64 = "";
    try {
        const sourceBytes = await loadLoeSourceBytes();
        const signedBytes = await buildSignedLoePdf(sourceBytes, input.signaturePng, metadata);
        signedPdfBase64 = Buffer.from(signedBytes).toString("base64");
    } catch (err) {
        console.error("Failed to build signed LoE PDF:", err);
        return { success: false, error: "We could not generate your signed document. Please try again." };
    }

    const signedFilename = `TTT-LoE-Signed-${signedAt.toISOString().slice(0, 10)}-${input.leadId.slice(0, 8)}.pdf`;

    try {
        await createRecord("annotations", {
            subject: "Signed Letter of Engagement",
            filename: signedFilename,
            documentbody: signedPdfBase64,
            mimetype: "application/pdf",
            isdocument: true,
            notetext: `Reference: ${referenceId}\nSigned by: ${metadata.fullName}\nSigned at: ${signedAtIso}\nDocument version: ${LOE_DOCUMENT_VERSION}\nIP: ${ipAddress || "n/a"}\nMarketing opt-out: ${input.optOutMarketing ? "yes" : "no"}`,
            "objectid_new_lead@odata.bind": `/new_leads(${input.leadId})`,
        });
    } catch (err) {
        console.error("Failed to upload signed LoE annotation:", err);
        return { success: false, error: "We could not save your signed document. Please contact us." };
    }

    try {
        await updateRecord("new_leads", input.leadId, {
            riivo_loesigned: true,
            riivo_loesignedat: signedAtIso,
            riivo_loesubmitted: true,
            riivo_loesubmissiondate: signedAtIso,
            riivo_loereceived: true,
            riivo_loe_signedname: metadata.fullName,
            riivo_loereference: referenceId,
            riivo_loemarketingouput: input.optOutMarketing,
            ttt_idnumber: input.idNumber.trim(),
            riivo_incometaxnumber: input.taxNumber.trim(),
            riivo_bankname: input.bankName.trim(),
            riivo_accountname: input.accountName.trim(),
            riivo_accounttype: input.accountType.trim(),
            riivo_accountnumber: input.accountNumber.trim(),
            riivo_branchnamecode: input.branchCode.trim(),
        });
    } catch (err) {
        console.warn("Failed to update lead audit fields (annotation already saved):", err);
    }

    try {
        const signatureBase64 = input.signaturePng.split(",")[1] || "";
        if (signatureBase64) {
            const signatureBytes = new Uint8Array(Buffer.from(signatureBase64, "base64"));
            await uploadFileColumn(
                "new_leads",
                input.leadId,
                "riivo_signatureclient",
                signatureBytes,
                `signature-${referenceId}.png`
            );
        }
    } catch (err) {
        console.warn("Failed to upload signature to riivo_signatureclient (annotation already saved):", err);
    }

    try {
        const signedPdfBytes = new Uint8Array(Buffer.from(signedPdfBase64, "base64"));
        await uploadFileColumn(
            "new_leads",
            input.leadId,
            "riivo_signedletterofengagement",
            signedPdfBytes,
            signedFilename
        );
    } catch (err) {
        console.warn("Failed to upload signed LoE to riivo_signedletterofengagement (annotation already saved):", err);
    }

    try {
        const crmBaseUrl = process.env.DYNAMICS_RESOURCE_URL?.replace(/\/$/, "") || "";
        const crmLink = crmBaseUrl
            ? `${crmBaseUrl}/main.aspx?pagetype=entityrecord&etn=new_lead&id=${input.leadId}`
            : "";
        await sendSignedLoeEmails({
            clientEmail: leadEmail,
            clientName: crmName,
            referenceId,
            signedAtDisplay,
            signedPdfBase64,
            signedPdfFilename: signedFilename,
            crmLink,
        });
    } catch (err) {
        console.error("Failed to send signed LoE emails:", err);
    }

    return { success: true, reference: referenceId };
}
