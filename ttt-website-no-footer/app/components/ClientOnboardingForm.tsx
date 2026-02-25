"use client";

import React, { useState, useEffect } from 'react';
import {
    Building2,
    FileText,
    User,
    CheckSquare,
    Send,
    Briefcase,
    CreditCard,
    Phone,
    Mail,
    MapPin,
    CheckCircle2,
    UploadCloud,
    Settings,
    HelpCircle,
    UserCheck,
    ChevronRight,
    ChevronLeft,
    Calendar
} from 'lucide-react';
import { PopupModal } from 'react-calendly';
import FormInput from './ui/FormInput';
import FileUploadField from './ui/FileUploadField';
import ServiceCheckbox from './ui/ServiceCheckbox';

import { submitTargetData } from '../actions';

interface ClientOnboardingFormProps {
    onBack?: () => void;
}

export default function ClientOnboardingForm({ onBack }: ClientOnboardingFormProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [rootElement, setRootElement] = useState<HTMLElement | null>(null);

    useEffect(() => {
        // Safe access to document for Calendly
        if (typeof document !== 'undefined') {
            setRootElement(document.getElementById('root') || document.body);
        }
    }, []);

    const [formData, setFormData] = useState({
        companyName: '',
        vatNumber: '',
        payeNumber: '',
        taxNumber: '',
        companyEmail: '',
        companyPhone: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
        // New fields for Accounting Setup
        currentSystem: '',
        hasExistingAccountant: 'no',
        referrerName: '',
        referralSource: '',
        existingRegistrations: {
            existing_vat: false,
            existing_paye: false,
            existing_incomeTax: false,
            existing_uif: false,
            existing_customs: false,
            existing_coida: false
        },
        services: {
            bookkeeping: false,
            payroll: false,
            taxReturns: false,
            financialStatements: false,
            secretarial: false,
            advisory: false,
            audit: false,
            vatRegistration: false
        },
        files: [] as { name: string, content: string, type: string }[]
    });

    const totalSteps = 7;
    const steps = [
        { id: 1, title: "Entity Details", icon: Briefcase },
        { id: 2, title: "Contact Info", icon: User },
        { id: 3, title: "Services", icon: CheckSquare },
        { id: 4, title: "Documents", icon: UploadCloud },
        { id: 5, title: "Current Setup", icon: Settings },
        { id: 6, title: "Referral", icon: UserCheck },
        { id: 7, title: "Review & Submit", icon: Send },
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

    const handleRegistrationToggle = (regId: string) => {
        setFormData(prev => ({
            ...prev,
            existingRegistrations: {
                ...prev.existingRegistrations,
                [regId as keyof typeof prev.existingRegistrations]: !prev.existingRegistrations[regId as keyof typeof prev.existingRegistrations]
            }
        }));
    };

    const handleFileSelect = (fileData: { name: string, content: string, type: string }) => {
        setFormData(prev => ({
            ...prev,
            files: [...prev.files, fileData]
        }));
    };

    const nextStep = () => {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await submitTargetData(formData, 'accounting');
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
                            onClick={() => { setSubmitted(false); setCurrentStep(1); }}
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

    return (
        <div className="bg-slate-50 font-sans text-slate-900 flex flex-col">
            {/* Calendly Modal */}
            <PopupModal
                url="https://calendly.com/your-calendly-link"
                onModalClose={() => setIsBookingOpen(false)}
                open={isBookingOpen}
                rootElement={rootElement!}
            />

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
                    {/* Desktop Steps Indicator */}
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

                <form onSubmit={handleSubmit} className="relative">

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px] flex flex-col">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
                            <CurrentStepIcon className="text-[#0077BB]" size={20} />
                            <h3 className="text-lg font-semibold text-slate-800">{steps[currentStep - 1].title}</h3>
                        </div>

                        <div className="p-6 sm:p-8 flex-grow animate-in fade-in slide-in-from-right-4 duration-300">

                            {/* Step 1: Company Details */}
                            {currentStep === 1 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                    <FormInput
                                        label="VAT Registration Number"
                                        id="vatNumber"
                                        value={formData.vatNumber}
                                        onChange={handleInputChange}
                                        placeholder="4000..."
                                        icon={CreditCard}
                                    />
                                    <FormInput
                                        label="PAYE Reference Number"
                                        id="payeNumber"
                                        value={formData.payeNumber}
                                        onChange={handleInputChange}
                                        placeholder="7000..."
                                        icon={FileText}
                                    />
                                    <FormInput
                                        label="Income Tax Number"
                                        id="taxNumber"
                                        value={formData.taxNumber}
                                        onChange={handleInputChange}
                                        placeholder="Tax Reference"
                                        icon={FileText}
                                    />
                                    <FormInput
                                        label="Company Email Address"
                                        id="companyEmail"
                                        type="email"
                                        value={formData.companyEmail}
                                        onChange={handleInputChange}
                                        placeholder="info@company.com"
                                        icon={Mail}
                                    />
                                    <FormInput
                                        label="Company Phone Number"
                                        id="companyPhone"
                                        type="tel"
                                        value={formData.companyPhone}
                                        onChange={handleInputChange}
                                        placeholder="+27 11 000 0000"
                                        icon={Phone}
                                    />
                                </div>
                            )}

                            {/* Step 2: Contact Information */}
                            {currentStep === 2 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <FormInput
                                            label="Full Name & Surname"
                                            id="contactPerson"
                                            value={formData.contactPerson}
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
                                        label="Phone Number"
                                        id="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="+27 82 000 0000"
                                        required
                                        icon={Phone}
                                    />
                                    <div className="md:col-span-2">
                                        <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">
                                            Physical Address
                                        </label>
                                        <div className="relative">
                                            <div className="absolute top-3 left-3 pointer-events-none text-slate-400">
                                                <MapPin size={18} />
                                            </div>
                                            <textarea
                                                id="address"
                                                name="address"
                                                rows={3}
                                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-400 sm:text-sm shadow-sm"
                                                placeholder="Street address, City, Postal Code"
                                                value={formData.address}
                                                onChange={handleInputChange}
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Services */}
                            {currentStep === 3 && (
                                <div>
                                    <p className="text-sm text-slate-500 mb-6">Select all the accounting and financial services you require.</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                                        <ServiceCheckbox
                                            id="bookkeeping"
                                            label="Monthly Bookkeeping"
                                            checked={formData.services.bookkeeping}
                                            onChange={handleServiceToggle}
                                        />
                                        <ServiceCheckbox
                                            id="payroll"
                                            label="Payroll Services"
                                            checked={formData.services.payroll}
                                            onChange={handleServiceToggle}
                                        />
                                        <ServiceCheckbox
                                            id="taxReturns"
                                            label="Corporate Tax Returns"
                                            checked={formData.services.taxReturns}
                                            onChange={handleServiceToggle}
                                        />
                                        <ServiceCheckbox
                                            id="vatRegistration"
                                            label="VAT Registration/Filing"
                                            checked={formData.services.vatRegistration}
                                            onChange={handleServiceToggle}
                                        />
                                        <ServiceCheckbox
                                            id="financialStatements"
                                            label="Annual Financial Statements"
                                            checked={formData.services.financialStatements}
                                            onChange={handleServiceToggle}
                                        />
                                        <ServiceCheckbox
                                            id="secretarial"
                                            label="Company Secretarial"
                                            checked={formData.services.secretarial}
                                            onChange={handleServiceToggle}
                                        />
                                        <ServiceCheckbox
                                            id="advisory"
                                            label="Business Advisory"
                                            checked={formData.services.advisory}
                                            onChange={handleServiceToggle}
                                        />
                                        <ServiceCheckbox
                                            id="audit"
                                            label="Independent Review / Audit"
                                            checked={formData.services.audit}
                                            onChange={handleServiceToggle}
                                        />
                                    </div>

                                    {/* Unsure / Calendly Section */}
                                    <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
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

                            {/* Step 4: Document Uploads */}
                            {currentStep === 4 && (
                                <div>
                                    <p className="text-sm text-slate-500 mb-6">
                                        Uploading these documents now helps us speed up the compliance process significantly. This is optional.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FileUploadField label="CIPC / COR14.3 Registration" id="doc_cipc" onFileSelect={handleFileSelect} />
                                        <FileUploadField label="Annual Financial Statements" id="doc_afs" onFileSelect={handleFileSelect} />
                                        <FileUploadField label="Tax Clearance Certificate" id="doc_tax" onFileSelect={handleFileSelect} />
                                        <FileUploadField label="ID Copies of Directors" id="doc_id" onFileSelect={handleFileSelect} />
                                    </div>
                                </div>
                            )}

                            {/* Step 5: Current Setup */}
                            {currentStep === 5 && (
                                <div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                        {/* Accounting System */}
                                        <div>
                                            <label htmlFor="currentSystem" className="block text-sm font-medium text-slate-700 mb-1">
                                                Current Accounting System
                                            </label>
                                            <select
                                                id="currentSystem"
                                                name="currentSystem"
                                                value={formData.currentSystem}
                                                onChange={handleInputChange}
                                                className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 sm:text-sm shadow-sm"
                                            >
                                                <option value="">Select a system...</option>
                                                <option value="Xero">Xero</option>
                                                <option value="Sage">Sage</option>
                                                <option value="QuickBooks">QuickBooks</option>
                                                <option value="Excel">Excel / Spreadsheets</option>
                                                <option value="None">None / Paper-based</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>

                                        {/* Existing Accountant */}
                                        <div>
                                            <label htmlFor="hasExistingAccountant" className="block text-sm font-medium text-slate-700 mb-2">
                                                Do you currently have an accountant?
                                            </label>
                                            <div className="flex gap-6 mt-2">
                                                {['Yes', 'No'].map((option) => (
                                                    <label key={option} className="flex items-center cursor-pointer group">
                                                        <input
                                                            type="radio"
                                                            name="hasExistingAccountant"
                                                            value={option.toLowerCase()}
                                                            checked={formData.hasExistingAccountant === option.toLowerCase()}
                                                            onChange={handleInputChange}
                                                            className="w-4 h-4 text-[#0077BB] border-gray-300 focus:ring-[#0077BB]"
                                                        />
                                                        <span className="ml-2 text-slate-700 group-hover:text-[#0077BB] transition-colors">{option}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Existing Registrations */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-3">
                                            Currently Registered Tax Types
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            <ServiceCheckbox
                                                id="existing_vat"
                                                label="VAT"
                                                checked={formData.existingRegistrations.existing_vat}
                                                onChange={handleRegistrationToggle}
                                            />
                                            <ServiceCheckbox
                                                id="existing_paye"
                                                label="PAYE / SDL / UIF"
                                                checked={formData.existingRegistrations.existing_paye}
                                                onChange={handleRegistrationToggle}
                                            />
                                            <ServiceCheckbox
                                                id="existing_incomeTax"
                                                label="Income Tax"
                                                checked={formData.existingRegistrations.existing_incomeTax}
                                                onChange={handleRegistrationToggle}
                                            />
                                            <ServiceCheckbox
                                                id="existing_customs"
                                                label="Import / Export Customs"
                                                checked={formData.existingRegistrations.existing_customs}
                                                onChange={handleRegistrationToggle}
                                            />
                                            <ServiceCheckbox
                                                id="existing_coida"
                                                label="COIDA (Workman's Comp)"
                                                checked={formData.existingRegistrations.existing_coida}
                                                onChange={handleRegistrationToggle}
                                            />
                                            <ServiceCheckbox
                                                id="existing_uif"
                                                label="Dept of Labour (UIF)"
                                                checked={formData.existingRegistrations.existing_uif}
                                                onChange={handleRegistrationToggle}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 6: Referral Details */}
                            {currentStep === 6 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="referrerName" className="block text-sm font-medium text-slate-700 mb-2">
                                            Who Referred you?
                                        </label>
                                        <div className="relative">
                                            <select
                                                id="referrerName"
                                                name="referrerName"
                                                value={formData.referrerName}
                                                onChange={handleInputChange}
                                                className="block w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 sm:text-sm shadow-sm appearance-none"
                                                style={{
                                                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                                    backgroundPosition: `right 0.5rem center`,
                                                    backgroundRepeat: `no-repeat`,
                                                    backgroundSize: `1.5em 1.5em`,
                                                    paddingRight: `2.5rem`
                                                }}
                                            >
                                                <option value="">Select a name...</option>
                                                <option value="Sarah Jenkins">Sarah Jenkins</option>
                                                <option value="Michael Ross">Michael Ross</option>
                                                <option value="David Chen">David Chen</option>
                                                <option value="Jessica Pearson">Jessica Pearson</option>
                                                <option value="Louis Litt">Louis Litt</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="referralSource" className="block text-sm font-medium text-slate-700 mb-2">
                                            How did you hear about us?
                                        </label>
                                        <div className="relative">
                                            <select
                                                id="referralSource"
                                                name="referralSource"
                                                value={formData.referralSource}
                                                onChange={handleInputChange}
                                                className="block w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 sm:text-sm shadow-sm appearance-none"
                                                style={{
                                                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                                    backgroundPosition: `right 0.5rem center`,
                                                    backgroundRepeat: `no-repeat`,
                                                    backgroundSize: `1.5em 1.5em`,
                                                    paddingRight: `2.5rem`
                                                }}
                                            >
                                                <option value="">Select a source...</option>
                                                <option value="LinkedIn">LinkedIn</option>
                                                <option value="Referrer">Referrer</option>
                                                <option value="Website">Website</option>
                                                <option value="Google Search">Google Search</option>
                                                <option value="Social Media">Social Media</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 7: Final Notes */}
                            {currentStep === 7 && (
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
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Actions / Navigation Buttons */}
                    <div className="flex items-center justify-between pt-8 pb-12">

                        {/* Back Button */}
                        <button
                            type="button"
                            onClick={currentStep === 1 ? onBack : prevStep}
                            className={`px-6 py-3 text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2 ${currentStep === 1 && !onBack ? 'invisible' : ''}`}
                        >
                            <ChevronLeft size={18} />
                            {currentStep === 1 ? 'Back to Services' : 'Back'}
                        </button>

                        <div className="flex gap-4">
                            <button
                                type="button"
                                className="px-4 py-3 text-slate-500 font-medium hover:text-slate-800 transition-colors text-sm"
                            >
                                Save Draft
                            </button>

                            {currentStep < totalSteps ? (
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="px-8 py-3 bg-[#0077BB] hover:bg-[#0066a1] text-white font-semibold rounded-lg shadow-lg shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-900/30 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                                >
                                    Next Step
                                    <ChevronRight size={18} />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-lg shadow-green-900/20 hover:shadow-xl hover:shadow-green-900/30 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                                >
                                    <Send size={18} />
                                    {loading ? 'Submitting...' : 'Submit Application'}
                                </button>
                            )}
                        </div>
                    </div>

                </form>
            </main>
        </div>
    );
}
