import { readFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface SignatureMetadata {
    fullName: string;
    leadId: string;
    referenceId: string;
    signedAtIso: string;
    signedAtDisplay: string;
    ipAddress: string;
    userAgent: string;
    documentVersion: string;
    optOutMarketing: boolean;
    idNumber: string;
    taxNumber: string;
    bankName: string;
    accountName: string;
    accountType: string;
    accountNumber: string;
    branchCode: string;
    email: string;
    phone: string;
    physicalAddress: string;
    industry: string;
}

const PAGE1_COORDS = {
    leftCol: {
        fullName: { x: 88, y: 670 },
        idNumber: { x: 88, y: 650 },
        taxNumber: { x: 128, y: 630 },
        physicalAddress: { x: 116, y: 612 },
        email: { x: 102, y: 595 },
        phone: { x: 112, y: 578 },
        industry: { x: 80, y: 561 },
    },
    rightCol: {
        bankName: { x: 380, y: 643 },
        accountName: { x: 390, y: 625 },
        accountTypeNumber: { x: 412, y: 608 },
        branchCode: { x: 408, y: 590 },
    },
    sign: {
        signedAt: { x: 360, y: 300 },
        day: { x: 358, y: 278 },
        month: { x: 440, y: 278 },
        year: { x: 520, y: 278 },
        clientName: { x: 370, y: 226 },
        signature: { x: 370, y: 188, width: 150, maxHeight: 28 },
    },
};

const LOE_SOURCE_PATH = path.join(process.cwd(), "public", "attachments", "tax-letter-of-engagement.pdf");

export async function loadLoeSourceBytes(): Promise<Uint8Array> {
    const buffer = await readFile(LOE_SOURCE_PATH);
    return new Uint8Array(buffer);
}

export function buildReferenceId(leadId: string, signedAt: Date): string {
    const shortLead = leadId.replace(/-/g, "").slice(0, 8).toUpperCase();
    const datePart = signedAt.toISOString().slice(0, 10).replace(/-/g, "");
    return `TTT-LOE-${shortLead}-${datePart}`;
}

export function hashSourceDocument(bytes: Uint8Array): string {
    return crypto.createHash("sha256").update(bytes).digest("hex");
}

export async function buildSignedLoePdf(
    sourceBytes: Uint8Array,
    signaturePngDataUrl: string,
    metadata: SignatureMetadata
): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(sourceBytes);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const signaturePngBytes = decodeDataUrl(signaturePngDataUrl);
    let signatureImage: import("pdf-lib").PDFImage | null = null;
    if (signaturePngBytes) {
        try {
            signatureImage = await pdfDoc.embedPng(signaturePngBytes);
        } catch (err) {
            console.error("Failed to embed signature image:", err);
        }
    }

    let formFieldsFilled = false;
    try {
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        if (fields.length > 0) {
            const fieldSummary = fields.map((f) => {
                const constructor = (f as { constructor?: { name?: string } }).constructor?.name || "unknown";
                return `${f.getName()} (${constructor})`;
            });
            console.log(`[LoE PDF] Discovered ${fields.length} form fields:\n  ${fieldSummary.join("\n  ")}`);
            fillLoeFormFields(form, metadata, signatureImage, pdfDoc);
            // The PDF owns positioning via AcroForm — don't draw a second coordinate-based copy on top.
            formFieldsFilled = true;
        } else {
            console.log("[LoE PDF] No AcroForm fields detected — falling back to coordinate overlay.");
        }
    } catch (err) {
        console.warn("[LoE PDF] Form-field detection failed, falling back to coordinates:", err);
    }

    if (!formFieldsFilled && pdfDoc.getPageCount() > 0) {
        fillLoePage1(pdfDoc.getPage(0), helvetica, metadata, signatureImage);
    }

    const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
    const { width, height } = page.getSize();

    const margin = 50;
    let cursorY = height - margin;

    page.drawText("Electronic Signature Certificate", {
        x: margin,
        y: cursorY,
        size: 18,
        font: helveticaBold,
        color: rgb(0.04, 0.27, 0.5),
    });
    cursorY -= 28;

    page.drawText("This page records the electronic signature applied to the preceding Letter of", {
        x: margin,
        y: cursorY,
        size: 10,
        font: helvetica,
        color: rgb(0.2, 0.2, 0.2),
    });
    cursorY -= 14;
    page.drawText("Engagement and Standard Terms and Conditions for Tax Services.", {
        x: margin,
        y: cursorY,
        size: 10,
        font: helvetica,
        color: rgb(0.2, 0.2, 0.2),
    });
    cursorY -= 24;

    const drawRow = (label: string, value: string) => {
        page.drawText(label, {
            x: margin,
            y: cursorY,
            size: 10,
            font: helveticaBold,
            color: rgb(0.3, 0.3, 0.3),
        });
        const valueLines = wrapText(value, helvetica, 10, width - margin - 170);
        let lineY = cursorY;
        for (const line of valueLines) {
            page.drawText(line, {
                x: margin + 160,
                y: lineY,
                size: 10,
                font: helvetica,
                color: rgb(0.1, 0.1, 0.1),
            });
            lineY -= 14;
        }
        cursorY = Math.min(cursorY - 14, lineY);
        cursorY -= 4;
    };

    drawRow("Signatory:", metadata.fullName);
    drawRow("ID number:", metadata.idNumber);
    drawRow("Income tax number:", metadata.taxNumber);
    drawRow("Bank name:", metadata.bankName);
    drawRow("Account name:", metadata.accountName);
    drawRow("Account type:", metadata.accountType);
    drawRow("Account number:", metadata.accountNumber);
    drawRow("Branch name / code:", metadata.branchCode);
    drawRow("Signed at (UTC):", metadata.signedAtIso);
    drawRow("Signed at (SAST):", metadata.signedAtDisplay);
    drawRow("Reference ID:", metadata.referenceId);
    drawRow("Lead ID:", metadata.leadId);
    drawRow("Document version:", metadata.documentVersion);
    drawRow("Source SHA-256:", hashSourceDocument(sourceBytes));
    drawRow("Client IP:", metadata.ipAddress || "Not recorded");
    drawRow("User agent:", metadata.userAgent || "Not recorded");
    drawRow("POPIA marketing opt-out:", metadata.optOutMarketing ? "Yes — opted out" : "No — consent given");

    cursorY -= 10;
    page.drawText("Acknowledgement", {
        x: margin,
        y: cursorY,
        size: 12,
        font: helveticaBold,
        color: rgb(0.04, 0.27, 0.5),
    });
    cursorY -= 18;

    const ack =
        "The signatory confirms that the preceding Letter of Engagement and Standard Terms and Conditions were displayed on-screen prior to signature, that the contents have been read and understood, and that this electronic signature is intended to have the same legal effect as a handwritten signature.";
    for (const line of wrapText(ack, helvetica, 10, width - margin * 2)) {
        page.drawText(line, {
            x: margin,
            y: cursorY,
            size: 10,
            font: helvetica,
            color: rgb(0.15, 0.15, 0.15),
        });
        cursorY -= 14;
    }

    cursorY -= 20;
    page.drawText("Signature:", {
        x: margin,
        y: cursorY,
        size: 11,
        font: helveticaBold,
        color: rgb(0.2, 0.2, 0.2),
    });
    cursorY -= 12;

    if (signatureImage) {
        const sigWidth = 240;
        const ratio = signatureImage.width === 0 ? 1 : signatureImage.height / signatureImage.width;
        const sigHeight = sigWidth * ratio;
        page.drawRectangle({
            x: margin,
            y: cursorY - sigHeight - 10,
            width: sigWidth + 16,
            height: sigHeight + 16,
            borderColor: rgb(0.7, 0.7, 0.7),
            borderWidth: 0.5,
        });
        page.drawImage(signatureImage, {
            x: margin + 8,
            y: cursorY - sigHeight - 2,
            width: sigWidth,
            height: sigHeight,
        });
        cursorY -= sigHeight + 24;
    }

    page.drawText(metadata.fullName, {
        x: margin,
        y: cursorY,
        size: 11,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.1),
    });
    cursorY -= 14;
    page.drawText(`Signed on ${metadata.signedAtDisplay}`, {
        x: margin,
        y: cursorY,
        size: 9,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4),
    });

    const footerY = 36;
    page.drawText(`TTT Tax Services — Practice 5403160 — ${metadata.referenceId}`, {
        x: margin,
        y: footerY,
        size: 8,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
    });

    return await pdfDoc.save();
}

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

