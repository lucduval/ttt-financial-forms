"use client";

import { useState } from "react";
import { Send, CheckCircle, AlertCircle } from "lucide-react";
import { submitContactForm } from "../actions";

interface ContactFormProps {
  theme?: "light" | "dark";
  title?: string;
}

export default function ContactForm({
  theme = "light",
  title = "GET CUSTOM FINANCIAL ASSISTANCE",
}: ContactFormProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const isDark = theme === "dark";

  const inputBase =
    "w-full px-4 py-3 text-sm border transition-colors focus:outline-none focus:ring-2 resize-none";
  const inputClass = isDark
    ? `${inputBase} bg-white border-white/40 text-slate-900 placeholder-slate-400 focus:ring-white/50`
    : `${inputBase} rounded-xl bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-[#0077BB]/20 focus:border-[#0077BB]`;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    const result = await submitContactForm(formData);
    setStatus(result.success ? "success" : "error");
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
        <CheckCircle
          size={48}
          className={isDark ? "text-emerald-400" : "text-emerald-500"}
        />
        <h3
          className={`text-xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
        >
          Message sent!
        </h3>
        <p className={isDark ? "text-white/60" : "text-slate-500"}>
          Thank you — a member of our team will be in touch shortly.
        </p>
        <button
          onClick={() => {
            setStatus("idle");
            setFormData({ firstName: "", lastName: "", email: "", phone: "", message: "" });
          }}
          className={`text-sm underline transition-colors ${isDark ? "text-white/50 hover:text-white/80" : "text-slate-400 hover:text-slate-600"}`}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div>
      {title && (
        <div className="mb-6">
          <h2
            className={`font-bold text-xl sm:text-2xl tracking-wide mb-2 ${isDark ? "text-white" : "text-slate-900"}`}
            style={{ fontFamily: "var(--font-roboto), Roboto, Arial, sans-serif" }}
          >
            {title}
          </h2>
          <div className="w-10 h-1 bg-[#E8872E] rounded-full" />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
            placeholder="Phone Number *"
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
          rows={4}
          value={formData.message}
          onChange={handleChange}
          className={inputClass}
        />

        {status === "error" && (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle size={15} />
            <span>Something went wrong. Please try again.</span>
          </div>
        )}

        <button
          type="submit"
          disabled={status === "loading"}
          className={`inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 transform w-full sm:w-auto ${
            isDark
              ? "border-2 border-white text-white hover:bg-white hover:text-[#0077BB] rounded-sm tracking-widest text-xs uppercase"
              : "bg-[#0077BB] hover:bg-[#0168A2] text-white shadow-lg shadow-blue-900/20 rounded-full"
          }`}
        >
          <Send size={15} />
          {status === "loading" ? "Sending…" : "Send Message"}
        </button>
      </form>
    </div>
  );
}
