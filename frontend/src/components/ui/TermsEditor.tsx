// frontend/src/components/ui/TermsEditor.tsx

import { useState } from "react";
import { FileText, ChevronDown, ChevronUp, Plus, X } from "lucide-react";

interface TermsEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

const TEMPLATES = {
  standard: {
    name: "Standard Terms",
    content: `1. Payment Terms: 50% advance, balance before delivery
2. Delivery: Within 7-10 working days
3. Warranty: 30 days from delivery
4. Returns: Accepted within 7 days
5. GST Extra as applicable
6. Valid for 30 days
7. Prices subject to change without notice`
  },
  clothing: {
    name: "Clothing Store Terms",
    content: `1. Payment Terms: 50% advance, balance before dispatch
2. Delivery: Within 5-7 working days
3. Exchange: Accepted within 7 days
4. Returns: Accepted within 7 days (unworn condition)
5. GST Extra as applicable
6. Valid for 30 days
7. Fabric colors may vary slightly
8. Free shipping on orders above ₹50,000`
  },
  wholesale: {
    name: "Wholesale Terms",
    content: `1. Payment Terms: 30% advance, balance before dispatch
2. Delivery: Within 10-15 working days
3. Bulk Discount: As per order value
4. Exchange: Accepted within 15 days
5. Returns: Accepted within 15 days
6. Minimum order: ₹50,000
7. Valid for 20 days
8. Free delivery above ₹1,00,000`
  },
  quick: {
    name: "Quick / POS Terms",
    content: `1. Payment: 100% advance
2. Delivery: 3-5 working days
3. Exchange: 7 days
4. GST Extra as applicable
5. Valid for 15 days`
  },
  export: {
    name: "Export Terms",
    content: `1. Payment: LC or TT
2. Delivery: FOB Mumbai
3. Shipping: As per Incoterms
4. Insurance: Buyer's option
5. Inspection: SGS or similar
6. GST: Zero rated for export
7. Valid for 60 days
8. Prices in USD
9. Minimum order: 1000 units`
  }
};

export function TermsEditor({ value, onChange, placeholder, label = "Terms & Conditions" }: TermsEditorProps) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const applyTemplate = (content: string) => {
    onChange(content);
    setShowTemplates(false);
  };

  const characterCount = value?.length || 0;
  const lineCount = value?.split('\n').filter(line => line.trim()).length || 0;

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">{label}</span>
          <span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded-full">
            {lineCount} clauses
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowTemplates(!showTemplates);
            }}
            className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
          >
            <Plus size={12} />
            Templates
          </button>
          {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* Templates Dropdown */}
          {showTemplates && (
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-600">Choose a template:</p>
                <button
                  type="button"
                  onClick={() => setShowTemplates(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(TEMPLATES).map(([key, template]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyTemplate(template.content)}
                    className="text-left px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
                  >
                    <span className="font-medium">{template.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Textarea */}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
            placeholder={placeholder || "Enter terms and conditions for this quotation..."}
          />

          {/* Footer */}
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>
              {characterCount} characters • {lineCount} clauses
            </span>
            <span className="flex gap-3">
              <button
                type="button"
                onClick={() => onChange("")}
                className="hover:text-red-500 transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  // Format the text with numbering
                  const lines = value.split('\n').filter(line => line.trim());
                  const formatted = lines.map((line, i) => `${i+1}. ${line.trim().replace(/^\d+\.\s*/, '')}`).join('\n');
                  onChange(formatted);
                }}
                className="hover:text-blue-600 transition-colors"
              >
                Format
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}