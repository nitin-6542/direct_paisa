import { useState, useEffect, useRef } from "react";
import { MapPin, Users, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icons in Leaflet + React
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIconRetina from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function LiveLocationScreen() {
  const { token, user } = useAuth();
  const [teamLocations, setTeamLocations] = useState<any[]>([]);
  const [locationNames, setLocationNames] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<'granted'|'prompt'|'denied'|'unknown'>('unknown');
  const watchIdRef = useRef<number | null>(null);
  const sendingRef = useRef(false);
  const mapRef = useRef<L.Map | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | number | null>(null);
  const ONLINE_THRESHOLD_MINUTES = 5; // consider online if last update within this many minutes
  const [canTrack, setCanTrack] = useState(false);

  useEffect(() => {
    if (!token) return;
    async function checkAttendance() {
      try {
        const res = await fetch("/api/attendance", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
           const atts = await res.json();
           const today = new Date().toISOString().split("T")[0];
           const todayAtt = atts.find((a: any) => a.userId === user?.id && a.date === today);
           if (todayAtt && !todayAtt.checkOutTime) {
             setCanTrack(true);
           } else {
             setCanTrack(false);
           }
        }
      } catch (e) {}
    }
    checkAttendance();
    const interval = setInterval(checkAttendance, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [token, user]);

  function isMemberOnline(member: any) {
    if (!member || !member.timestamp) return false;
    try {
      const ts = new Date(member.timestamp).getTime();
      const ageMs = Date.now() - ts;
      return ageMs <= ONLINE_THRESHOLD_MINUTES * 60 * 1000;
    } catch (e) {
      return false;
    }
  }

  useEffect(() => {
    const fetchLocations = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/location/team", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTeamLocations(data || []);
        } else {
          console.error("Failed to fetch locations", res.statusText);
        }
      } catch (err) {
        console.error("Failed to fetch locations", err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === "MD" || user?.role === "TL" || user?.role === "AM") {
      fetchLocations();
      const interval = setInterval(fetchLocations, 10000);
      return () => clearInterval(interval);
    }
  }, [token, user]);

  // Geolocation: permission handling + watchPosition for continuous updates.
  useEffect(() => {
    if (!token) return;

    // Check permission status where supported
    let permCheck: any = null;
    if (navigator.permissions && (navigator.permissions as any).query) {
      try {
        permCheck = (navigator.permissions as any).query({ name: 'geolocation' });
        permCheck.then((p: any) => setPermission(p.state)).catch(() => setPermission('unknown'));
      } catch (e) {
        setPermission('unknown');
      }
    }

    const sendLocationToServer = async (lat: number, lng: number) => {
      if (sendingRef.current) return; // prevent duplicate sends
      sendingRef.current = true;
      try {
        await fetch('/api/location/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ lat: String(lat), lng: String(lng) }),
        });
      } catch (err) {
        console.error('Failed to update own location', err);
      } finally {
        // allow next send after short delay
        setTimeout(() => { sendingRef.current = false; }, 2000);
      }
    };

    if (canTrack && navigator.geolocation) {
      // start watchPosition
      const id = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          // reverse geocode own location and cache
          try {
            const key = `own-${user?.id || 'me'}`;
            const name = await reverseGeocode(lat, lng);
            setLocationNames((prev) => ({ ...prev, [key]: name }));
          } catch (e) {
            // ignore reverse geocode errors
          }
          await sendLocationToServer(lat, lng);
        },
        (err) => {
          console.error('Geolocation watch error', err);
          if (err.code === err.PERMISSION_DENIED) setPermission('denied');
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 },
      );
      watchIdRef.current = id as unknown as number;
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current as any);
      }
      if (permCheck && permCheck.cancel) permCheck.cancel();
    };
  }, [token, user, canTrack]);

  // Reverse geocode helper (uses Nominatim OpenStreetMap)
  async function reverseGeocode(lat: number, lon: number) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      if (!res.ok) return '';
      const data = await res.json();
      const parts: string[] = [];
      if (data.address) {
        if (data.address.city) parts.push(data.address.city);
        else if (data.address.town) parts.push(data.address.town);
        else if (data.address.village) parts.push(data.address.village);
        if (data.address.state) parts.push(data.address.state);
        if (data.address.country) parts.push(data.address.country);
      }
      return parts.join(', ');
    } catch (e) {
      return '';
    }
  }

  if (user?.role === "EMPLOYEE") {
    return (
      <div className="max-w-4xl mx-auto">
        {canTrack ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
            <p className="text-blue-700 font-medium">Location Tracking Active</p>
            <p className="text-blue-600 text-sm mt-1">
              Your live location is being shared with your manager for attendance
              verification.
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-gray-700 font-medium">Location Tracking Disabled</p>
            <p className="text-gray-500 text-sm mt-1">
              Live location tracking is disabled outside of active shift hours.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Role-based visibility
  const visibleMembers = teamLocations.filter((member) => {
    // basic structure: member.role and member.active expected from API
    if (!member) return false;
  // only show members that are currently active (online)
  if (!isMemberOnline(member) && member.userId !== user?.id) return false;
    // filter by role visibility
    if (user?.role === 'MD') return true; // MD can see everyone
    if (user?.role === 'TL') {
      // TL sees team members — assume API includes teamId or managerId; if not, fall back to same team via managerId
      if (member.managerId && user?.id && member.managerId === user.id) return true;
      // also show employees directly under TL
      if (member.role === 'EMPLOYEE') return true;
      return false;
    }
    if (user?.role === 'AM') {
      // AM can see TL and EMPLOYEE
      return member.role === 'TL' || member.role === 'EMPLOYEE';
    }
    // default: no access
    return false;
  });

  const filteredTeam = visibleMembers.filter((member) =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // fetch readable names for members (reverse geocode) but don't spam the service
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (let i = 0; i < Math.min(20, filteredTeam.length); i++) {
        const m = filteredTeam[i];
        const key = String(m.userId);
        if (!locationNames[key] && m.lat && m.lng) {
          try {
            const name = await reverseGeocode(parseFloat(m.lat), parseFloat(m.lng));
            if (cancelled) return;
            if (name) setLocationNames((prev) => ({ ...prev, [key]: name }));
          } catch (e) {
            // ignore
          }
          // small delay between calls
          await new Promise((r) => setTimeout(r, 150));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [filteredTeam]);

  // map interaction: center map and open a popup when a member is selected
  function handleSelectMember(member: any) {
    try {
      const lat = parseFloat(member.lat);
      const lng = parseFloat(member.lng);
      setSelectedMemberId(member.userId);
      if (mapRef.current && !isNaN(lat) && !isNaN(lng)) {
        mapRef.current.setView([lat, lng], 13);
        const content = `<div><strong>${member.name}</strong><div>${(locationNames[String(member.userId)] || (lat.toFixed(4) + ', ' + lng.toFixed(4)))}</div></div>`;
        // open a Leaflet popup at the selected location
        L.popup({ maxWidth: 300 }).setLatLng([lat, lng]).setContent(content).openOn(mapRef.current);
      }
    } catch (e) {
      console.error('Failed to center map on member', e);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 mb-2 font-bold">
              Live Location Tracking
            </h1>
            <p className="text-gray-600">
              Real-time tracking of team members on duty
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-xl border border-orange-100 flex items-center gap-2">
              <Users size={20} />
              <span className="font-medium">
                {teamLocations.filter((m) => {
                  if (!m || !m.timestamp) return false;
                  const ts = new Date(m.timestamp).getTime();
                  const ageMs = Date.now() - ts;
                  return ageMs <= ONLINE_THRESHOLD_MINUTES * 60 * 1000;
                }).length} Online
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search team member..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="text-center py-6">Loading...</div>
            ) : filteredTeam.map((member) => (
              <div
                key={member.userId}
                onClick={() => handleSelectMember(member)}
                className={`p-3 bg-gray-50 rounded-xl border transition-colors cursor-pointer group ${selectedMemberId === member.userId ? 'border-orange-300 ring-2 ring-orange-100' : 'border-gray-100 hover:border-orange-200'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center font-bold">
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 text-sm font-medium">
                      {member.name}
                    </p>
                    <div className="flex items-center gap-2 text-gray-500 text-xs mt-0.5">
                      <MapPin size={12} />
                      <span className="truncate">{(isMemberOnline(member) || member.userId === user?.id) ? (locationNames[String(member.userId)] || 'Active Now') : 'Inactive'}</span>
                      <span className="mx-1">•</span>
                      <span className="text-xxs text-gray-400">{new Date(member.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${(isMemberOnline(member) || member.userId === user?.id) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                </div>
              </div>
            ))}
            {filteredTeam.length === 0 && (
              <div className="text-center py-10">
                <p className="text-gray-500 text-sm">No active members found</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative min-h-[400px]">
          <MapContainer
            ref={mapRef as any}
            center={[20.5937, 78.9629]}
            zoom={5}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {filteredTeam.map((member) => (
              <Marker
                key={member.userId}
                position={[parseFloat(member.lat), parseFloat(member.lng)]}
              >
                <Popup>
                  <div className="font-bold">{member.name}</div>
                  <div className="text-xs text-gray-500">
                    {locationNames[String(member.userId)]
                      ? <div className="text-sm">{locationNames[String(member.userId)]}</div>
                      : <div>{parseFloat(member.lat).toFixed(4)}, {parseFloat(member.lng).toFixed(4)}</div>
                    }
                    <div className="text-xs text-gray-500">Last updated: {new Date(member.timestamp).toLocaleTimeString()}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
