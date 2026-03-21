import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Phone,
  Shield,
  Users,
  LogOut,
  User,
  Calendar,
} from "lucide-react";

export default function ProfileScreen() {
  const { user, token, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    avatarUrl: (user as any)?.avatarUrl || ''
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl || null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        phone: user.phone || "",
        avatarUrl: (user as any).avatarUrl || ''
      });
      setAvatarPreview((user as any).avatarUrl || null);
    }
  }, [user]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch profile stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      let avatarUrlToSend = (user as any).avatarUrl || '';
      if (avatarFile) {
        const fd = new FormData();
        fd.append('file', avatarFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        if (uploadRes.ok) {
          const d = await uploadRes.json();
          avatarUrlToSend = d.url;
        } else {
          alert('Failed to upload avatar');
        }
      }
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...formData, avatarUrl: avatarUrlToSend }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        updateUser(updatedUser);
        setIsEditing(false);
        alert("Profile updated successfully!");
      } else {
        const error = await res.json();
        alert(error.message || "Failed to update profile");
      }
    } catch (err) {
      console.error("Update profile failed", err);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "MD":
        return "bg-purple-100 text-purple-700";
      case "TL":
        return "bg-blue-100 text-blue-700";
      case "AM":
        return "bg-orange-100 text-orange-700";
      case "EMPLOYEE":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getRoleTitle = (role: string) => {
    switch (role) {
      case "MD":
        return "Managing Director";
      case "TL":
        return "Team Leader";
      case "AM":
        return "Area Manager";
      case "EMPLOYEE":
        return "Employee";
      default:
        return role;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-8 text-white shadow-lg">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          <div className="w-24 h-24 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white border-opacity-30 overflow-hidden">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt={user?.name || 'avatar'} className="w-full h-full object-cover" />
            ) : (
              <User className="text-white" size={48} />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{user?.name}</h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <span
                className={`px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm ${getRoleBadgeColor(user?.role || "")}`}
              >
                {getRoleTitle(user?.role || "")}
              </span>
              {user?.region && (
                <span className="px-4 py-1.5 bg-white bg-opacity-20 rounded-full text-sm text-white font-medium backdrop-blur-sm">
                  {user.region}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50 bg-opacity-50 flex items-center justify-between">
              <h2 className="text-gray-900 font-bold flex items-center gap-2">
                <User size={20} className="text-orange-500" />
                Profile Information
              </h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-orange-600 text-sm font-semibold hover:text-orange-700 transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>
            <div className="p-6">
              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all"
                        placeholder="Enter your name"
                        disabled={isSaving}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all"
                        placeholder="Enter phone number"
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm text-gray-600 mb-2">Profile Image (optional)</label>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer inline-flex items-center px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            setAvatarFile(f);
                            if (f) setAvatarPreview(URL.createObjectURL(f));
                          }}
                        />
                        <span className="text-sm text-gray-700">Choose file</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Or paste image URL"
                        className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all"
                        value={(formData as any).avatarUrl || ''}
                        onChange={(e) => { setFormData({ ...formData, avatarUrl: e.target.value }); setAvatarPreview(e.target.value || null); }}
                        disabled={isSaving}
                      />
                    </div>
                    {avatarPreview && (
                      <div className="mt-3 w-28 h-28 rounded-xl overflow-hidden border border-gray-100">
                        <img src={avatarPreview} alt="avatar preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          name: user?.name || "",
                          phone: user?.phone || "",
                          avatarUrl: (user as any)?.avatarUrl || ''
                        });
                      }}
                      disabled={isSaving}
                      className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="text-blue-600" size={18} />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase font-semibold tracking-wider mb-1">
                        Email Address
                      </p>
                      <p className="text-gray-900 font-medium">{user?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone className="text-green-600" size={18} />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase font-semibold tracking-wider mb-1">
                        Mobile Number
                      </p>
                      <p className="text-gray-900 font-medium">
                        {user?.phone || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Shield className="text-purple-600" size={18} />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase font-semibold tracking-wider mb-1">
                        Employee ID
                      </p>
                      <p className="text-gray-900 font-medium">
                        {user?.employeeId || "PB-247-001"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Calendar className="text-gray-600" size={18} />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase font-semibold tracking-wider mb-1">
                        Member Since
                      </p>
                      <p className="text-gray-900 font-medium">
                        {user && "createdAt" in user && user.createdAt
                          ? new Date(user.createdAt as any).toLocaleDateString(
                              "en-IN",
                              {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              },
                            )
                          : "January 15, 2024"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Performance Stats */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50 bg-opacity-50">
              <h2 className="text-gray-900 font-bold">Performance Overview</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-blue-700 text-xs font-semibold uppercase mb-1">
                    Total Leads
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {loading ? "..." : stats?.totalLeads || 0}
                  </h3>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <p className="text-green-700 text-xs font-semibold uppercase mb-1">
                    Conversion
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {loading ? "..." : stats?.conversionRate || "0%"}
                  </h3>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                  <p className="text-orange-700 text-xs font-semibold uppercase mb-1">
                    Today Att.
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {loading ? "..." : stats?.todayAttendance || "Absent"}
                  </h3>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <p className="text-purple-700 text-xs font-semibold uppercase mb-1">
                    Team Size
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {loading ? "..." : stats?.activeEmployees || 1}
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50 bg-opacity-50">
              <h2 className="text-gray-900 font-bold">Account Actions</h2>
            </div>
            <div className="p-6 space-y-3">
              <button className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-left font-medium flex items-center justify-between group">
                Change Password
                <span className="text-gray-400 group-hover:text-gray-600">
                  →
                </span>
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-left font-medium flex items-center justify-between group"
              >
                Update Profile
                <span className="text-gray-400 group-hover:text-gray-600">
                  →
                </span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 font-bold"
              >
                <LogOut size={20} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
