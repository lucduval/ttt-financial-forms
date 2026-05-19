"use client";

import React, { useState, useEffect } from 'react';
import {
    User,
    Mail,
    Phone,
    Send,
    MessageSquare,
    CheckCircle2,
    Calendar,
    ChevronLeft,
    Briefcase,
    Tag,
    FileSignature,
    Clock,
    Info,
    Share2
} from 'lucide-react';
import { PopupModal } from 'react-calendly';
import FormInput from './ui/FormInput';
import { getBrandAssociates, getIndustries, submitTargetData } from '../actions';

interface SimpleOnboardingFormProps {
    serviceType: string;
    onBack?: () => void;
}

export default function SimpleOnboardingForm({ serviceType, onBack }: SimpleOnboardingFormProps) {
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [rootElement, setRootElement] = useState<HTMLElement | null>(null);
    const [loeLeadId, setLoeLeadId] = useState<string | null>(null);
    const [loeToken, setLoeToken] = useState<string | null>(null);
    const [loeDeferred, setLoeDeferred] = useState(false);
    const [duplicateBlock, setDuplicateBlock] = useState<null | 'own-code' | 'generic'>(null);

    useEffect(() => {
        if (typeof document !== 'undefined') {
            setRootElement(document.getElementById('root') || document.body);
        }
    }, []);

    const [industries, setIndustries] = useState<{ id: string; name: string }[]>([]);
    const [brandAssociates, setBrandAssociates] = useState<{ slug: string; displayName: string }[]>([]);
    const [brandAssociatesLoaded, setBrandAssociatesLoaded] = useState(false);

    useEffect(() => {
        getIndustries().then(setIndustries).catch(console.error);
    }, []);

    const [formData, setFormData] = useState({
        clientType: '',
        name: '',
        email: '',
        phone: '',
        industry: '',
        referralCode: '',
        referralSource: '',
        marketerSlug: '',
        message: '',
        files: [] as { name: string, content: string, type: string }[]
    });
    const [referralFromLink, setReferralFromLink] = useState(false);
    const [marketerFromLink, setMarketerFromLink] = useState(false);

    useEffect(() => {
        if (serviceType !== 'tax') return;
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        const src = params.get('src');
        if (ref) {
            setFormData(prev => ({ ...prev, referralCode: ref, referralSource: src || '' }));
            setReferralFromLink(true);
        }
    }, [serviceType]);

    useEffect(() => {
        let cancelled = false;
        getBrandAssociates()
            .then(list => {
                if (cancelled) return;
                setBrandAssociates(list);
                const params = new URLSearchParams(window.location.search);
                const m = params.get('m');
                if (m) {
                    const slug = m.trim().toLowerCase();
                    if (/^[a-z0-9-]{1,40}$/.test(slug) && list.some(a => a.slug === slug)) {
                        setFormData(prev => ({ ...prev, marketerSlug: slug }));
                        setMarketerFromLink(true);
                    }
                }
            })
            .catch(console.error)
            .finally(() => {
                if (!cancelled) setBrandAssociatesLoaded(true);
            });
        return () => { cancelled = true; };
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const selectedIndustryName = formData.industry
                ? industries.find((i) => i.id === formData.industry)?.name
                : undefined;
            const result = await submitTargetData({
                ...formData,
                clientType: formData.clientType ? parseInt(formData.clientType) : undefined,
                name: formData.name || undefined,
                message: formData.message || undefined,
                industry: formData.industry || undefined,
                industryName: selectedIndustryName,
                referralCode: formData.referralCode?.trim() || undefined,
                referralSource: formData.referralSource?.trim() || undefined,
                marketerSlug: formData.marketerSlug?.trim() || undefined,
                files: formData.files
            }, serviceType);
            if (result && 'duplicate' in result && result.duplicate) {
                setDuplicateBlock(result.duplicate);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            if (serviceType === 'tax' && result?.dynamicsId && result?.loeToken) {
                setLoeLeadId(result.dynamicsId);
                setLoeToken(result.loeToken);
            }
            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error("Error submitting form:", error);
            alert("There was an error submitting your request. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (duplicateBlock) {
        const isOwnCode = duplicateBlock === 'own-code';
        return (
            <div className="flex-grow bg-white flex items-center justify-center p-4 py-16">
                <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-in fade-in zoom-in duration-300">
                    <div className={`w-20 h-20 ${isOwnCode ? 'bg-amber-100' : 'bg-blue-100'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                        {isOwnCode
                            ? <Share2 size={36} className="text-amber-600" />
                            : <Info size={36} className="text-[#0077BB]" />}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-3">
                        {isOwnCode ? "That's your own referral code" : "You're already signed up"}
                    </h2>
                    {isOwnCode ? (
                        <p className="text-slate-600 mb-2 leading-relaxed">
                            That&rsquo;s <span className="font-semibold">your</span> referral code, and you&rsquo;re already signed up with us! To earn the cash reward, share your code with friends and family; their signup gets credited to you.
                        </p>
                    ) : (
                        <p className="text-slate-600 mb-2 leading-relaxed">
                            You&rsquo;re already signed up with us. If you need to update your details or have a question, please get in touch using one of the options below.
                        </p>
                    )}
                    <div className="mt-6 mb-8 p-5 bg-slate-50 border border-slate-200 rounded-xl text-left">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                            {isOwnCode ? 'Questions? Get in touch' : 'Get in touch'}
                        </p>
                        <div className="space-y-2">
                            <a
                                href="https://wa.me/27764446801"
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-3 text-slate-700 hover:text-[#0077BB] transition-colors"
                            >
                                <Phone size={18} className="text-[#25D366]" />
                                <span className="font-medium">WhatsApp +27 76 444 6801</span>
                            </a>
                            <a
                                href="mailto:info@ttt-tax.co.za"
                                className="flex items-center gap-3 text-slate-700 hover:text-[#0077BB] transition-colors"
                            >
                                <Mail size={18} className="text-[#0077BB]" />
                                <span className="font-medium">info@ttt-tax.co.za</span>
                            </a>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <button
                            onClick={() => setDuplicateBlock(null)}
                            className="w-full py-3 px-4 text-slate-600 hover:text-slate-900 font-medium transition-colors border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2"
                        >
                            <ChevronLeft size={16} />
                            Back to form
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (submitted) {
        const showLoeChoice = serviceType === 'tax' && loeLeadId && loeToken && !loeDeferred;
        const isEmbed = typeof window !== 'undefined' && window.location.pathname.startsWith('/embed');
        const signHref = loeLeadId && loeToken
            ? `${isEmbed ? '/embed' : ''}/onboarding/loe/${loeLeadId}?token=${encodeURIComponent(loeToken)}`
            : '#';

        return (
            <div className="flex-grow bg-white flex items-center justify-center p-4 py-16">
                <div className={`${showLoeChoice ? 'max-w-lg' : 'max-w-md'} w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-in fade-in zoom-in duration-300`}>
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} className="text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Thank You!</h2>
                    <p className="text-slate-600 mb-2">
                        Your {serviceType} inquiry has been successfully submitted.
                    </p>
                    <p className="text-slate-500 text-sm mb-8">
                        Our team will review your message and be in touch shortly. You will receive a confirmation email at <span className="font-medium text-slate-700">{formData.email}</span>.
                    </p>

                    {showLoeChoice && (
                        <div className="mb-8 p-5 bg-blue-50 border border-blue-100 rounded-xl text-left">
                            <div className="flex items-center gap-2 mb-2">
                                <FileSignature size={20} className="text-[#0077BB]" />
                                <h3 className="text-base font-semibold text-slate-800">One last step: Letter of Engagement</h3>
                            </div>
                            <p className="text-sm text-slate-600 mb-4">
                                We need a signed Letter of Engagement before we can begin work on your matter. You can sign it now in under two minutes, or come back to it later via the link in your email.
                            </p>
                            <div className="space-y-2">
                                <a
                                    href={signHref}
                                    target="_top"
                                    className="w-full py-3 px-4 bg-[#0077BB] hover:bg-[#0066a1] text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                                >
                                    <FileSignature size={18} />
                                    Sign Letter of Engagement now
                                </a>
                                <button
                                    onClick={() => setLoeDeferred(true)}
                                    className="w-full py-3 px-4 text-slate-600 hover:text-slate-900 font-medium transition-colors border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2"
                                >
                                    <Clock size={16} />
                                    I&rsquo;ll do this later
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                setSubmitted(false);
                                setFormData({ clientType: '', name: '', email: '', phone: '', industry: '', referralCode: '', referralSource: '', marketerSlug: '', message: '', files: [] });
                                setReferralFromLink(false);
                                setMarketerFromLink(false);
                                setLoeLeadId(null);
                                setLoeToken(null);
                                setLoeDeferred(false);
                            }}
                            className="w-full py-3 px-4 bg-[#0077BB] hover:bg-[#0066a1] text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
                        >
                            Submit Another Application
                        </button>
                        <a
                            href="https://ttt-tax.co.za"
                            target="_top"
                            className="block w-full py-3 px-4 text-slate-600 hover:text-slate-900 font-medium transition-colors border border-slate-200 rounded-lg hover:bg-slate-50"
                        >
                            Go to Homepage
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white font-sans text-slate-900 flex flex-col">
            {/* Calendly Modal */}
            {rootElement && (
                <PopupModal
                    url={process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/your-calendly-link"}
                    onModalClose={() => setIsBookingOpen(false)}
                    open={isBookingOpen}
                    rootElement={rootElement}
                    prefill={{
                        name: formData.name,
                        email: formData.email,
                    }}
                />
            )}

            <main className="flex-grow max-w-3xl mx-auto px-1 sm:px-4 lg:px-8 py-2 sm:py-4 w-full">
                <form onSubmit={handleSubmit} className="relative">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
                            <h3 className="text-lg sm:text-xl font-semibold text-slate-800 capitalize">Get Started with {serviceType}</h3>
                            <p className="text-sm text-slate-500 mt-1">Please fill in your details below.</p>
                        </div>

                        <div className="p-6 sm:p-8 space-y-6">
                            <div>
                                <label htmlFor="clientType" className="block text-sm font-medium text-slate-700 mb-2">
                                    Client Type <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute top-3 left-3 pointer-events-none text-slate-400">
                                        <User size={18} />
                                    </div>
                                    <select
                                        id="clientType"
                                        name="clientType"
                                        value={formData.clientType}
                                        onChange={handleInputChange}
                                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 sm:text-sm shadow-sm appearance-none"
                                        required
                                    >
                                        <option value="" disabled>Select Client Type</option>
                                        <option value="0">Individual</option>
                                        <option value="1">Business</option>
                                        <option value="2">Private Company</option>
                                        <option value="3">Closed Corporation</option>
                                        <option value="4">Business Trust</option>
                                        <option value="5">Sole Proprietorship</option>
                                    </select>
                                </div>
                            </div>
                            <FormInput
                                label="Full Name"
                                id="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="John Doe"
                                required
                                icon={User}
                            />
                            <FormInput
                                label="Email Address"
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="john@example.com"
                                required
                                icon={Mail}
                            />
                            <FormInput
                                label="Phone Number"
                                id="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={handleInputChange}
                                placeholder="+27 82 000 0000"
                                required
                                icon={Phone}
                            />

                            {serviceType === 'tax' && (
                                <div>
                                    <label htmlFor="industry" className="block text-sm font-medium text-slate-700 mb-2">
                                        Industry
                                    </label>
                                    <div className="relative">
                                        <div className="absolute top-3 left-3 pointer-events-none text-slate-400">
                                            <Briefcase size={18} />
                                        </div>
                                        <select
                                            id="industry"
                                            name="industry"
                                            value={formData.industry}
                                            onChange={handleInputChange}
                                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 sm:text-sm shadow-sm appearance-none"
                                            required
                                        >
                                            <option value="" disabled>Select your industry</option>
                                            {industries.map((ind: { id: string; name: string }) => (
                                                <option key={ind.id} value={ind.id}>{ind.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {serviceType === 'tax' && (
                                <div>
                                    <label htmlFor="referralCode" className="block text-sm font-medium text-slate-700 mb-2">
                                        Referral Code
                                    </label>
                                    <div className="relative">
                                        <div className="absolute top-3 left-3 pointer-events-none text-slate-400">
                                            <Tag size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            id="referralCode"
                                            name="referralCode"
                                            value={formData.referralCode}
                                            onChange={handleInputChange}
                                            placeholder="Enter your referral code (optional)"
                                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-400 sm:text-sm shadow-sm"
                                        />
                                    </div>
                                    {referralFromLink && (
                                        <p className="mt-1 text-xs text-[#0077BB]">Referral code applied from your link.</p>
                                    )}
                                </div>
                            )}

                            {brandAssociatesLoaded && brandAssociates.length > 0 && (
                                <div>
                                    <label htmlFor="marketerSlug" className="block text-sm font-medium text-slate-700 mb-2">
                                        {marketerFromLink ? 'Your TTT Brand Associate' : 'Referred by a TTT Brand Associate? (optional)'}
                                    </label>
                                    <div className="relative">
                                        <div className="absolute top-3 left-3 pointer-events-none text-slate-400">
                                            <User size={18} />
                                        </div>
                                        <select
                                            id="marketerSlug"
                                            name="marketerSlug"
                                            value={formData.marketerSlug}
                                            onChange={handleInputChange}
                                            disabled={marketerFromLink}
                                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 sm:text-sm shadow-sm appearance-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                                        >
                                            <option value="">{marketerFromLink ? '' : 'Select (optional)'}</option>
                                            {brandAssociates.map(a => (
                                                <option key={a.slug} value={a.slug}>{a.displayName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {marketerFromLink && (
                                        <p className="mt-1 text-xs text-[#0077BB]">Linked from your invitation.</p>
                                    )}
                                </div>
                            )}

                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-2">
                                    How can we help you?
                                </label>
                                <div className="relative">
                                    <div className="absolute top-3 left-3 pointer-events-none text-slate-400">
                                        <MessageSquare size={18} />
                                    </div>
                                    <textarea
                                        id="message"
                                        name="message"
                                        rows={5}
                                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-400 sm:text-sm shadow-sm"
                                        placeholder="Tell us a bit about your requirements..."
                                        value={formData.message}
                                        onChange={handleInputChange}
                                        required
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        <div className="px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            {onBack && (
                                <button
                                    type="button"
                                    onClick={onBack}
                                    className="px-4 py-2.5 text-slate-600 font-medium hover:text-slate-900 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                                >
                                    <ChevronLeft size={18} />
                                    Back
                                </button>
                            )}
                            <button
                                type="submit"
                                className="px-6 py-2.5 bg-[#0077BB] hover:bg-[#0066a1] text-white font-semibold rounded-lg shadow-lg shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-900/30 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 ml-auto min-h-[44px] w-full sm:w-auto"
                            >
                                <Send size={18} />
                                {loading ? 'Submitting...' : 'Submit Inquiry'}
                            </button>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
}
