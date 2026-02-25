import React from 'react';

interface ServiceCheckboxProps {
    id: string;
    label: string;
    checked: boolean;
    onChange: (id: string) => void;
}

const ServiceCheckbox: React.FC<ServiceCheckboxProps> = ({ id, label, checked, onChange }) => (
    <div
        className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all duration-200 ${checked ? 'border-[#0077BB] bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}
        onClick={() => onChange(id)}
    >
        <div className="flex items-center h-5">
            <input
                id={id}
                type="checkbox"
                className="w-4 h-4 text-[#0077BB] border-gray-300 rounded focus:ring-[#0077BB]"
                checked={checked}
                onChange={() => { }} // Handled by parent div
            />
        </div>
        <div className="ml-3 text-sm">
            <label htmlFor={id} className={`font-medium ${checked ? 'text-[#0077BB]' : 'text-slate-700'} cursor-pointer`}>
                {label}
            </label>
        </div>
    </div>
);

export default ServiceCheckbox;