// Map of PDFescape's auto-generated field names to their semantic role.
// If a field lands in the wrong place visually, swap the value here.
const LOE_FIELD_NAMES = {
    fullName: "Text-c7XmfszVHY",
    idNumber: "Text-NRMhyyl4Kc",
    taxNumber: "Text-yq7s8LgvnF",
    physicalAddress: "Text-esfdzJvRKs",
    email: "Text-tq1B0LZINZ",
    phone: "Text-lOivmve_Ne",
    industry: "Text-WzCS4YPkC7",
    bankName: "Text-1UxsD826o2",
    accountName: "Text-C2jSdXN77Q",
    accountTypeNumber: "Text-n8jnaByXsK",
    branchCode: "Text-kJ0t114mI5",
    signedAt: "Text-K_1Vjc57oc",
    day: "Dropdown-g3MlDLUm-R",
    month: "Dropdown-PeNDtlyWHk",
    year: "Dropdown-2KHND-Vrop",
    clientName: "Text-wzQoN8DWcq",
    clientSignature: "Signature-zsoSF7OUVx",
    // Firm-side fields are intentionally left blank for TTT to complete:
    //   firmSignature: "Signature-2JrCDLLi_L",
    //   firmName:      "Text-73ECmURK_K",
    //   firmTitle:     "Text-D7gnEKwQTg",
};

