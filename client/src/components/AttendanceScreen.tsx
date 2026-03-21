import { useState, useEffect } from "react";
import { Clock, MapPin, CheckCircle, LogOut, Calendar, Download, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AttendanceScreen() {
  const { user, token } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendance, setAttendance] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [location, setLocation] = useState({ lat: 0, lng: 0 });
  const [locationName, setLocationName] = useState("Fetching location...");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = async () => {
    try {
      const [attRes, usersRes] = await Promise.all([
        fetch("/api/attendance", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (usersRes.ok) {
        setUsers(await usersRes.json());
      }
      if (attRes.ok) {
        const data = await attRes.json();
        const sortedData = data.sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setAttendance(sortedData);
        const today = new Date().toISOString().split("T")[0];
        setTodayRecord(sortedData.find((a: any) => a.date === today && a.userId === user?.id));
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    if (token) fetchData();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationName(
            `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
          );
        },
        () => setLocationName("Location unavailable"),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
      );
    }

    return () => clearInterval(timer);
  }, [token]);

  const handlePunchIn = async () => {
    setLoading(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = String(position.coords.latitude);
            const lng = String(position.coords.longitude);
            try {
              const res = await fetch("/api/attendance/checkin", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ lat, lng }),
              });
              if (res.ok) {
                setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                await fetchData();
              } else {
                const err = await res.json().catch(() => ({ message: 'Punch in failed' }));
                alert(err.message || 'Punch in failed');
              }
            } catch (err) {
              console.error('Punch in failed', err);
              alert('Punch in failed');
            }
          },
          (error) => {
            console.error('Geolocation error', error);
            if (error.code === 1) {
              alert('Location permission denied. Please enable location access and try again.');
            } else {
              alert('Unable to retrieve location. Please try again.');
            }
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        );
      } else {
        alert('Geolocation is not supported by your browser');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePunchOut = async () => {
    setLoading(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = String(position.coords.latitude);
            const lng = String(position.coords.longitude);
            try {
              const res = await fetch("/api/attendance/checkout", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ lat, lng }),
              });
              if (res.ok) {
                setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                await fetchData();
              } else {
                const err = await res.json().catch(() => ({ message: 'Punch out failed' }));
                alert(err.message || 'Punch out failed');
              }
            } catch (err) {
              console.error('Punch out failed', err);
              alert('Punch out failed');
            }
          },
          (error) => {
            console.error('Geolocation error', error);
            if (error.code === 1) {
              alert('Location permission denied. Please enable location access and try again.');
            } else {
              alert('Unable to retrieve location. Please try again.');
            }
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        );
      } else {
        alert('Geolocation is not supported by your browser');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string | Date) => {
    return new Date(dateStr).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calculateWorkingHours = () => {
    if (todayRecord?.checkInTime && todayRecord?.checkOutTime) {
      const diff =
        new Date(todayRecord.checkOutTime).getTime() -
        new Date(todayRecord.checkInTime).getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    } else if (todayRecord?.checkInTime) {
      const diff =
        currentTime.getTime() - new Date(todayRecord.checkInTime).getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    }
    return "0h 0m";
  };

  const calculateRowHours = (record: any) => {
    if (!record.checkOutTime) return "--";
    const diff = new Date(record.checkOutTime).getTime() - new Date(record.checkInTime).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getUserDetails = (userId: number) => {
    const u = users.find((user) => user.id === userId);
    return u ? { name: u.name, role: u.role, empId: u.employeeId } : { name: "Unknown", role: "", empId: "" };
  };

  const isManager = user?.role !== 'EMPLOYEE';

  const filterByDateRange = (record: any) => {
    let matchesDate = true;
    try {
      if (startDate || endDate) {
        const d = new Date(record.date);
        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          if (d < s) matchesDate = false;
        }
        if (endDate && matchesDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          if (d > e) matchesDate = false;
        }
      }
    } catch { matchesDate = true; }
    return matchesDate;
  };

  const filteredTeamAttendance = attendance.filter((a) => {
    let matches = true;
    if (searchTerm) {
      const u = getUserDetails(a.userId);
      const search = searchTerm.toLowerCase();
      if (!u.name.toLowerCase().includes(search) && !(u.empId || '').toLowerCase().includes(search)) {
        matches = false;
      }
    }
    return matches && filterByDateRange(a);
  });

  const myAttendance = attendance.filter(a => a.userId === user?.id && filterByDateRange(a));

  const handleExport = () => {
    const exportData = isManager ? filteredTeamAttendance : myAttendance;
    const rows = [
      ["Employee Name", "Role", "Date", "Punch In", "Punch Out", "Total Hours"]
    ];
    exportData.forEach((record) => {
      const u = getUserDetails(record.userId);
      rows.push([
        isManager ? `"${u.name}"` : `"${user?.name}"`,
        isManager ? u.role : user?.role || "",
        new Date(record.date).toLocaleDateString("en-IN"),
        formatTime(record.checkInTime),
        record.checkOutTime ? formatTime(record.checkOutTime) : "Ongoing",
        calculateRowHours(record)
      ]);
    });
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-gray-900 mb-2 font-bold text-2xl">Attendance</h1>
          <p className="text-gray-600">Mark and track attendance logs</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            title="Start Date"
          />
          <span className="text-gray-500 text-sm">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            title="End Date"
          />
          <button onClick={handleExport} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl transition-colors flex items-center gap-2 h-[38px] w-full md:w-auto justify-center">
            <Download size={20} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: My daily interaction panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-8 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={20} />
              <span className="text-orange-100">{formatDate(currentTime)}</span>
            </div>
            <div className="text-5xl font-bold mb-2">
              {new Date().toLocaleTimeString("en-IN")}
            </div>
            <div className="flex items-center gap-2 text-orange-100 mt-4">
              <MapPin size={16} />
              <span className="text-sm truncate">{locationName}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-gray-900 mb-4 font-semibold">Mark Attendance</h3>
            <div className="flex flex-col gap-3">
              <button
                onClick={handlePunchIn}
                disabled={!!todayRecord || loading}
                className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                <CheckCircle size={20} />
                {todayRecord ? "Already Punched In" : "Punch In"}
              </button>

              <button
                onClick={handlePunchOut}
                disabled={!todayRecord || !!todayRecord.checkOutTime || loading}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                <LogOut size={20} />
                {todayRecord?.checkOutTime ? "Already Punched Out" : "Punch Out"}
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-4">
            <div className="flex justify-between items-center text-sm border-b pb-2">
              <span className="text-gray-500">My Hours Today</span>
              <span className="font-bold text-gray-900">{calculateWorkingHours()}</span>
            </div>
             <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">My Status</span>
              <span className={`px-2 py-1 rounded text-xs font-bold ${todayRecord ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {todayRecord ? "PRESENT" : "PENDING"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Attendance Logs */}
        <div className="lg:col-span-2 space-y-6">
          {isManager ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-gray-900 font-semibold mb-4">Team Attendance Logs</h2>
                <div className="flex items-center gap-3">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search employee..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Punch In</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Punch Out</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTeamAttendance.slice(0, 50).map((record) => {
                      const u = getUserDetails(record.userId);
                      return (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-900">{u.name}</p>
                            <p className="text-xs text-gray-500">{u.role}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(record.date).toLocaleDateString("en-IN")}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {formatTime(record.checkInTime)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {record.checkOutTime ? formatTime(record.checkOutTime) : <span className="text-orange-500 text-xs font-semibold px-2 py-1 bg-orange-50 rounded">Ongoing</span>}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {calculateRowHours(record)}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredTeamAttendance.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                          No attendance records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
             <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-gray-900 font-semibold">My Attendance History</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {myAttendance.slice(0, 10).map((record: any) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                    >
                      <div>
                        <p className="text-gray-900 font-medium">
                          {new Date(record.date).toLocaleDateString("en-IN", {
                            weekday: "long",
                            year: "numeric", 
                            month: "short", 
                            day: "numeric"
                          })}
                        </p>
                        <p className="text-gray-600 text-sm mt-1">
                          {formatTime(record.checkInTime)} -{" "}
                          {record.checkOutTime
                            ? formatTime(record.checkOutTime)
                            : <span className="text-orange-500 font-medium">Ongoing</span>}
                        </p>
                      </div>
                      <div className="text-right">
                         <div className="px-3 py-1 rounded-lg text-sm bg-green-100 text-green-700 font-bold mb-1 ml-auto w-fit">
                          Present
                        </div>
                        <p className="text-xs font-semibold text-gray-500">
                          {calculateRowHours(record)} hrs
                        </p>
                      </div>
                    </div>
                  ))}
                  {myAttendance.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">No attendance history found for this range.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
