"use client";

import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileSignature, Eraser, ChevronDown, ChevronUp } from "lucide-react";
import LoeTermsContent from "./LoeTermsContent";
import { signLoE } from "../actions";

interface LoeSigningFormProps {
    leadId: string;
    token: string;
    prefill: {
        fullName: string;
        email: string;
        idNumber?: string;
        taxNumber?: string;
        bankName?: string;
        accountName?: string;
        accountType?: string;
        accountNumber?: string;
        branchCode?: string;
    };
}

export default function LoeSigningForm({ leadId, token, prefill }: LoeSigningFormProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    const [termsExpanded, setTermsExpanded] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [optOutMarketing, setOptOutMarketing] = useState(false);
    const [fullName, setFullName] = useState(prefill.fullName || "");
    const [idNumber, setIdNumber] = useState(prefill.idNumber || "");
    const [taxNumber, setTaxNumber] = useState(prefill.taxNumber || "");
    const [bankName, setBankName] = useState(prefill.bankName || "");
    const [accountName, setAccountName] = useState(prefill.accountName || "");
    const [accountType, setAccountType] = useState(prefill.accountType || "");
    const [accountNumber, setAccountNumber] = useState(prefill.accountNumber || "");
    const [branchCode, setBranchCode] = useState(prefill.branchCode || "");
    const [hasSignature, setHasSignature] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState<{ reference: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.scale(dpr, dpr);
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#0f172a";
    }, []);

    const getPos = (canvas: HTMLCanvasElement, e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.setPointerCapture(e.pointerId);
        drawingRef.current = true;
        lastPointRef.current = getPos(canvas, e);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const pos = getPos(canvas, e);
        const last = lastPointRef.current;
        if (last) {
            ctx.beginPath();
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }
        lastPointRef.current = pos;
        if (!hasSignature) setHasSignature(true);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        drawingRef.current = false;
        lastPointRef.current = null;
        const canvas = canvasRef.current;
        if (canvas && canvas.hasPointerCapture(e.pointerId)) {
            canvas.releasePointerCapture(e.pointerId);
        }
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    const detailsComplete =
        idNumber.trim().length > 0 &&
        taxNumber.trim().length > 0 &&
        bankName.trim().length > 0 &&
        accountName.trim().length > 0 &&
        accountType.trim().length > 0 &&
        accountNumber.trim().length > 0 &&
        branchCode.trim().length > 0;

    const canSubmit = agreed && fullName.trim().length >= 2 && detailsComplete && hasSignature && !submitting;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        setSubmitting(true);
        setError(null);
        try {
            const signaturePng = canvas.toDataURL("image/png");
            const result = await signLoE({
                leadId,
                token,
                fullName: fullName.trim(),
                idNumber: idNumber.trim(),
                taxNumber: taxNumber.trim(),
                bankName: bankName.trim(),
                accountName: accountName.trim(),
                accountType: accountType.trim(),
                accountNumber: accountNumber.trim(),
                branchCode: branchCode.trim(),
                signaturePng,
                optOutMarketing,
                userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
            });
            if (!result.success) {
                setError(result.error || "Signing failed. Please try again or contact us.");
                return;
            }
            setDone({ reference: result.reference || "" });
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err) {
            console.error("LoE signing failed:", err);
            setError("There was a problem submitting your signature. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (done) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-12">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} className="text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Letter of Engagement Signed</h2>
                    <p className="text-slate-600 mb-1">Thank you, {fullName.split(" ")[0]}.</p>
                    <p className="text-slate-500 text-sm mb-6">A signed copy has been emailed to <span className="font-medium text-slate-700">{prefill.email}</span> for your records.</p>
                    {done.reference && (
                        <p className="text-xs text-slate-400 mb-8">Reference: {done.reference}</p>
                    )}
                    <a
                        href="https://ttt-tax.co.za"
                        target="_top"
                        className="inline-block py-3 px-6 bg-[#0077BB] hover:bg-[#0066a1] text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
                    >
                        Return to Homepage
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <FileSignature size={22} className="text-[#0077BB]" />
                        <div>
                            <h1 className="text-lg sm:text-xl font-semibold text-slate-800">Letter of Engagement — Tax Services</h1>
                            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Please review and sign below to formalise your engagement with TTT Tax Services.</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-6">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/50 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setTermsExpanded((v) => !v)}
                            aria-expanded={termsExpanded}
                            aria-controls="loe-terms-content"
                            className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-4 text-left hover:bg-slate-100/60 transition-colors"
                        >
                            <span className="text-sm font-medium text-slate-800">
                                {termsExpanded ? "Hide" : "Read"} the Letter of Engagement &amp; Terms
                            </span>
                            {termsExpanded ? (
                                <ChevronUp size={18} className="text-slate-500 shrink-0" />
                            ) : (
                                <ChevronDown size={18} className="text-slate-500 shrink-0" />
                            )}
                        </button>
                        {termsExpanded && (
                            <div id="loe-terms-content" className="border-t border-slate-200 p-4 sm:p-6">
                                <LoeTermsContent />
                            </div>
                        )}
                    </div>

                    <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0077BB] focus:ring-[#0077BB]"
                        />
                        <span className="text-sm text-slate-700">
                            I have read, understood, and agree to the Letter of Engagement and the Standard Terms and Conditions above. I am entering into this agreement of my own free will.
                        </span>
                    </label>

                    <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                            type="checkbox"
                            checked={optOutMarketing}
                            onChange={(e) => setOptOutMarketing(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0077BB] focus:ring-[#0077BB]"
                        />
                        <span className="text-sm text-slate-700">
                            <span className="font-medium">Opt out</span> of marketing about beneficial and related services from TTT Financial Group (clause 11.2).
                        </span>
                    </label>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-800 mb-3">Your details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label htmlFor="loe-fullname" className="block text-sm font-medium text-slate-700 mb-2">
                                    Full legal name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="loe-fullname"
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    placeholder="As it appears on your ID"
                                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 sm:text-sm shadow-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="loe-idnumber" className="block text-sm font-medium text-slate-700 mb-2">
                                    ID number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="loe-idnumber"
                                    type="text"
                                    value={idNumber}
                                    onChange={(e) => setIdNumber(e.target.value)}
                                    required
                                    inputMode="numeric"
                                    placeholder="13-digit RSA ID"
                                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 sm:text-sm shadow-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="loe-taxnumber" className="block text-sm font-medium text-slate-700 mb-2">
                                    Income Tax number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="loe-taxnumber"
                                    type="text"
                                    value={taxNumber}
                                    onChange={(e) => setTaxNumber(e.target.value)}
                                    required
                                    placeholder="SARS tax reference"
                                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 sm:text-sm shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-800 mb-1">Banking details</h3>
                        <p className="text-xs text-slate-500 mb-3">As registered with SARS (e.g. on an IRP5 or pay slip).</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="loe-bankname" className="block text-sm font-medium text-slate-700 mb-2">
                                    Bank name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="loe-bankname"
                                    type="text"
                                    value={bankName}
                                    onChange={(e) => setBankName(e.target.value)}
                                    required
                                    placeholder="e.g. Standard Bank"
                                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 sm:text-sm shadow-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="loe-accountname" className="block text-sm font-medium text-slate-700 mb-2">
                                    Account name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="loe-accountname"
                                    type="text"
                                    value={accountName}
                                    onChange={(e) => setAccountName(e.target.value)}
                                    required
                                    placeholder="Name on the account"
                                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 sm:text-sm shadow-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="loe-accounttype" className="block text-sm font-medium text-slate-700 mb-2">
                                    Account type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="loe-accounttype"
                                    value={accountType}
                                    onChange={(e) => setAccountType(e.target.value)}
                                    required
                                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 sm:text-sm shadow-sm appearance-none"
                                >
                                    <option value="" disabled>Select account type</option>
                                    <option value="Cheque">Cheque / Current</option>
                                    <option value="Savings">Savings</option>
                                    <option value="Transmission">Transmission</option>
                                    <option value="Business">Business</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="loe-accountnumber" className="block text-sm font-medium text-slate-700 mb-2">
                                    Account number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="loe-accountnumber"
                                    type="text"
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value)}
                                    required
                                    inputMode="numeric"
                                    placeholder="Account number"
                                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 sm:text-sm shadow-sm"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="loe-branchcode" className="block text-sm font-medium text-slate-700 mb-2">
                                    Branch name / code <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="loe-branchcode"
                                    type="text"
                                    value={branchCode}
                                    onChange={(e) => setBranchCode(e.target.value)}
                                    required
                                    placeholder="e.g. Universal — 051001"
                                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 sm:text-sm shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-slate-700">
                                Signature <span className="text-red-500">*</span>
                            </label>
                            {hasSignature && (
                                <button
                                    type="button"
                                    onClick={clearSignature}
                                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                                >
                                    <Eraser size={14} /> Clear
                                </button>
                            )}
                        </div>
                        <div className="rounded-lg border border-slate-300 bg-white overflow-hidden">
                            <canvas
                                ref={canvasRef}
                                className="block w-full h-44 sm:h-52 touch-none cursor-crosshair"
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                onPointerCancel={handlePointerUp}
                                onPointerLeave={handlePointerUp}
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Sign with your mouse, finger, or stylus.</p>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="w-full py-3 px-4 bg-[#0077BB] hover:bg-[#0066a1] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
                    >
                        <FileSignature size={18} />
                        {submitting ? "Submitting…" : "Sign & Submit"}
                    </button>
                    <p className="text-xs text-center text-slate-400">
                        By clicking Sign &amp; Submit you confirm that the information above is accurate and that your electronic signature constitutes your legally binding agreement to this Letter of Engagement.
                    </p>
                </form>
            </div>
        </div>
    );
}
