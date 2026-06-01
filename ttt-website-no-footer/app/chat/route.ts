import { NextResponse } from "next/server";

export async function GET() {
    const tinaNumber = process.env.TTT_WHATSAPP_NUMBER;
    const tinaPrompt = "Hi Tina, I'd like to ask a question";
    const tinaUrl = `https://wa.me/${tinaNumber}?text=${encodeURIComponent(tinaPrompt)}`;

    return NextResponse.redirect(tinaUrl, 302);
}
