"use client";

import React, { useState, useEffect } from 'react';
import {
    Building2,
    User,
    Send,
    Phone,
    Mail,
    CheckCircle2,
    UploadCloud,
    ChevronRight,
    ChevronLeft,
    Calendar,
    HelpCircle
} from 'lucide-react';
import { PopupModal } from 'react-calendly';
import FormInput from './ui/FormInput';
import FileUploadField from './ui/FileUploadField';
import ServiceCheckbox from './ui/ServiceCheckbox';
import { submitTargetData } from '../actions';

interface ClientOnboardingFormProps {
    onBack?: () => void;
}

type ServiceTab = 'registrations' | 'retainer' | 'other';

export default function ClientOnboardingForm({ onBack }: ClientOnboardingFormProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [leadCreated, setLeadCreated] = useState(false);
    const [backgroundLeadId, setBackgroundLeadId] = useState<string | null>(null);
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [rootElement, setRootElement] = useState<HTMLElement | null>(null);
    const [activeServiceTab, setActiveServiceTab] = useState<ServiceTab>('registrations');

    useEffect(() => {
        if (typeof document !== 'undefined') {
            setRootElement(document.getElementById('root') || document.body);
        }
    }, []);

    const [formData, setFormData] = useState({
        clientType: '',
        companyName: '',
        fullName: '',
        email: '',
        phone: '',
        notes: '',
        retainerNotes: '',
        services: {
            // Registrations
            companyRegistration: false,
            vatRegistration: false,
            payeRegistration: false,
            publicOfficesRegistration: false,
            financialStatements: false,
            otherRegistration: false,
            otherRegistrationDescription: '',
            // Full Accounting / Retainer
            fullAccountingRetainer: false,
            // Other Services
            managementAccountsQuarterly: false,
            finalYearEndAccounts: false,
            companyTaxReturn: false,
            companyProvisionalReturn: false,
            personalTaxReturns: false,
            personalProvisionalReturn: false,
            cipcAnnualReturn: false,
        },
        files: [] as { name: string, content: string, type: string }[]
    });

    const isIndividual = formData.clientType === '0';

    const totalSteps = 3;
    const steps = [
        { id: 1, title: "Your Details", icon: User },
        { id: 2, title: "Documents", icon: UploadCloud },
        { id: 3, title: "Review & Submit", icon: Send },
    ];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleServiceToggle = (serviceId: string) => {
        setFormData(prev => ({
            ...prev,
            services: {
                ...prev.services,
                [serviceId as keyof typeof prev.services]: !prev.services[serviceId as keyof typeof prev.services]
            }
        }));
    };

    const handleServiceDescriptionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            services: {
                ...prev.services,
                [name]: value
            }
        }));
    };

    const handleFileSelect = (fileData: { name: string, content: string, type: string }) => {
        setFormData(prev => ({
            ...prev,
            files: [...prev.files, fileData]
        }));
    };

    const createLeadInBackground = async () => {
        if (leadCreated) return;
        try {
            const result = await submitTargetData({
                clientType: formData.clientType ? parseInt(formData.clientType) : undefined,
                companyName: isIndividual ? undefined : formData.companyName || undefined,
                contactPerson: isIndividual ? formData.fullName : formData.fullName || undefined,
                name: formData.fullName || undefined,
                email: formData.email,
                phone: formData.phone,
            }, 'accounting', { sendEmails: false });
            setLeadCreated(true);
            if (result.dynamicsId) {
                setBackgroundLeadId(result.dynamicsId);
            }
        } catch (error) {
            console.error("Error creating lead in background:", error);
        }
    };

    const isStep1Valid = () => {
        if (!formData.clientType) return false;
        if (!formData.fullName.trim()) return false;
        if (!formData.email.trim()) return false;
        if (!formData.phone.trim()) return false;
        if (!isIndividual && !formData.companyName.trim()) return false;
        return true;
    };

    const nextStep = async () => {
        if (currentStep === 1 && !isStep1Valid()) return;
        if (currentStep === 1) {
            createLeadInBackground();
        }
        if (currentStep < totalSteps) {
            setCurrentStep(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const doSubmit = async () => {
        setIsConfirmOpen(false);
        setLoading(true);
        try {
            await submitTargetData({
                clientType: formData.clientType ? parseInt(formData.clientType) : undefined,
                companyName: isIndividual ? undefined : formData.companyName || undefined,
                contactPerson: isIndividual ? formData.fullName : formData.fullName || undefined,
                name: formData.fullName || undefined,
                email: formData.email,
                phone: formData.phone,
                notes: formData.notes || undefined,
                services: formData.services,
                files: formData.files
            }, 'accounting', backgroundLeadId ? { existingLeadId: backgroundLeadId } : undefined);
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
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Submission Received</h2>
                    <p className="text-slate-600 mb-8">
                        Thank you for providing your details. Our team will review your information and be in touch shortly to finalize the onboarding process.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => { setSubmitted(false); setCurrentStep(1); setLeadCreated(false); }}
                            className="w-full py-3 px-4 bg-[#0077BB] hover:bg-[#0066a1] text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
                        >
                            Submit Another Client
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

    const CurrentStepIcon = steps[currentStep - 1].icon;

    const selectedServices = Object.entries(formData.services)
        .filter(([k, v]) => v === true && k !== 'otherRegistrationDescription')
        .map(([k]) => ({
            companyRegistration: 'Company Registration',
            vatRegistration: 'VAT Registration',
            payeRegistration: 'PAYE Registration',
            publicOfficesRegistration: 'Public Offices Registration',
            financialStatements: 'Financial Statements',
            otherRegistration: 'Other Registration',
            fullAccountingRetainer: 'Full Accounting Service / Retainer',
            managementAccountsQuarterly: 'Management Accounts',
            finalYearEndAccounts: 'Final Year End Accounts',
            companyTaxReturn: 'Company Tax Return',
            companyProvisionalReturn: 'Company Provisional Return (twice a year)',
            personalTaxReturns: 'Personal Tax Returns - Individuals',
            personalProvisionalReturn: 'Personal Provisional Return (twice a year)',
            cipcAnnualReturn: 'CIPC Annual Return (Revenue over R25mil)',
        }[k] ?? k));

    const serviceTabClasses = (tab: ServiceTab) =>
        `px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            activeServiceTab === tab
                ? 'bg-[#0077BB] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
        }`;

    return (
        <div className="bg-slate-50 font-sans text-slate-900 flex flex-col">

            {/* Confirmation Modal */}
            {isConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-[#0077BB] to-[#0168A2] px-6 py-5 text-white">
                            <h3 className="text-xl font-bold">Confirm Your Submission</h3>
                            <p className="text-blue-100 text-sm mt-1">Please review your details before submitting.</p>
                        </div>
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-0.5">Client Type</p>
                                    <p className="text-slate-800 font-medium">
                                        {isIndividual ? 'Individual' : ['Individual', 'Business', 'Private Company', 'Closed Corporation', 'Business Trust', 'Sole Proprietorship'][parseInt(formData.clientType)] || '—'}
                                    </p>
                                </div>
                                {!isIndividual && (
                                    <div>
                                        <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-0.5">Company Name</p>
                                        <p className="text-slate-800 font-medium">{formData.companyName || '—'}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-0.5">Full Name</p>
                                    <p className="text-slate-800 font-medium">{formData.fullName || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-0.5">Email</p>
                                    <p className="text-slate-800 font-medium">{formData.email || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-0.5">Mobile Phone</p>
                                    <p className="text-slate-800 font-medium">{formData.phone || '—'}</p>
                                </div>
                            </div>
                            {selectedServices.length > 0 && (
                                <div>
                                    <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-2">Services Requested</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedServices.map(s => (
                                            <span key={s} className="bg-blue-50 text-[#0077BB] text-xs font-medium px-2.5 py-1 rounded-full border border-blue-100">{s}</span>
                                        ))}
                                    </div>
                                    {formData.services.otherRegistration && formData.services.otherRegistrationDescription && (
                                        <p className="text-slate-600 text-sm mt-2">Other: {formData.services.otherRegistrationDescription}</p>
                                    )}
                                </div>
                            )}
                            {formData.notes && (
                                <div>
                                    <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-1">Additional Notes</p>
                                    <p className="text-slate-700 text-sm bg-slate-50 rounded-lg p-3 border border-slate-200">{formData.notes}</p>
                                </div>
                            )}
                            {formData.files.length > 0 && (
                                <div>
                                    <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-1">Documents Attached</p>
                                    <p className="text-slate-700 text-sm">{formData.files.length} file{formData.files.length !== 1 ? 's' : ''}</p>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={() => setIsConfirmOpen(false)}
                                className="px-5 py-2.5 text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Go Back & Edit
                            </button>
                            <button
                                type="button"
                                onClick={doSubmit}
                                disabled={loading}
                                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold rounded-lg shadow-lg transition-all flex items-center gap-2"
                            >
                                <Send size={16} />
                                {loading ? 'Submitting...' : 'Confirm & Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Calendly Modal */}
            {rootElement && (
                <PopupModal
                    url={process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/your-calendly-link"}
                    onModalClose={() => setIsBookingOpen(false)}
                    open={isBookingOpen}
                    rootElement={rootElement}
                    prefill={{
                        name: formData.fullName,
                        email: formData.email,
                    }}
                />
            )}

            <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-[#0077BB]">Step {currentStep} of {totalSteps}</span>
                        <span className="text-sm text-slate-500">{steps[currentStep - 1].title}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div
                            className="bg-[#0077BB] h-2.5 rounded-full transition-all duration-300 ease-in-out"
                            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                        ></div>
                    </div>
                    <div className="hidden md:flex justify-between mt-4">
                        {steps.map((step) => {
                            const StepIcon = step.icon;
                            const isActive = step.id === currentStep;
                            const isCompleted = step.id < currentStep;

                            return (
                                <div key={step.id} className="flex flex-col items-center">
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-colors
                      ${isActive ? 'bg-[#0077BB] text-white ring-4 ring-blue-100' :
                                            isCompleted ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}
                    `}
                                    >
                                        {isCompleted ? <CheckCircle2 size={16} /> : StepIcon ? <StepIcon size={14} /> : step.id}
                                    </div>
                                    <span className={`text-xs ${isActive ? 'text-[#0077BB] font-semibold' : 'text-slate-400'}`}>
                                        {step.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <form onSubmit={(e) => e.preventDefault()} className="relative">

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px] flex flex-col">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
                            <CurrentStepIcon className="text-[#0077BB]" size={20} />
                            <h3 className="text-lg font-semibold text-slate-800">{steps[currentStep - 1].title}</h3>
                        </div>

                        <div className="p-6 sm:p-8 flex-grow animate-in fade-in slide-in-from-right-4 duration-300">

                            {/* Step 1: Your Details */}
                            {currentStep === 1 && (
                                <div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
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

                                    {!isIndividual && formData.clientType !== '' && (
                                        <div className="md:col-span-2">
                                            <FormInput
                                                label="Registered Company Name"
                                                id="companyName"
                                                value={formData.companyName}
                                                onChange={handleInputChange}
                                                placeholder="e.g. Acme Holdings (Pty) Ltd"
                                                required
                                                icon={Building2}
                                            />
                                        </div>
                                    )}

                                    <div className="md:col-span-2">
                                        <FormInput
                                            label="Full Name"
                                            id="fullName"
                                            value={formData.fullName}
                                            onChange={handleInputChange}
                                            placeholder="John Doe"
                                            required
                                            icon={User}
                                        />
                                    </div>

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
                                        label="Mobile Phone"
                                        id="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="+27 82 000 0000"
                                        required
                                        icon={Phone}
                                    />
                                </div>

                                {/* Services Section */}
                                <div className="mt-8 border-t border-slate-200 pt-8">
                                    <h4 className="text-base font-semibold text-slate-800 mb-1">Services Required</h4>
                                    <p className="text-sm text-slate-500 mb-4">Select the services you are interested in.</p>

                                    {/* Tab Navigation */}
                                    <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-lg">
                                        <button type="button" onClick={() => setActiveServiceTab('registrations')} className={serviceTabClasses('registrations')}>
                                            Registrations
                                        </button>
                                        <button type="button" onClick={() => setActiveServiceTab('retainer')} className={serviceTabClasses('retainer')}>
                                            Full Accounting Service / Monthly Retainer
                                        </button>
                                        <button type="button" onClick={() => setActiveServiceTab('other')} className={serviceTabClasses('other')}>
                                            Other Services
                                        </button>
                                    </div>

                                    {/* Registrations Tab */}
                                    {activeServiceTab === 'registrations' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <ServiceCheckbox id="companyRegistration" label="Company Registration" checked={!!formData.services.companyRegistration} onChange={handleServiceToggle} />
                                            <ServiceCheckbox id="vatRegistration" label="VAT Registration" checked={!!formData.services.vatRegistration} onChange={handleServiceToggle} />
                                            <ServiceCheckbox id="payeRegistration" label="PAYE Registration" checked={!!formData.services.payeRegistration} onChange={handleServiceToggle} />
                                            <ServiceCheckbox id="publicOfficesRegistration" label="Public Officer Registration" checked={!!formData.services.publicOfficesRegistration} onChange={handleServiceToggle} />
                                            <ServiceCheckbox id="financialStatements" label="Financial Statements" checked={!!formData.services.financialStatements} onChange={handleServiceToggle} />
                                            <ServiceCheckbox id="otherRegistration" label="Other" checked={!!formData.services.otherRegistration} onChange={handleServiceToggle} />
                                            {formData.services.otherRegistration && (
                                                <div className="sm:col-span-2">
                                                    <textarea
                                                        name="otherRegistrationDescription"
                                                        rows={2}
                                                        className="block w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-400 sm:text-sm shadow-sm"
                                                        placeholder="Please describe the registration you need..."
                                                        value={formData.services.otherRegistrationDescription}
                                                        onChange={handleServiceDescriptionChange}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Full Accounting / Retainer Tab */}
                                    {activeServiceTab === 'retainer' && (
                                        <div>
                                            <ServiceCheckbox id="fullAccountingRetainer" label="Full Accounting Service / Retainer" checked={!!formData.services.fullAccountingRetainer} onChange={handleServiceToggle} />
                                            <div className="mt-4">
                                                <label htmlFor="retainerNotes" className="block text-sm font-medium text-slate-700 mb-1">
                                                    Notes
                                                </label>
                                                <textarea
                                                    id="retainerNotes"
                                                    name="retainerNotes"
                                                    rows={3}
                                                    className="block w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-400 sm:text-sm shadow-sm"
                                                    placeholder="Any details about your retainer requirements..."
                                                    value={formData.retainerNotes}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Other Services Tab */}
                                    {activeServiceTab === 'other' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <ServiceCheckbox id="managementAccountsQuarterly" label="Management Accounts" checked={!!formData.services.managementAccountsQuarterly} onChange={handleServiceToggle} />
                                            <ServiceCheckbox id="finalYearEndAccounts" label="Final Year End Accounts" checked={!!formData.services.finalYearEndAccounts} onChange={handleServiceToggle} />
                                            <ServiceCheckbox id="companyTaxReturn" label="Company Tax Return" checked={!!formData.services.companyTaxReturn} onChange={handleServiceToggle} />
                                            <ServiceCheckbox id="companyProvisionalReturn" label="Company Provisional Return (twice a year)" checked={!!formData.services.companyProvisionalReturn} onChange={handleServiceToggle} />
                                            <ServiceCheckbox id="personalTaxReturns" label="Personal Tax Returns" checked={!!formData.services.personalTaxReturns} onChange={handleServiceToggle} />
                                            <ServiceCheckbox id="personalProvisionalReturn" label="Personal Provisional Return (twice a year)" checked={!!formData.services.personalProvisionalReturn} onChange={handleServiceToggle} />
                                            <ServiceCheckbox id="cipcAnnualReturn" label="CIPC Annual Return (Revenue over R25mil)" checked={!!formData.services.cipcAnnualReturn} onChange={handleServiceToggle} />
                                        </div>
                                    )}
                                </div>
                            </div>
                            )}

                            {/* Step 2: Document Uploads */}
                            {currentStep === 2 && (
                                <div>
                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                                        <p className="text-sm text-slate-700">
                                            Uploading documents now helps us speed up the compliance process. This is optional — you can always provide these later.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FileUploadField label="CIPC / COR14.3 Registration" id="doc_cipc" onFileSelect={handleFileSelect} />
                                        <FileUploadField label="Other Documents" id="doc_other" onFileSelect={handleFileSelect} />
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Review & Submit */}
                            {currentStep === 3 && (
                                <div>
                                    <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-2">
                                        Additional Notes or Specific Requirements
                                    </label>
                                    <textarea
                                        id="notes"
                                        name="notes"
                                        rows={6}
                                        className="block w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-400 sm:text-sm"
                                        placeholder="Anything else we should know?"
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                    ></textarea>

                                    <div className="mt-8 bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-slate-600">
                                        <p className="font-semibold text-[#0077BB] mb-1">Almost done!</p>
                                        <p>Please review your information before submitting. You can go back to edit previous steps if needed.</p>
                                    </div>

                                    {/* Unsure / Calendly Section */}
                                    <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="flex items-start sm:items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg shadow-sm text-[#0077BB]">
                                                <HelpCircle size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900">Unsure about your requirements?</h4>
                                                <p className="text-sm text-slate-500">Book a quick discovery call with our advisors to discuss your needs.</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsBookingOpen(true)}
                                            className="w-full sm:w-auto px-5 py-2.5 bg-white text-[#0077BB] border border-[#0077BB] hover:bg-blue-50 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            <Calendar size={18} />
                                            Book Consultation
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Actions / Navigation Buttons */}
                    <div className="flex items-center justify-between pt-8 pb-12">

                        <button
                            type="button"
                            onClick={currentStep === 1 ? onBack : prevStep}
                            className={`px-6 py-3 text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2 ${currentStep === 1 && !onBack ? 'invisible' : ''}`}
                        >
                            <ChevronLeft size={18} />
                            {currentStep === 1 ? 'Back to Services' : 'Back'}
                        </button>

                        <div className="flex gap-4">
                            {currentStep < totalSteps ? (
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    disabled={currentStep === 1 && !isStep1Valid()}
                                    className="px-8 py-3 bg-[#0077BB] hover:bg-[#0066a1] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-white font-semibold rounded-lg shadow-lg shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-900/30 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                                >
                                    Next Step
                                    <ChevronRight size={18} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsConfirmOpen(true)}
                                    className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-lg shadow-green-900/20 hover:shadow-xl hover:shadow-green-900/30 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                                >
                                    <Send size={18} />
                                    Review & Submit
                                </button>
                            )}
                        </div>
                    </div>

                </form>
            </main>
        </div>
    );
}
