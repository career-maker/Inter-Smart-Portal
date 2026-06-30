"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { 
  Award, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  PowerOff,
  Power,
  Users
} from "lucide-react";
import api from "@/services/api";

const PREDEFINED_TITLES = [
  { title: "Hubstaff King", icon: "👑" },
  { title: "Employee of the Week", icon: "⭐" },
  { title: "QA Champion", icon: "🏆" },
  { title: "Attendance Star", icon: "⏰" },
  { title: "Best Performer", icon: "🚀" },
  { title: "Team Hero", icon: "🌟" },
];

export default function RecognitionsPage() {
  const [recognitions, setRecognitions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    user_id: "",
    title_selection: "", // predefined title or 'custom'
    custom_title: "",
    icon: "🏆",
    start_date: "",
    end_date: "",
    description: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recRes, empRes] = await Promise.all([
        api.get("/recognitions"),
        api.get("/employees")
      ]);
      setRecognitions(recRes.data.data);
      setEmployees(empRes.data.employees || []);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isCustom = formData.title_selection === "custom";
      const title = isCustom ? formData.custom_title : formData.title_selection;
      
      let icon = formData.icon;
      if (!isCustom) {
        const predefined = PREDEFINED_TITLES.find(t => t.title === formData.title_selection);
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
      setFormData({
        user_id: "", title_selection: "", custom_title: "", icon: "🏆", start_date: "", end_date: "", description: ""
      });
      fetchData();
    } catch (error) {
      console.error("Error creating recognition", error);
      alert("Failed to create recognition.");
    }
  };

  const toggleStatus = async (id: number) => {
    try {
      await api.put(`/recognitions/${id}/toggle`);
      fetchData();
    } catch (error) {
      console.error("Error toggling status", error);
    }
  };

  const deleteRecognition = async (id: number) => {
    if (!confirm("Are you sure you want to delete this recognition?")) return;
    try {
      await api.delete(`/recognitions/${id}`);
      fetchData();
    } catch (error) {
      console.error("Error deleting", error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading recognitions...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-600" />
            Employee Recognitions
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage titles and awards for employees.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Assign Recognition
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Period</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recognitions.map((rec) => {
                const isActive = rec.is_active && new Date(rec.start_date) <= new Date() && new Date(rec.end_date) >= new Date();
                
                return (
                  <tr key={rec.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{rec.user.first_name} {rec.user.last_name}</div>
                      <div className="text-xs text-gray-500">{rec.user.employee_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-bold text-indigo-900">
                        <span>{rec.icon}</span>
                        <span>{rec.title}</span>
                        {rec.is_custom && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded uppercase tracking-wider">Custom</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={rec.description}>{rec.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{format(new Date(rec.start_date), "MMM d, yyyy")}</div>
                      <div className="text-gray-500 text-xs">to {format(new Date(rec.end_date), "MMM d, yyyy")}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold">
                          <ShieldCheck className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-bold">
                          Expired/Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => toggleStatus(rec.id)}
                        className={`p-1.5 rounded-lg transition ${rec.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                        title={rec.is_active ? "Disable" : "Enable"}
                      >
                        {rec.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => deleteRecognition(rec.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {recognitions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No recognitions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl my-8">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-gray-900">Assign Recognition</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Employee <span className="text-red-500">*</span></label>
                <select
                  required
                  value={formData.user_id}
                  onChange={e => setFormData({...formData, user_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                >
                  <option value="">Select Employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.employee_id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Recognition Title <span className="text-red-500">*</span></label>
                <select
                  required
                  value={formData.title_selection}
                  onChange={e => setFormData({...formData, title_selection: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                >
                  <option value="">Select a Title...</option>
                  <optgroup label="Predefined">
                    {PREDEFINED_TITLES.map(pt => (
                      <option key={pt.title} value={pt.title}>{pt.icon} {pt.title}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Other">
                    <option value="custom">Custom Title...</option>
                  </optgroup>
                </select>
              </div>

              {formData.title_selection === "custom" && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Custom Title Name <span className="text-red-500">*</span></label>
                    <input
                      required
                      type="text"
                      value={formData.custom_title}
                      onChange={e => setFormData({...formData, custom_title: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                      placeholder="e.g. Sales Ninja"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Emoji</label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={e => setFormData({...formData, icon: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-center"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                  <input
                    required
                    type="date"
                    value={formData.start_date}
                    onChange={e => setFormData({...formData, start_date: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Date <span className="text-red-500">*</span></label>
                  <input
                    required
                    type="date"
                    value={formData.end_date}
                    onChange={e => setFormData({...formData, end_date: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Appreciation Message <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm resize-none"
                  placeholder="For achieving the highest productivity score this week..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white py-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition"
                >
                  Assign Recognition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
