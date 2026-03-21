import { useState, useEffect } from "react";
import { Clock, MapPin, CheckCircle, LogOut, Calendar } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AttendanceScreen() {
  const { user, token } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendance, setAttendance] = useState<any[]>([]);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [location, setLocation] = useState({ lat: 0, lng: 0 });
  const [locationName, setLocationName] = useState("Fetching location...");
  const [loading, setLoading] = useState(false);

  const fetchAttendance = async () => {
    try {
      const res = await fetch("/api/attendance", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Sort by date descending to show latest first
        const sortedData = data.sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setAttendance(sortedData);
        const today = new Date().toISOString().split("T")[0];
        setTodayRecord(sortedData.find((a: any) => a.date === today));
      }
    } catch (err) {
      console.error("Failed to fetch attendance", err);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchAttendance();

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
                await fetchAttendance();
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
                await fetchAttendance();
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h1 className="text-gray-900 mb-2">Attendance</h1>
        <p className="text-gray-600">Mark your attendance for today</p>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={20} />
          <span className="text-orange-100">{formatDate(currentTime)}</span>
        </div>
        <div className="text-5xl mb-2">
          {new Date().toLocaleTimeString("en-IN")}
        </div>
        <div className="flex items-center gap-2 text-orange-100">
          <MapPin size={16} />
          <span>{locationName}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-900">Today's Status</h2>
          <div
            className={`px-4 py-2 rounded-xl ${
              todayRecord
                ? "bg-green-50 text-green-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {todayRecord ? "Present" : "Not Marked"}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <Clock size={18} />
              <span>Punch In</span>
            </div>
            <p className="text-gray-900">
              {todayRecord?.checkInTime
                ? formatTime(todayRecord.checkInTime)
                : "--:--:--"}
            </p>
          </div>

          <div className="bg-orange-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-orange-700 mb-2">
              <LogOut size={18} />
              <span>Punch Out</span>
            </div>
            <p className="text-gray-900">
              {todayRecord?.checkOutTime
                ? formatTime(todayRecord.checkOutTime)
                : "--:--:--"}
            </p>
          </div>

          <div className="bg-green-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-700 mb-2">
              <CheckCircle size={18} />
              <span>Working Hours</span>
            </div>
            <p className="text-gray-900">{calculateWorkingHours()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-gray-900 mb-4">Mark Attendance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handlePunchIn}
            disabled={!!todayRecord || loading}
            className="py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            {todayRecord ? "Already Punched In" : "Punch In"}
          </button>

          <button
            onClick={handlePunchOut}
            disabled={!todayRecord || !!todayRecord.checkOutTime || loading}
            className="py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <LogOut size={20} />
            {todayRecord?.checkOutTime ? "Already Punched Out" : "Punch Out"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-gray-900">Attendance History</h2>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {attendance.slice(0, 5).map((record: any) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
              >
                <div>
                  <p className="text-gray-900">
                    {new Date(record.date).toLocaleDateString("en-IN", {
                      weekday: "long",
                    })}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {formatTime(record.checkInTime)} -{" "}
                    {record.checkOutTime
                      ? formatTime(record.checkOutTime)
                      : "Ongoing"}
                  </p>
                </div>
                <div className="px-3 py-1 rounded-lg text-sm bg-green-100 text-green-700">
                  Present
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
