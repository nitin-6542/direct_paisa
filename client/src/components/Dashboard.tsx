import { useAuth } from "../context/AuthContext";
import { useEffect, useState, useRef } from "react";
import { TrendingUp, Users, CheckCircle, Clock, Image as ImageIcon, Trash2, Edit2 } from "lucide-react";

interface DashboardData {
  totalLeads: number;
  todayAttendance: string;
  activeEmployees: number | null;
  conversionRate: string;
  recentActivity: any[];
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [homeImage, setHomeImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [res, homeRes] = await Promise.all([
          fetch("/api/dashboard", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/home-settings", { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const result = await res.json();
        setData(result);
        
        if (homeRes.ok) {
          const homeData = await homeRes.json();
          setHomeImage(homeData?.imageUrl || null);
        }
      } catch (error) {
        console.error("Dashboard fetch failed", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [token]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url } = await uploadRes.json();
      
      const saveRes = await fetch("/api/home-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ imageUrl: url })
      });
      if (saveRes.ok) {
        setHomeImage(url);
      }
    } catch (err) {
      console.error("Failed to upload image", err);
      alert("Failed to upload image");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageDelete = async () => {
    if (!confirm("Are you sure you want to remove the home screen image?")) return;
    try {
      const saveRes = await fetch("/api/home-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ imageUrl: null })
      });
      if (saveRes.ok) {
        setHomeImage(null);
      }
    } catch (err) {
      console.error("Failed to delete image", err);
      alert("Failed to delete image");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-60">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center h-60">
        <p className="text-gray-500">Unable to load dashboard.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Home Image Section */}
      {(homeImage || user?.role === "MD") && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative group">
          {homeImage ? (
            <div className="w-full h-48 md:h-64 lg:h-80 relative bg-gray-100">
              <img src={homeImage} alt="Home Banner" className="w-full h-full object-cover" />
              {user?.role === "MD" && (
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-white/90 hover:bg-white text-gray-700 rounded-lg shadow-sm backdrop-blur-sm transition-all" title="Change Image">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={handleImageDelete} className="p-2 bg-white/90 hover:bg-white text-red-600 rounded-lg shadow-sm backdrop-blur-sm transition-all" title="Delete Image">
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full py-16 flex flex-col items-center justify-center bg-gray-50/50 border-b border-gray-100 border-dashed">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
                <ImageIcon size={32} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Add Home Screen Image</h3>
              <p className="text-gray-500 text-sm mb-4">This image will be visible to everyone on the dashboard.</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {uploadingImage ? "Uploading..." : "Upload Image"}
              </button>
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-sm">
        <h1 className="mb-2 text-2xl font-bold">Welcome back, {user?.name}!</h1>
        <p className="text-orange-100">
          Here's what's happening with your business today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <StatCard
          icon={<TrendingUp className="text-blue-600" size={24} />}
          bg="bg-blue-50"
          value={data.totalLeads}
          label="Total Leads"
        />

        {/* Attendance */}
        <StatCard
          icon={<CheckCircle className="text-green-600" size={24} />}
          bg="bg-green-50"
          value={data.todayAttendance}
          label="Today's Attendance"
        />

        {/* Active Employees */}
        {data.activeEmployees !== null && (
          <StatCard
            icon={<Users className="text-purple-600" size={24} />}
            bg="bg-purple-50"
            value={data.activeEmployees}
            label="Active Employees"
          />
        )}

        {/* Conversion */}
        <StatCard
          icon={<Clock className="text-orange-600" size={24} />}
          bg="bg-orange-50"
          value={data.conversionRate}
          label="Conversion Rate"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-gray-900">Recent Activity</h2>
        </div>

        <div className="p-6">
          {data.recentActivity.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No recent activity yet.
            </div>
          ) : (
            <div className="space-y-4">
              {data.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0"
                >
                  <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="text-orange-600" size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900">{activity.action}</p>
                    <p className="text-gray-600">
                      {activity.name} •{" "}
                      {activity.company ||
                        activity.location ||
                        "No details"}
                    </p>
                  </div>

                  <span className="text-gray-500 text-sm flex-shrink-0">
                    {new Date(activity.time).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Reusable Stat Card */
function StatCard({
  icon,
  bg,
  value,
  label,
}: {
  icon: React.ReactNode;
  bg: string;
  value: any;
  label: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <h3 className="text-gray-900 mb-1">{value ?? "-"}</h3>
      <p className="text-gray-600">{label}</p>
    </div>
  );
}