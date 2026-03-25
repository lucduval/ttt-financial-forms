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
    Fingerprint,
    FileText,
    Briefcase
} from 'lucide-react';
import { PopupModal } from 'react-calendly';
import FormInput from './ui/FormInput';
import { getIndustries, submitTargetData } from '../actions';

interface SimpleOnboardingFormProps {
    serviceType: string;
    onBack?: () => void;
}

export default function SimpleOnboardingForm({ serviceType, onBack }: SimpleOnboardingFormProps) {
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [rootElement, setRootElement] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (typeof document !== 'undefined') {
            setRootElement(document.getElementById('root') || document.body);
        }
    }, []);

    const [industries, setIndustries] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        getIndustries().then(setIndustries).catch(console.error);
    }, []);

    const [formData, setFormData] = useState({
        clientType: '',
        name: '',
        email: '',
        phone: '',
        idNumber: '',
        taxNumber: '',
        industry: '',
        message: '',
        files: [] as { name: string, content: string, type: string }[]
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await submitTargetData({
                ...formData,
                clientType: formData.clientType ? parseInt(formData.clientType) : undefined,
                name: formData.name || undefined,
                message: formData.message || undefined,
                idNumber: formData.idNumber || undefined,
                taxNumber: formData.taxNumber || undefined,
                industry: formData.industry || undefined,
                files: formData.files
            }, serviceType);
            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error("Error submitting form:", error);
            alert("There was an error submitting your request. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} className="text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Request Received</h2>
                    <p className="text-slate-600 mb-8">
                        Thank you for your inquiry regarding {serviceType}. Our team will review your message and be in touch shortly.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => { setSubmitted(false); setFormData({ clientType: '', name: '', email: '', phone: '', idNumber: '', taxNumber: '', industry: '', message: '', files: [] }); }}
                            className="w-full py-3 px-4 bg-[#0077BB] hover:bg-[#0066a1] text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
                        >
                            Submit Another Request
                        </button>
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="w-full py-3 px-4 text-slate-600 hover:text-slate-900 font-medium transition-colors"
                            >
                                Back to Services
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 font-sans text-slate-900 flex flex-col">
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

            <main className="flex-grow max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
                <form onSubmit={handleSubmit} className="relative">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                            <h3 className="text-xl font-semibold text-slate-800 capitalize">Get Started with {serviceType}</h3>
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
                                <>
                                    <FormInput
                                        label="ID Number"
                                        id="idNumber"
                                        value={formData.idNumber}
                                        onChange={handleInputChange}
                                        placeholder="e.g. 9001015009087"
                                        required
                                        icon={Fingerprint}
                                    />
                                    <FormInput
                                        label="Tax Number"
                                        id="taxNumber"
                                        value={formData.taxNumber}
                                        onChange={handleInputChange}
                                        placeholder="e.g. 0123456789"
                                        required
                                        icon={FileText}
                                    />
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
                                </>
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

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            {onBack && (
                                <button
                                    type="button"
                                    onClick={onBack}
                                    className="px-4 py-2 text-slate-600 font-medium hover:text-slate-900 transition-colors flex items-center gap-2"
                                >
                                    <ChevronLeft size={18} />
                                    Back
                                </button>
                            )}
                            <button
                                type="submit"
                                className="px-6 py-2.5 bg-[#0077BB] hover:bg-[#0066a1] text-white font-semibold rounded-lg shadow-lg shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-900/30 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 ml-auto"
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
