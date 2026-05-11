import LoeSigningPage from "@/app/(main)/onboarding/loe/[leadId]/page";

interface PageProps {
    params: Promise<{ leadId: string }>;
    searchParams: Promise<{ token?: string; name?: string }>;
}

export default function EmbedLoeSigningPage(props: PageProps) {
    return <LoeSigningPage {...props} />;
}
