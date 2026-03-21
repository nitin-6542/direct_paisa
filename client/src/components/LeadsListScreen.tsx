import { useState, useEffect } from "react";
import { Filter, Download, Search, Upload, Eye, Trash2, Edit2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ConfirmationModal from "./ui/ConfirmationModal";

export default function LeadsListScreen() {
  const { token } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({ customerName: '', phone: '', company: '', loanAmount: '' });
  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leadsRes, usersRes, companiesRes] = await Promise.all([
          fetch("/api/leads", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/companies", { headers: { Authorization: `Bearer ${token}` } })
        ]);
        if (leadsRes.ok) {
          setLeads(await leadsRes.json());
        }
        if (usersRes.ok) {
          setUsers(await usersRes.json());
        }
        if (companiesRes.ok) {
          setCompanies(await companiesRes.json());
        }
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const getCreatorDetails = (createdById: number) => {
    const user = users.find(u => u.id === createdById);
    if (!user) return { name: "Unknown", role: "" };
    return { name: user.name, role: user.role };
  };

  const getManagerDetails = (createdById: number) => {
    const creator = users.find(u => u.id === createdById);
    if (!creator) return { name: "N/A", role: "" };

    if (creator.teamLeaderId) {
      const tl = users.find(u => u.id === creator.teamLeaderId);
      if (tl) return { name: tl.name, role: tl.role };
    }
    if (creator.areaManagerId) {
      const am = users.find(u => u.id === creator.areaManagerId);
      if (am) return { name: am.name, role: am.role };
    }
    
    // If the creator doesn't have a TL or AM, they are at the top (or are an MD)
    if (creator.role === "MD") return { name: creator.name, role: "MD (Self)" };
    return { name: "Direct", role: "MD" };
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    leadId: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingId(Number(leadId));
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      const { url } = await uploadRes.json();

      // Save URL in lead
      const updateRes = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ screenshotUrl: url }),
      });

      if (!updateRes.ok) throw new Error("Update failed");

      const updatedLead = await updateRes.json();

      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? updatedLead : l))
      );
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploadingId(null);
    }
  };

  const handleDeleteLead = async (leadId: number) => {
    setDeletingId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok && res.status !== 204) throw new Error("Delete failed");

      setLeads((prev) => prev.filter((l) => l.id !== leadId));
    } catch (err) {
      console.error("Delete error:", err);
      alert('Failed to delete lead');
    } finally {
      setDeletingId(null);
      setDeletingId(null);
      setConfirmOpen(false);
      setConfirmTarget(null);
    }
  };

  const openEditModal = (lead: any) => {
    setEditingLead(lead);
    setEditFormData({
      customerName: lead.customerName || '',
      phone: lead.phone || '',
      company: lead.company || '',
      loanAmount: lead.loanAmount ? String(lead.loanAmount) : ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/leads/${editingLead.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerName: editFormData.customerName,
          phone: editFormData.phone,
          company: editFormData.company,
          loanAmount: editFormData.loanAmount ? Number(editFormData.loanAmount) : null
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setLeads((prev) => prev.map((l) => (l.id === editingLead.id ? updated : l)));
        setShowEditModal(false);
        setEditingLead(null);
      } else {
        alert("Failed to update lead");
      }
    } catch (err) {
      console.error("Edit failed:", err);
      alert("Failed to update lead");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "converted":
        return "bg-green-100 text-green-700";
      case "lost":
        return "bg-red-100 text-red-700";
      case "in progress":
        return "bg-blue-100 text-blue-700";
      case "new":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      (lead.company &&
        lead.company.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" || lead.status === statusFilter;
    let matchesEmployee = true;
    if (employeeFilter !== "all") {
      const selectedManagerId = Number(employeeFilter);
      const teamUserIds = users
        .filter(u => u.id === selectedManagerId || u.teamLeaderId === selectedManagerId || u.areaManagerId === selectedManagerId)
        .map(u => u.id);
      matchesEmployee = teamUserIds.includes(lead.createdById) || teamUserIds.includes(lead.assignedToId || 0);
    }
    // date range filtering
    let matchesDate = true;
    try {
      if (startDate || endDate) {
        const leadDate = lead.createdAt ? new Date(lead.createdAt) : null;
        if (!leadDate) {
          matchesDate = false;
        } else {
          if (startDate) {
            const s = new Date(startDate);
            s.setHours(0, 0, 0, 0);
            if (leadDate < s) matchesDate = false;
          }
          if (endDate && matchesDate) {
            const e = new Date(endDate);
            // include entire end day
            e.setDate(e.getDate() + 1);
            e.setHours(0, 0, 0, 0);
            if (leadDate >= e) matchesDate = false;
          }
        }
      }
    } catch (err) {
      matchesDate = true;
    }

    return matchesSearch && matchesStatus && matchesEmployee && matchesDate;
  });

  // Export filtered leads as CSV
  const handleExport = () => {
    try {
      const rows = [
        [
          "Customer",
          "Mobile",
          "Company",
          "Added By",
          "Role",
          "Manager",
          "Manager Role",
          "Loan Amount",
          "Status",
          "Date",
          "Screenshot URL",
        ],
      ];

      filteredLeads.forEach((lead) => {
        const creator = getCreatorDetails(lead.createdById || lead.createdBy || 0);
        const manager = getManagerDetails(lead.createdById || lead.createdBy || 0);
        rows.push([
          lead.customerName ?? "",
          lead.phone ?? "",
          lead.company ?? "",
          creator.name,
          creator.role,
          manager.name,
          manager.role,
          lead.loanAmount != null ? String(lead.loanAmount) : "",
          lead.status ?? "",
          lead.createdAt ? new Date(lead.createdAt).toLocaleString() : "",
          lead.screenshotUrl ?? "",
        ]);
      });

      const csv = rows
        .map((r) =>
          r
            .map((cell) => {
              if (cell == null) return "";
              const s = String(cell).replace(/"/g, '""');
              return `"${s}"`;
            })
            .join(","),
        )
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads_export_${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export leads");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 mb-2">Leads Management</h1>
            <p className="text-gray-600">Track and manage all your leads</p>
          </div>
          <button onClick={handleExport} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-xl transition-colors flex items-center gap-2">
            <Download size={20} />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search by name, mobile, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="New">New</option>
              <option value="In Progress">In Progress</option>
              <option value="Converted">Converted</option>
              <option value="Lost">Lost</option>
            </select>
          </div>

          <div>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Teams / Managers</option>
              {users.filter(u => ["MD", "AM", "TL"].includes(u.role)).map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-gray-600 mb-1">Total Leads</p>
          <h3 className="text-gray-900">{leads.length}</h3>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-gray-600 mb-1">Converted</p>
          <h3 className="text-green-600">
            {leads.filter((l) => l.status === "Converted").length}
          </h3>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-gray-600 mb-1">New</p>
          <h3 className="text-yellow-600">
            {leads.filter((l) => l.status === "New").length}
          </h3>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-gray-600 mb-1">In Progress</p>
          <h3 className="text-blue-600">
            {leads.filter((l) => l.status === "In Progress").length}
          </h3>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-gray-700">Customer</th>
                <th className="px-6 py-4 text-left text-gray-700">Mobile</th>
                <th className="px-6 py-4 text-left text-gray-700">Company</th>
                <th className="px-6 py-4 text-left text-gray-700">Added By</th>
                <th className="px-6 py-4 text-left text-gray-700">Manager</th>
                <th className="px-6 py-4 text-left text-gray-700">
                  Loan Amount
                </th>
                <th className="px-6 py-4 text-left text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-gray-700">Date</th>
                <th className="px-6 py-4 text-left text-gray-700">
                  Screenshot
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="text-gray-900">{lead.customerName}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{lead.phone}</td>
                  <td className="px-6 py-4 text-gray-700">{lead.company}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-gray-900">{getCreatorDetails(lead.createdById).name}</span>
                      <span className="text-xs text-gray-500">{getCreatorDetails(lead.createdById).role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-gray-900">{getManagerDetails(lead.createdById).name}</span>
                      <span className="text-xs text-gray-500">{getManagerDetails(lead.createdById).role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    ₹{lead.loanAmount?.toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={lead.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value;

                        try {
                          const res = await fetch(`/api/leads/${lead.id}`, {
                            method: "PUT",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ status: newStatus }),
                          });

                          if (res.ok) {
                            const updated = await res.json();
                            setLeads((prev) =>
                              prev.map((l) => (l.id === lead.id ? updated : l)),
                            );
                          }
                        } catch (err) {
                          console.error("Failed to update status", err);
                        }
                      }}
                      className={`px-3 py-2 rounded-lg text-sm ${getStatusColor(lead.status)}`}
                    >
                      <option value="New">New</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Converted">Converted</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {new Date(lead.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-6 py-4 flex items-center gap-3">
                    {lead.screenshotUrl && (
                      <button
                        onClick={() => setPreviewImage(lead.screenshotUrl)}
                        className="text-gray-600 hover:text-orange-500 transition"
                        title="View Screenshot"
                      >
                        <Eye size={20} />
                      </button>
                    )}

                    <label
                      className="text-gray-600 hover:text-blue-600 transition cursor-pointer"
                      title={lead.screenshotUrl ? "Change Screenshot" : "Upload Screenshot"}
                    >
                      <Upload size={20} />
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => handleFileUpload(e, lead.id)}
                      />
                    </label>

                    <button
                      onClick={() => openEditModal(lead)}
                      className="text-gray-600 hover:text-blue-600 transition"
                      title="Edit Lead"
                    >
                      <Edit2 size={20} />
                    </button>

                    <button
                      onClick={() => { setConfirmTarget(lead.id); setConfirmOpen(true); }}
                      className="text-gray-600 hover:text-red-600 transition"
                      title="Delete Lead"
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLeads.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-500">
              No leads found matching your criteria
            </p>
          </div>
        )}
      </div>
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 max-w-3xl w-full relative">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 text-gray-600"
            >
              ✕
            </button>
            <img
              src={previewImage}
              alt="Screenshot Preview"
              className="w-full rounded-lg"
            />
          </div>
        </div>
      )}
      <ConfirmationModal
        open={confirmOpen}
        title="Delete lead"
        description="This will mark the lead as lost and remove it from your list."
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={() => confirmTarget && handleDeleteLead(confirmTarget)}
        confirmText={deletingId ? 'Deleting...' : 'Delete'}
      />

      {showEditModal && editingLead && (
        <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-gray-900 text-xl font-bold">Edit Lead</h2>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Customer Name"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  value={editFormData.customerName}
                  onChange={e => setEditFormData({ ...editFormData, customerName: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Mobile Number"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  value={editFormData.phone}
                  onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                  required
                />
                <select
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  value={editFormData.company}
                  onChange={e => setEditFormData({ ...editFormData, company: e.target.value })}
                >
                  <option value="">Select a company</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.title}>{c.title}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Loan Amount"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  value={editFormData.loanAmount}
                  onChange={e => setEditFormData({ ...editFormData, loanAmount: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowEditModal(false); setEditingLead(null); }} className="flex-1 px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cancel</button>
                <button type="submit" className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-bold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
