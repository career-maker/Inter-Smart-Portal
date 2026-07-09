"use client";

import { useState } from "react";
import { Upload, Download, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/services/api";

export function CSVImport({ onSuccess }: { onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadSample = async () => {
    try {
      const response = await api.get("/employees/import/sample", {
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "employee-sample.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Failed to download sample CSV");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/employees/import/csv", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setResults(response.data.results);
      if (response.data.results.imported > 0) {
        onSuccess?.();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to import CSV");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Mass Import Employees</h2>
        <p className="text-slate-400">Upload a CSV file to import multiple employees at once</p>
      </div>

      {/* Download Sample */}
      <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center">
        <Download className="w-8 h-8 text-amber-400 mx-auto mb-3" />
        <h3 className="font-semibold text-white mb-2">Download Sample CSV</h3>
        <p className="text-sm text-slate-400 mb-4">
          Download a template with all required fields to fill in and upload
        </p>
        <Button
          onClick={handleDownloadSample}
          variant="outline"
          className="border-amber-400/50 text-amber-400 hover:bg-amber-400/10"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Sample
        </Button>
      </div>

      {/* Upload CSV */}
      <div className="border-2 border-dashed border-white/20 rounded-lg p-6">
        <input
          type="file"
          accept=".csv,.txt"
          onChange={handleFileUpload}
          disabled={loading}
          className="hidden"
          id="csv-upload"
        />
        <label htmlFor="csv-upload" className="cursor-pointer block text-center">
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="font-semibold text-white mb-2">Upload CSV File</h3>
          <p className="text-sm text-slate-400 mb-4">
            Click to select CSV file or drag and drop
          </p>
          <Button
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            {loading ? "Importing..." : "Select CSV File"}
          </Button>
        </label>
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            {results.failed === 0 ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400" />
            )}
            <h4 className="font-semibold text-white">
              Imported {results.imported} employee{results.imported !== 1 ? "s" : ""}
              {results.failed > 0 && `, ${results.failed} failed`}
            </h4>
          </div>

          {results.errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
              <p className="text-sm font-semibold text-red-400 mb-2">Errors:</p>
              <ul className="text-xs text-red-300 space-y-1">
                {results.errors.map((err: string, idx: number) => (
                  <li key={idx}>• {err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* CSV Format Info */}
      <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
        <h4 className="font-semibold text-white text-sm">Required Fields:</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
          <div>• first_name (required)</div>
          <div>• last_name</div>
          <div>• email (required)</div>
          <div>• personal_email</div>
          <div>• employee_code</div>
          <div>• designation</div>
          <div>• team_id</div>
          <div>• joining_date (YYYY-MM-DD)</div>
          <div>• dob (YYYY-MM-DD)</div>
          <div>• gender (Male/Female/Other)</div>
          <div>• blood_group</div>
          <div>• marital_status</div>
          <div>• contact_number</div>
          <div>• alternate_contact_number</div>
          <div>• permanent_address</div>
          <div>• current_address</div>
          <div>• password</div>
          <div>• role (Employee/Team Lead)</div>
        </div>
      </div>
    </div>
  );
}