function fillLoeFormFields(
    form: import("pdf-lib").PDFForm,
    metadata: SignatureMetadata,
    signatureImage: import("pdf-lib").PDFImage | null,
    pdfDoc: import("pdf-lib").PDFDocument
): boolean {
    const signedDate = new Date(metadata.signedAtIso);
    const dayStr = String(signedDate.getUTCDate());
    const monthStr = MONTH_NAMES[signedDate.getUTCMonth()];
    const yearStr = String(signedDate.getUTCFullYear()).slice(-2);
    const accountTypeNumber = [metadata.accountType, metadata.accountNumber].filter(Boolean).join(" — ");

    const textFieldValues: Array<[string, string]> = [
        [LOE_FIELD_NAMES.fullName, metadata.fullName],
        [LOE_FIELD_NAMES.idNumber, metadata.idNumber],
        [LOE_FIELD_NAMES.taxNumber, metadata.taxNumber],
        [LOE_FIELD_NAMES.physicalAddress, metadata.physicalAddress],
        [LOE_FIELD_NAMES.email, metadata.email],
        [LOE_FIELD_NAMES.phone, metadata.phone],
        [LOE_FIELD_NAMES.industry, metadata.industry],
        [LOE_FIELD_NAMES.bankName, metadata.bankName],
        [LOE_FIELD_NAMES.accountName, metadata.accountName],
        [LOE_FIELD_NAMES.accountTypeNumber, accountTypeNumber],
        [LOE_FIELD_NAMES.branchCode, metadata.branchCode],
        [LOE_FIELD_NAMES.signedAt, "Signed online via TTT signing portal"],
        [LOE_FIELD_NAMES.clientName, metadata.fullName],
    ];

    const dropdownFieldValues: Array<[string, string]> = [
        [LOE_FIELD_NAMES.day, dayStr],
        [LOE_FIELD_NAMES.month, monthStr],
        [LOE_FIELD_NAMES.year, yearStr],
    ];

    const filled: string[] = [];

    for (const [name, value] of textFieldValues) {
        if (!value) continue;
        try {
            form.getTextField(name).setText(value);
            filled.push(name);
        } catch (err) {
            console.warn(`[LoE PDF] Could not set text field "${name}":`, (err as Error).message);
        }
    }

    for (const [name, value] of dropdownFieldValues) {
        if (!value) continue;
        try {
            const dropdown = form.getDropdown(name);
            try {
                dropdown.addOptions([value]);
            } catch {
                // option may already exist — fine
            }
            dropdown.select(value);
            filled.push(name);
        } catch (err) {
            console.warn(`[LoE PDF] Could not set dropdown "${name}":`, (err as Error).message);
        }
    }

    if (signatureImage) {
        try {
            const sigField = form.getSignature(LOE_FIELD_NAMES.clientSignature);
            const widgets = sigField.acroField.getWidgets();
            for (const widget of widgets) {
                const rect = widget.getRectangle();
                pdfDoc.getPage(0).drawImage(signatureImage, {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                });
            }
            filled.push(`${LOE_FIELD_NAMES.clientSignature} (image)`);
        } catch (err) {
            console.warn(`[LoE PDF] Could not draw signature image:`, (err as Error).message);
        }
    }

    // We deliberately do NOT call form.removeField on signature fields nor form.flatten() here:
    // PDFescape-generated signature widgets don't always expose their parent page reference,
    // which makes pdf-lib's page lookup throw. Values still render correctly without flattening
    // — fields remain technically editable, but the source-of-truth signed PDF lives in the
    // Dynamics annotation alongside the audit certificate page, so this is acceptable.

    console.log(`[LoE PDF] Filled ${filled.length} field(s):`, filled.join(", ") || "none");
    return filled.length > 0;
}

