import { NextResponse } from "next/server";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;

    if (!/^[A-Za-z0-9_-]+$/.test(code)) {
        return NextResponse.redirect("https://www.ttt-tax.co.za", 302);
    }

    const signupUrl = `https://www.ttt-tax.co.za/client-onboarding/?ref=${code}`;
    const shareMessage =
        `Hey! I use TTT for my tax and they're great. ` +
        `Sign up with my code ${code}: ${signupUrl}`;

    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

    return NextResponse.redirect(waUrl, 302);
}
