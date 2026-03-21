import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

export type UserRole = "MD" | "AM" | "TL" | "EMPLOYEE";

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  employeeId?: string;
  region?: string;
  areaManagerId?: number;
  teamLeaderId?: number;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          // try to send one-off location update when a user session is restored
          if (navigator.geolocation) {
            try {
              navigator.geolocation.getCurrentPosition(
                async (pos) => {
                  try {
                    await fetch('/api/location/update', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) }),
                    });
                  } catch (e) {
                    // ignore send errors
                  }
                },
                () => {},
                { enableHighAccuracy: false, maximumAge: 60 * 1000, timeout: 5000 },
              );
            } catch (e) {
              // ignore permission APIs
            }
          }
        } else {
          localStorage.removeItem("token");
          setToken(null);
        }
      } catch (err) {
        console.error("Auth check failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.token);
        setToken(data.token);
        setUser(data.user);
        // on successful login, request location permission and send one immediate location update
        if (navigator.geolocation) {
          try {
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                try {
                  await fetch('/api/location/update', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${data.token}`,
                    },
                    body: JSON.stringify({ lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) }),
                  });
                } catch (e) {
                  // ignore errors
                }
              },
              () => {},
              { enableHighAccuracy: false, maximumAge: 60 * 1000, timeout: 5000 },
            );
          } catch (e) {
            // ignore
          }
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error("Login failed", err);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : null));
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, updateUser, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
