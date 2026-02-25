import React, { useState, ChangeEvent } from 'react';
import { UploadCloud, FileCheck, X } from 'lucide-react';

interface FileUploadFieldProps {
    label: string;
    id: string;
    onFileSelect?: (fileData: { name: string, content: string, type: string }) => void;
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({ label, id, onFileSelect }) => {
    const [fileName, setFileName] = useState<string | null>(null);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileName(file.name);

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Remove data URL prefix (e.g., "data:application/pdf;base64,")
                const content = base64String.split(',')[1];

                if (onFileSelect) {
                    onFileSelect({
                        name: file.name,
                        content: content,
                        type: file.type
                    });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.preventDefault();
        setFileName(null);
        // Clear value?
    };

    return (
        <div className={`border-2 border-dashed rounded-lg p-4 transition-all text-center cursor-pointer group relative ${fileName ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:border-[#0077BB] hover:bg-blue-50'}`}>
            <input
                type="file"
                id={id}
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
            />

            {!fileName ? (
                <label htmlFor={id} className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-white transition-colors">
                        <UploadCloud className="text-slate-400 group-hover:text-[#0077BB] transition-colors" size={20} />
                    </div>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-[#0077BB]">{label}</span>
                    <span className="text-xs text-slate-400 mt-1">PDF, JPG or PNG (Max 5MB)</span>
                </label>
            ) : (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg text-green-600">
                            <FileCheck size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-medium text-slate-800 truncate max-w-[150px]">{fileName}</p>
                            <p className="text-xs text-green-600">Ready to upload</p>
                        </div>
                    </div>
                    <button
                        onClick={handleRemove}
                        className="p-1 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded-full transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default FileUploadField;
