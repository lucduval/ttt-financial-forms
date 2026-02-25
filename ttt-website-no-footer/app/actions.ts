"use server";

import { createRecord } from "./lib/dynamics";

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
    taxNumber?: string;
    notes?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    message?: string;
    name?: string;
    files?: Array<{ name: string; content: string; type: string }>;
}

export async function submitTargetData(data: FormSubmitData, serviceType: string) {
    console.log(`Submitting data for service: ${serviceType}`, data);

    let subject = `New Inquiry - ${serviceType}`;
    let description = `Service Type: ${serviceType}\n\n`;

    // Initialize the lead object with Dynamics field mappings
    let leadData: Record<string, unknown> = {};

    if (serviceType === 'accounting') {
        subject = `New Accounting Client Onboarding - ${data.companyName}`;
        description += `Company: ${data.companyName}\n`;
        description += `VAT: ${data.vatNumber}\n`;
        description += `Notes: ${data.notes}\n`;

        // Split contact person name
        const nameParts = data.contactPerson?.trim().split(' ') || ['Unknown'];
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown';

        leadData = {
            subject: subject,
            ttt_firstname: firstName,
            ttt_lastname: lastName,
            ttt_email: data.email,
            ttt_mobilephone: data.phone,
            riivo_companyname: data.companyName,
            riivo_vatnumber: data.vatNumber,
            riivo_incometaxnumber: data.taxNumber,
            description: description,
            // Mappings based on contact.json or inferred needs
            riivo_clienttype: 1 // Example, needs verification if enum
        };

    } else {
        // Simple form data
        description += `Message: ${data.message}`;

        // Split name
        const nameParts = data.name?.trim().split(' ') || ['Unknown'];
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown';

        leadData = {
            subject: subject,
            ttt_firstname: firstName,
            ttt_lastname: lastName,
            ttt_email: data.email,
            ttt_mobilephone: data.phone,
            description: description
        };
    }

    try {
        let dynamicsId = null;

        if (process.env.DYNAMICS_CLIENT_ID) {
            console.log("Creating Lead in Dynamics...");
            const result = await createRecord('new_leads', leadData);
            dynamicsId = result.id;

            // Handle Documents (Annotations)
            if (dynamicsId && data.files && data.files.length > 0) {
                console.log(`Uploading ${data.files.length} documents for lead ${dynamicsId}...`);

                for (const file of data.files) {
                    const annotationData = {
                        subject: `Document: ${file.name}`,
                        filename: file.name,
                        documentbody: file.content, // Base64 content
                        mimetype: file.type,
                        "objectid_new_lead@odata.bind": `/new_leads(${dynamicsId})`
                    };

                    await createRecord('annotations', annotationData);
                }
            }

            return { success: true, dynamicsId: dynamicsId };
        } else {
            console.warn("Dynamics credentials not found. simulating success.");
            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { success: true, simulated: true };
        }

    } catch (error) {
        console.error("Failed to submit to Dynamics:", error);
        throw error;
    }
}
