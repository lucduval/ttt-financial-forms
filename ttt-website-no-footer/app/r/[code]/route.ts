import { NextResponse } from "next/server";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;

    if (!/^[A-Za-z0-9_-]{4,32}$/.test(code)) {
        return NextResponse.redirect("https://www.ttt-tax.co.za", 302);
    }

    const signupUrl = `https://www.ttt-tax.co.za/client-onboarding/?ref=${code}`;

    const tinaNumber = process.env.TTT_WHATSAPP_NUMBER;
    const tinaPrompt = "I'd like to know more about the referral";
    const tinaUrl = `https://wa.me/${tinaNumber}?text=${encodeURIComponent(tinaPrompt)}`;

    const shareMessage =
        `Hey! I use TTT for my tax and they're great. ` +
        `Sign up with my code ${code}: ${signupUrl}\n\n` +
        `Questions? Chat to TTT's assistant Tina: ${tinaUrl}`;

    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

    return NextResponse.redirect(waUrl, 302);
}
