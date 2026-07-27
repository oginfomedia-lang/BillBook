import { useState, type FormEvent } from "react";
import { Upload } from "lucide-react";
import { useImportCustomers } from "../../hooks/useCustomers";
import { useTranslation } from "../../context/LanguageContext";
import { useBranch } from "../../context/BranchContext";

export function ImportCustomersPage() {
  const { t } = useTranslation();
  const { currentBranchId } = useBranch();
  const [file, setFile] = useState<File | null>(null);
  const importCustomers = useImportCustomers();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    importCustomers.mutate(
      { file, branch_id: currentBranchId || undefined },
      {
        onSuccess: () => setFile(null),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-900">{t("Import Customers")}</h2>
        <p className="text-sm text-slate-500">{t("Upload a CSV file to bulk import customer records into BillBook.")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
        <div className="space-y-4">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-transparent px-4 py-10 text-center text-sm text-slate-500 transition hover:border-slate-300 hover:bg-slate-50">
              <Upload size={24} className="text-slate-400" />
              <span className="font-medium text-slate-700">{t("Drag and drop a CSV here, or click to select a file")}</span>
              <span className="text-xs text-slate-400">{t("Required columns: name, email, phone, billing_address, gstin")}</span>
              <input
                type="file"
                accept=".csv"
                className="sr-only"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {file && (
            <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-700">
              {t("Selected file")}: <span className="font-medium">{file.name}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">{t("Use a CSV with one customer per row. Empty optional fields are allowed.")}</p>
          <button
            type="submit"
            disabled={!file || importCustomers.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {importCustomers.isPending ? t("Importing…") : t("Import customers")}
          </button>
        </div>
      </form>
    </div>
  );
}