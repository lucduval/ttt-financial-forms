import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FormInputProps {
    label: string;
    id: string;
    type?: string;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    required?: boolean;
    icon?: LucideIcon;
}

const FormInput: React.FC<FormInputProps> = ({ label, id, type = "text", placeholder, value, onChange, required = false, icon: Icon }) => (
    <div className="mb-4">
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
            {label} {required && <span className="text-[#0077BB]">*</span>}
        </label>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                {Icon && <Icon size={18} />}
            </div>
            {type === 'textarea' ? (
                <textarea
                    id={id}
                    name={id}
                    required={required}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-400 sm:text-sm shadow-sm"
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    rows={3}
                />
            ) : (
                <input
                    type={type}
                    id={id}
                    name={id}
                    required={required}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077BB] focus:border-[#0077BB] transition-colors bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-400 sm:text-sm shadow-sm"
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                />
            )}
        </div>
    </div>
);

export default FormInput;
