export interface DynamicsLead {
    subject: string;
    description: string;
    ttt_firstname: string;
    ttt_lastname: string;
    ttt_email: string;
    ttt_mobilephone?: string;
    riivo_companyname?: string; // For business clients
    riivo_vatnumber?: string;
    riivo_incometaxnumber?: string;
    // Add other fields as needed based on lead.json
}

export interface DynamicsAnnotation {
    subject: string;
    filename: string;
    documentbody: string; // Base64 content
    mimetype: string;
    objectid_new_lead?: string; // Bind to new_lead
    "objectid_new_lead@odata.bind"?: string; // The specific binding property
}
