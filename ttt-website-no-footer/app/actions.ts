"use server";

import { createRecord, updateRecord, getRecords } from "./lib/dynamics";
import { sendTeamNotificationEmail, sendClientThankYouEmail } from "./lib/email";

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

export async function submitContactForm(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    message: string;
}): Promise<{ success: boolean; error?: string }> {
    const leadData = {
        subject: `Website Contact — ${data.firstName} ${data.lastName}`,
        ttt_firstname: data.firstName,
        ttt_lastname: data.lastName,
        ttt_email: data.email,
        ttt_mobilephone: data.phone,
        description: data.message,
    };

    try {
        if (process.env.DYNAMICS_CLIENT_ID) {
            await createRecord('new_leads', leadData);
        } else {
            await new Promise(resolve => setTimeout(resolve, 800));
        }
        return { success: true };
    } catch (error) {
        console.error("Contact form submission failed:", error);
        return { success: false, error: "Submission failed. Please try again." };
    }
}

interface FormSubmitData {
    companyName?: string;
    vatNumber?: string;
    payeNumber?: string;
    taxNumber?: string;
    idNumber?: string;
    industry?: string;
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
    }

    try {
        if (!process.env.DYNAMICS_CLIENT_ID) {
            console.warn("Dynamics credentials not found. simulating success.");
            return { success: true, simulated: true };
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

        // Send emails after successful lead creation
        if (options?.sendEmails !== false) {
            try {
                await Promise.all([
                    sendTeamNotificationEmail(data, serviceType, dynamicsId),
                    sendClientThankYouEmail(data, serviceType),
                ]);
                console.log("Emails sent successfully.");
            } catch (emailError) {
                console.error("Email sending failed:", emailError);
            }
        }

        return { success: true, dynamicsId: dynamicsId };

    } catch (error: any) {
        console.error("Failed to submit to Dynamics:", error);
        throw new Error(`Failed to submit to Dynamics CRM: ${error.message}`);
    }
}
