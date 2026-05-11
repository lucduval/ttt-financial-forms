import LoeSigningForm from "@/app/components/LoeSigningForm";
import { verifyLoeToken } from "@/app/lib/loe-token";
import { getRecords } from "@/app/lib/dynamics";

interface PageProps {
    params: Promise<{ leadId: string }>;
    searchParams: Promise<{ token?: string; name?: string }>;
}

interface LeadPrefill {
    name: string;
    email: string;
    idNumber: string;
    taxNumber: string;
    bankName: string;
    accountName: string;
    accountType: string;
    accountNumber: string;
    branchCode: string;
}

async function fetchLead(leadId: string): Promise<LeadPrefill | null> {
    if (!process.env.DYNAMICS_CLIENT_ID) return null;
    try {
        const safeId = leadId.replace(/[^a-fA-F0-9-]/g, "");
        if (!safeId || safeId !== leadId) return null;
        const res = await getRecords(
            "new_leads",
            `?$select=ttt_firstname,ttt_lastname,ttt_email,ttt_idnumber,riivo_incometaxnumber,riivo_bankname,riivo_accountname,riivo_accounttype,riivo_accountnumber,riivo_branchnamecode&$filter=new_leadid eq ${leadId}`
        );
        const row = res.success && res.value && res.value[0];
        if (!row) return null;
        return {
            name: [row.ttt_firstname, row.ttt_lastname].filter(Boolean).join(" ").trim(),
            email: row.ttt_email || "",
            idNumber: row.ttt_idnumber || "",
            taxNumber: row.riivo_incometaxnumber || "",
            bankName: row.riivo_bankname || "",
            accountName: row.riivo_accountname || "",
            accountType: row.riivo_accounttype || "",
            accountNumber: row.riivo_accountnumber || "",
            branchCode: row.riivo_branchnamecode || "",
        };
    } catch (err) {
        console.error("Failed to fetch lead for LoE signing:", err);
        return null;
    }
}

export default async function LoeSigningPage({ params, searchParams }: PageProps) {
    const { leadId } = await params;
    const { token = "", name: nameFromQuery = "" } = await searchParams;

    const verification = verifyLoeToken(leadId, token);
    if (!verification.valid) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-16 text-center">
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Signing link unavailable</h1>
                <p className="text-slate-600">{verification.reason}</p>
                <p className="text-sm text-slate-500 mt-4">
                    Please contact <a className="text-[#0077BB] hover:underline" href="mailto:admin@ttt-tax.co.za">admin@ttt-tax.co.za</a> if you need a new link.
                </p>
            </div>
        );
    }

    const lead = await fetchLead(leadId);
    const prefillName = lead?.name || nameFromQuery || "";

    return (
        <LoeSigningForm
            leadId={leadId}
            token={token}
            prefill={{
                fullName: prefillName,
                email: lead?.email || "",
                idNumber: lead?.idNumber || "",
                taxNumber: lead?.taxNumber || "",
                bankName: lead?.bankName || "",
                accountName: lead?.accountName || "",
                accountType: lead?.accountType || "",
                accountNumber: lead?.accountNumber || "",
                branchCode: lead?.branchCode || "",
            }}
        />
    );
}
