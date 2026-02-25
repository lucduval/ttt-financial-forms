"use client";

import React from 'react';
import { Shield, FileText, Calculator, TrendingUp, ArrowRight } from 'lucide-react';

interface ServiceSelectionProps {
    onSelect: (service: string) => void;
}

export default function ServiceSelection({ onSelect }: ServiceSelectionProps) {
    const services = [
        {
            id: 'insurance',
            title: 'Insurance',
            description: 'Personal insurance solutions tailored to your needs.',
            icon: Shield,
            color: 'bg-blue-100 text-blue-600',
            borderColor: 'hover:border-blue-400'
        },
        {
            id: 'tax',
            title: 'Tax',
            description: 'Individual tax filing and compliance services.',
            icon: FileText,
            color: 'bg-green-100 text-green-600',
            borderColor: 'hover:border-green-400'
        },
        {
            id: 'accounting',
            title: 'Accounting',
            description: 'Comprehensive accounting for businesses.',
            icon: Calculator,
            color: 'bg-purple-100 text-purple-600',
            borderColor: 'hover:border-purple-400'
        },
        {
            id: 'advisory',
            title: 'Financial Advisory',
            description: 'Expert financial advice to grow your wealth.',
            icon: TrendingUp,
            color: 'bg-orange-100 text-orange-600',
            borderColor: 'hover:border-orange-400'
        }
    ];

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 text-center">
                Welcome to TTT Financial Group
            </h1>
            <p className="text-lg text-slate-600 mb-12 text-center max-w-2xl">
                Please select the service you are interested in today so we can direct you to the right specialist.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
                {services.map((service) => (
                    <button
                        key={service.id}
                        onClick={() => onSelect(service.id)}
                        className={`group relative bg-white p-6 rounded-2xl shadow-sm border border-slate-200 ${service.borderColor} transition-all duration-300 hover:shadow-lg text-left flex items-start gap-4`}
                    >
                        <div className={`p-3 rounded-xl ${service.color} transition-transform group-hover:scale-110 duration-300`}>
                            <service.icon size={28} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-semibold text-slate-800 mb-2 group-hover:text-[#0077BB] transition-colors">
                                {service.title}
                            </h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                {service.description}
                            </p>
                        </div>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300">
                            <ArrowRight className="text-slate-400" />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