function fillLoePage1(
    page: import("pdf-lib").PDFPage,
    font: import("pdf-lib").PDFFont,
    metadata: SignatureMetadata,
    signatureImage: import("pdf-lib").PDFImage | null
) {
    const { width, height } = page.getSize();
    console.log(`[LoE PDF] Page 1 size: ${width} x ${height}, rotation=${page.getRotation().angle}`);
    const inkColor = rgb(0.04, 0.16, 0.42);
    const draw = (text: string, x: number, y: number, size = 10) => {
        if (!text) return;
        page.drawText(text, { x, y, size, font, color: inkColor });
    };

    // Left column — client details
    draw(metadata.fullName, PAGE1_COORDS.leftCol.fullName.x, PAGE1_COORDS.leftCol.fullName.y);
    draw(metadata.idNumber, PAGE1_COORDS.leftCol.idNumber.x, PAGE1_COORDS.leftCol.idNumber.y);
    draw(metadata.taxNumber, PAGE1_COORDS.leftCol.taxNumber.x, PAGE1_COORDS.leftCol.taxNumber.y);
    draw(metadata.physicalAddress, PAGE1_COORDS.leftCol.physicalAddress.x, PAGE1_COORDS.leftCol.physicalAddress.y);
    draw(metadata.email, PAGE1_COORDS.leftCol.email.x, PAGE1_COORDS.leftCol.email.y);
    draw(metadata.phone, PAGE1_COORDS.leftCol.phone.x, PAGE1_COORDS.leftCol.phone.y);
    draw(metadata.industry, PAGE1_COORDS.leftCol.industry.x, PAGE1_COORDS.leftCol.industry.y);

    // Right column — banking
    draw(metadata.bankName, PAGE1_COORDS.rightCol.bankName.x, PAGE1_COORDS.rightCol.bankName.y);
    draw(metadata.accountName, PAGE1_COORDS.rightCol.accountName.x, PAGE1_COORDS.rightCol.accountName.y);
    const accountTypeNumber = [metadata.accountType, metadata.accountNumber].filter(Boolean).join(" — ");
    draw(accountTypeNumber, PAGE1_COORDS.rightCol.accountTypeNumber.x, PAGE1_COORDS.rightCol.accountTypeNumber.y);
    draw(metadata.branchCode, PAGE1_COORDS.rightCol.branchCode.x, PAGE1_COORDS.rightCol.branchCode.y);

    // Acceptance / signature block
    const signedDate = new Date(metadata.signedAtIso);
    draw("Signed online via TTT signing portal", PAGE1_COORDS.sign.signedAt.x, PAGE1_COORDS.sign.signedAt.y);
    draw(String(signedDate.getUTCDate()), PAGE1_COORDS.sign.day.x, PAGE1_COORDS.sign.day.y);
    draw(MONTH_NAMES[signedDate.getUTCMonth()], PAGE1_COORDS.sign.month.x, PAGE1_COORDS.sign.month.y);
    draw(String(signedDate.getUTCFullYear()).slice(-2), PAGE1_COORDS.sign.year.x, PAGE1_COORDS.sign.year.y);
    draw(metadata.fullName, PAGE1_COORDS.sign.clientName.x, PAGE1_COORDS.sign.clientName.y);

    if (signatureImage) {
        const targetWidth = PAGE1_COORDS.sign.signature.width;
        const maxHeight = PAGE1_COORDS.sign.signature.maxHeight;
        const ratio = signatureImage.width === 0 ? 1 : signatureImage.height / signatureImage.width;
        let sigWidth = targetWidth;
        let sigHeight = sigWidth * ratio;
        if (sigHeight > maxHeight) {
            sigHeight = maxHeight;
            sigWidth = sigHeight / ratio;
        }
        page.drawImage(signatureImage, {
            x: PAGE1_COORDS.sign.signature.x,
            y: PAGE1_COORDS.sign.signature.y,
            width: sigWidth,
            height: sigHeight,
        });
    }
}

function decodeDataUrl(dataUrl: string): Uint8Array | null {
    const match = /^data:image\/(png|jpeg);base64,(.+)$/.exec(dataUrl);
    if (!match) return null;
    return new Uint8Array(Buffer.from(match[2], "base64"));
}

function wrapText(text: string, font: import("pdf-lib").PDFFont, size: number, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        const w = font.widthOfTextAtSize(candidate, size);
        if (w > maxWidth && current) {
            lines.push(current);
            current = word;
        } else {
            current = candidate;
        }
    }
    if (current) lines.push(current);
    return lines;
}
