"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/PageLoader";
import { format } from "date-fns";
import {
  Award,
  Plus,
  Trash2,
  ShieldCheck,
  PowerOff,
  Power,
  Loader2,
  Trophy,
  Eye,
  Download,
} from "lucide-react";
import api from "@/services/api";
import Link from "next/link";
import { CertificateModal } from "@/components/recognition/CertificateModal";

const PREDEFINED_TITLES = [
  { title: "Hubstaff King", icon: "👑" },
  { title: "Employee of the Week", icon: "⭐" },
  { title: "QA Champion", icon: "🏆" },
  { title: "Attendance Star", icon: "⏰" },
  { title: "Best Performer", icon: "🚀" },
  { title: "Team Hero", icon: "🌟" },
  { title: "Innovation Award", icon: "💡" },
  { title: "Customer Champion", icon: "🤝" },
];

export default function RecognitionsPage() {
  const router = useRouter();
  const [recognitions, setRecognitions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [certRec, setCertRec] = useState<any | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [showEmployeeList, setShowEmployeeList] = useState(false);

  const filteredEmployees = employees.filter((emp) =>
    `${emp.first_name} ${emp.last_name} (${emp.employee_code})`.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const [formData, setFormData] = useState({
    user_id: "",
    title_selection: "",
    custom_title: "",
    icon: "🏆",
    start_date: "",
    end_date: "",
    description: "",
  });

  useEffect(() => {
    fetchRecognitions();
    fetchEmployees();
  }, []);

  // Refetch employees when modal opens to ensure we have fresh data
  useEffect(() => {
    if (showModal) {
      fetchEmployees();
    }
  }, [showModal]);

  const fetchRecognitions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/recognitions");
      setRecognitions(res.data.data);
    } catch (error) {
      console.error("Failed to fetch recognitions", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      // Fetch all employees by getting first 1000 employees
      // API paginates with default of 10, so we request per_page=500 for all pages
      const res = await api.get("/employees?per_page=500&page=1");
      const allEmployees = res.data.data || [];

      // If there are more pages, fetch them too
      const meta = res.data.meta;
      if (meta && meta.last_page > 1) {
        for (let page = 2; page <= meta.last_page; page++) {
          try {
            const pageRes = await api.get(`/employees?per_page=500&page=${page}`);
            allEmployees.push(...(pageRes.data.data || []));
          } catch (err) {
            console.error(`Failed to fetch page ${page}`, err);
          }
        }
      }

      // Remove duplicates based on employee ID
      const uniqueEmployees = Array.from(new Map(allEmployees.map((emp: any) => [emp.id, emp])).values());
      setEmployees(uniqueEmployees);
    } catch (error) {
      console.error("Failed to fetch employees", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isCustom = formData.title_selection === "custom";
      const title = isCustom ? formData.custom_title : formData.title_selection;

      let icon = formData.icon;
      if (!isCustom) {
        const predefined = PREDEFINED_TITLES.find((t) => t.title === formData.title_selection);
        if (predefined) icon = predefined.icon;
      }

      await api.post("/recognitions", {
        user_id: formData.user_id,
        title,
        is_custom: isCustom,
        icon,
        start_date: formData.start_date,
        end_date: formData.end_date,
        description: formData.description,
      });

      setShowModal(false);
      setEmployeeSearch("");
      setShowEmployeeList(false);
      setFormData({
        user_id: "",
        title_selection: "",
        custom_title: "",
        icon: "🏆",
        start_date: "",
        end_date: "",
        description: "",
      });
      fetchRecognitions();
    } catch (error: any) {
      console.error("Error creating recognition", error);
      alert(error.response?.data?.message || "Failed to create recognition.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (id: number) => {
    setTogglingId(id);
    try {
      await api.put(`/recognitions/${id}/toggle`);
      fetchRecognitions();
    } catch (error) {
      console.error("Error toggling status", error);
    } finally {
      setTogglingId(null);
    }
  };

  const deleteRecognition = async (id: number) => {
    if (!confirm("Are you sure you want to delete this recognition?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/recognitions/${id}`);
      fetchRecognitions();
    } catch (error) {
      console.error("Error deleting", error);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div style={{ width: "min(96vw, 1800px)", margin: "0 auto" }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Award className="w-6 h-6 text-amber-400" />
            Achievement & Awards Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">Assign and manage employee recognition awards.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/recognitions/leaderboard"
            className="flex items-center gap-2 border border-amber-500/30 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            <Trophy className="w-4 h-4" />
            View Leaderboard
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-600 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Assign Achievement
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 text-slate-300 font-semibold border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Achievement</th>
                <th className="px-6 py-4">Period</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recognitions.map((rec) => {
                const today = new Date(); today.setHours(0,0,0,0);
                const start = new Date(rec.start_date); start.setHours(0,0,0,0);
                const end = new Date(rec.end_date); end.setHours(23,59,59,999);
                const isActive = rec.is_active && start <= today && end >= today;
                const isToggling = togglingId === rec.id;
                const isDeleting = deletingId === rec.id;
                const employeeName = rec.user
                  ? `${rec.user.first_name} ${rec.user.last_name}`
                  : "Unknown";

                return (
                  <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{employeeName}</div>
                      <div className="text-xs text-slate-400">{rec.user?.employee_code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-bold text-amber-300">
                        <span>{rec.icon}</span>
                        <span>{rec.title}</span>
                        {rec.is_custom && (
                          <span className="text-[10px] bg-white/10 text-slate-300 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Custom
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 max-w-xs truncate" title={rec.description}>
                        {rec.description}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-200">
                        {format(new Date(rec.start_date), "MMM d, yyyy")}
                      </div>
                      <div className="text-slate-400 text-xs">
                        to {format(new Date(rec.end_date), "MMM d, yyyy")}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full text-xs font-bold">
                          <ShieldCheck className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-white/10 text-slate-400 px-2 py-1 rounded-full text-xs font-bold">
                          Expired/Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      {/* View Certificate */}
                      <button
                        onClick={() => setCertRec({ ...rec, _employeeName: employeeName })}
                        className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                        title="View Certificate"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {/* Toggle */}
                      <button
                        onClick={() => toggleStatus(rec.id)}
                        disabled={isToggling || isDeleting}
                        className={`p-1.5 rounded-lg transition disabled:opacity-50 ${
                          rec.is_active
                            ? "text-amber-400 hover:bg-amber-500/10"
                            : "text-emerald-400 hover:bg-emerald-500/10"
                        }`}
                        title={rec.is_active ? "Disable" : "Enable"}
                      >
                        {isToggling ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : rec.is_active ? (
                          <PowerOff className="w-4 h-4" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => deleteRecognition(rec.id)}
                        disabled={isDeleting || isToggling}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-50"
                        title="Delete"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {recognitions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <Trophy className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                    <p className="font-medium">No achievements assigned yet.</p>
                    <p className="text-sm mt-1">Click "Assign Achievement" to get started.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Certificate Modal */}
      {certRec && (
        <CertificateModal
          recognition={certRec}
          employeeName={certRec._employeeName}
          onClose={() => setCertRec(null)}
        />
      )}

      {/* Assign Achievement Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-lg shadow-xl my-8">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center sticky top-0 bg-slate-800 rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Assign Achievement
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEmployeeSearch("");
                  setShowEmployeeList(false);
                }}
                className="text-slate-400 hover:text-white text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="relative">
                <label className="block text-sm font-semibold text-slate-300 mb-1">
                  Employee <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Search by name or employee code..."
                  value={employeeSearch}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value);
                    setShowEmployeeList(true);
                  }}
                  onFocus={() => setShowEmployeeList(true)}
                  className="w-full border border-white/10 bg-slate-700 text-white rounded-lg p-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                />
                {showEmployeeList && employees.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-white/10 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                    {(employeeSearch ? filteredEmployees : employees).length > 0 ? (
                      (employeeSearch ? filteredEmployees : employees).map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, user_id: String(emp.id) });
                            setEmployeeSearch(`${emp.first_name} ${emp.last_name} (${emp.employee_code})`);
                            setShowEmployeeList(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-600 focus:bg-slate-600 outline-none border-b border-white/5 last:border-b-0"
                        >
                          {emp.first_name} {emp.last_name}
                          <span className="text-slate-400 ml-1">({emp.employee_code})</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-slate-400">No employees found</div>
                    )}
                  </div>
                )}
                {formData.user_id && (
                  <p className="text-xs text-emerald-400 mt-1">✓ Employee selected</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">
                  Achievement Title <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={formData.title_selection}
                  onChange={(e) => setFormData({ ...formData, title_selection: e.target.value })}
                  className="w-full border border-white/10 bg-slate-700 text-white rounded-lg p-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                >
                  <option value="" className="bg-slate-700">Select a Title...</option>
                  <optgroup label="Predefined Awards">
                    {PREDEFINED_TITLES.map((pt) => (
                      <option key={pt.title} value={pt.title} className="bg-slate-700">
                        {pt.icon} {pt.title}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Other">
                    <option value="custom" className="bg-slate-700">
                      Custom Title...
                    </option>
                  </optgroup>
                </select>
              </div>

              {formData.title_selection === "custom" && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3">
                    <label className="block text-sm font-semibold text-slate-300 mb-1">
                      Custom Title Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.custom_title}
                      onChange={(e) => setFormData({ ...formData, custom_title: e.target.value })}
                      className="w-full border border-white/10 bg-slate-700 text-white rounded-lg p-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                      placeholder="e.g. Sales Ninja"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-semibold text-slate-300 mb-1">Emoji</label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full border border-white/10 bg-slate-700 text-white rounded-lg p-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm text-center"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">
                    Start Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full border border-white/10 bg-slate-700 text-white rounded-lg p-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">
                    End Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full border border-white/10 bg-slate-700 text-white rounded-lg p-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">
                  Achievement Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-white/10 bg-slate-700 text-white rounded-lg p-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm resize-none"
                  placeholder="For achieving the highest productivity score this week..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEmployeeSearch("");
                    setShowEmployeeList(false);
                  }}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-slate-300 border border-white/10 bg-white/5 hover:bg-white/10 rounded-lg transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? "Saving..." : "Assign Achievement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
