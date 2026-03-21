import { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Company {
  id: string | number;
  title: string;
  logoUrl?: string;
  website?: string;
}

interface AddLeadModalProps {
  company?: Company | null;
  companies?: Company[];
  onClose: () => void;
}

export default function AddLeadModal({ company, companies = [], onClose }: AddLeadModalProps) {
  const { token } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState<string | null>(company?.title || (companies[0]?.title ?? null));
  const [formData, setFormData] = useState({
    loanAmount: '',
    firstName: '',
    lastName: '',
    gender: '',
    mobile: '',
    pincode: '',
    pan: '',
    employmentType: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!selectedCompany) {
      alert('Please select a company');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        customerName: `${formData.firstName} ${formData.lastName}`,
        phone: formData.mobile,
        company: selectedCompany,
        loanAmount: Number(String(formData.loanAmount).replace(/,/g, "")) || 0,
        status: "New",
        notes: `PAN: ${formData.pan}, Pincode: ${formData.pincode}, Employment: ${formData.employmentType}, Gender: ${formData.gender}`
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to create lead' }));
        alert(err.message || "Failed to create lead");
        return;
      }

      setIsSubmitted(true);
      // small delay so user sees success
      setTimeout(() => onClose(), 1200);
    } catch (error) {
      console.error("Lead submit error:", error);
      alert("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {!isSubmitted ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center text-2xl overflow-hidden">
                    {company?.logoUrl ? (
                      <img src={company.logoUrl} alt={company.title || selectedCompany || 'company'} className="w-full h-full object-cover" />
                    ) : (
                      (selectedCompany ? selectedCompany.charAt(0) : '🏦')
                    )}
                  </div>
                  <div>
                    <h2 className="text-gray-900">Add Lead</h2>
                    <p className="text-gray-600">{selectedCompany || company?.title || 'Select Company'}</p>
                  </div>
                </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {!company && (
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Company <span className="text-red-500">*</span></label>
                  {companies.length > 0 ? (
                    <select
                      value={selectedCompany || ''}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    >
                      <option value="">Select a company</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.title}>{c.title}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={selectedCompany || ''}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      placeholder="Company name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="loanAmount" className="block text-gray-700 mb-2">
                    Loan Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="loanAmount"
                    name="loanAmount"
                    type="text"
                    value={formData.loanAmount}
                    onChange={handleChange}
                    placeholder="₹ 5,00,000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="firstName" className="block text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Enter first name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Enter last name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="gender" className="block text-gray-700 mb-2">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="mobile" className="block text-gray-700 mb-2">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="mobile"
                    name="mobile"
                    type="tel"
                    value={formData.mobile}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="pincode" className="block text-gray-700 mb-2">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="pincode"
                    name="pincode"
                    type="text"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="400001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="pan" className="block text-gray-700 mb-2">
                    PAN Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="pan"
                    name="pan"
                    type="text"
                    value={formData.pan}
                    onChange={handleChange}
                    placeholder="ABCDE1234F"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="employmentType" className="block text-gray-700 mb-2">
                    Employment Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="employmentType"
                    name="employmentType"
                    value={formData.employmentType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select employment type</option>
                    <option value="salaried">Salaried</option>
                    <option value="self-employed">Self-employed</option>
                    <option value="business">Business Owner</option>
                    <option value="professional">Professional</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors"
                >
                  Submit Lead
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-500" size={40} />
            </div>
            <h2 className="text-gray-900 mb-2">Lead Added Successfully!</h2>
            <p className="text-gray-600">
              Lead has been submitted to {selectedCompany || company?.title}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
