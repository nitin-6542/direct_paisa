import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Edit, Save, X } from "lucide-react";

export default function AboutUsScreen() {
    const { user, token } = useAuth();
    const [content, setContent] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState("");
    const [loading, setLoading] = useState(true);

    const isAdmin = user?.role === "MD";

    const fetchAboutUs = async () => {
        try {
            const res = await fetch("/api/about-us");
            if (res.ok) {
                const data = await res.json();
                if (data && data.content) {
                    setContent(data.content);
                } else {
                    setContent("Welcome to Direct Paisa! We are committed to providing the best financial services to our customers.");
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAboutUs();
    }, []);

    const handleSave = async () => {
        try {
            const res = await fetch("/api/about-us", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ content: editContent })
            });
            if (res.ok) {
                const data = await res.json();
                setContent(data.content);
                setIsEditing(false);
            } else {
                alert("Failed to save changes");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const startEditing = () => {
        setEditContent(content);
        setIsEditing(true);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 relative">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                    <div>
                        <h1 className="text-gray-900 mb-2 text-3xl font-bold">About Us</h1>
                        <p className="text-gray-600">Learn more about Direct Paisa</p>
                    </div>
                    {isAdmin && !isEditing && (
                        <button
                            onClick={startEditing}
                            className="bg-orange-100 text-orange-600 hover:bg-orange-200 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium"
                        >
                            <Edit size={18} />
                            Edit Content
                        </button>
                    )}
                </div>

                {isEditing ? (
                    <div className="space-y-4">
                        <textarea
                            className="w-full h-64 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            placeholder="Write about your company here..."
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-6 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <X size={18} />
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors flex items-center gap-2"
                            >
                                <Save size={18} />
                                Save Changes
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="prose prose-orange max-w-none">
                        {content.split('\n').map((line, i) => (
                            <p key={i} className="text-gray-700 leading-relaxed min-h-[1.5rem]">{line}</p>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
