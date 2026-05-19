"use client";

import { useState } from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import { submitContactForm } from "../actions";

type Status = "idle" | "loading" | "success" | "error";

const EMPTY_FORM = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
};

export default function ContactFormEmbed() {
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [status, setStatus] = useState<Status>("idle");
    const [errorMessage, setErrorMessage] = useState<string>("");

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        setErrorMessage("");
        const result = await submitContactForm(formData);
        if (result.success) {
            setStatus("success");
        } else {
            setStatus("error");
            setErrorMessage(result.error || "Submission failed. Please try again.");
        }
    };

    const reset = () => {
        setFormData(EMPTY_FORM);
        setStatus("idle");
        setErrorMessage("");
    };

    const inputClass =
        "w-full px-4 py-3 text-sm bg-white text-slate-900 placeholder-[#A0A8B0] border-0 rounded-none focus:outline-none focus:ring-2 focus:ring-white/50";

    return (
        <div className="w-full bg-[#0077BB]">
            {status === "success" ? (
                <div className="flex flex-col items-center justify-center text-center gap-4 py-8 text-white">
                    <CheckCircle size={48} className="text-white" />
                    <h3 className="text-xl font-semibold">Message sent!</h3>
                    <p className="text-white/85 text-sm max-w-md">
                        Thank you — a member of our team will be in touch shortly.
                    </p>
                    <button
                        type="button"
                        onClick={reset}
                        className="text-sm underline text-white/85 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50 rounded-sm px-1"
                    >
                        Send another message
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                            type="text"
                            name="firstName"
                            placeholder="First Name *"
                            required
                            value={formData.firstName}
                            onChange={handleChange}
                            className={inputClass}
                            autoComplete="given-name"
                        />
                        <input
                            type="text"
                            name="lastName"
                            placeholder="Last Name *"
                            required
                            value={formData.lastName}
                            onChange={handleChange}
                            className={inputClass}
                            autoComplete="family-name"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                            type="email"
                            name="email"
                            placeholder="Email Address *"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className={inputClass}
                            autoComplete="email"
                        />
                        <input
                            type="tel"
                            name="phone"
                            placeholder="Contact Number *"
                            required
                            value={formData.phone}
                            onChange={handleChange}
                            className={inputClass}
                            autoComplete="tel"
                        />
                    </div>

                    <textarea
                        name="message"
                        placeholder="Message / Question *"
                        required
                        rows={5}
                        value={formData.message}
                        onChange={handleChange}
                        className={`${inputClass} resize-none`}
                    />

                    {status === "error" && (
                        <div className="flex items-center gap-2 text-sm text-white bg-red-600/90 px-3 py-2 rounded-sm">
                            <AlertCircle size={16} />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={status === "loading"}
                        className="w-full sm:w-auto px-8 py-3 bg-white text-[#0077BB] font-semibold text-sm uppercase tracking-wide rounded-none hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                        {status === "loading" ? "Sending…" : "Send Message"}
                    </button>
                </form>
            )}
        </div>
    );
}
