import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import AddLeadModal from './AddLeadModal';
import ConfirmationModal from './ui/ConfirmationModal';

interface Company {
  id: string;
  name: string;
  logo: string;
  eligibility: string;
  category: string;
  website?: string;
}

import { useAuth } from '../context/AuthContext';

export default function CompanyDashboard() {
  const { user, token } = useAuth();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [productFilters, setProductFilters] = useState<string[]>([]);
  const [productOptions, setProductOptions] = useState<Array<{key:string,label:string}>>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProductLabel, setNewProductLabel] = useState('');

  // Admin Add/Edit Company Modal
  const [showManageModal, setShowManageModal] = useState(false);
  const [managingCompany, setManagingCompany] = useState<any>(null);
  const [companyForm, setCompanyForm] = useState({ title: '', logoUrl: '', website: '', infoText: '', loanTypes: [] as string[], loanSupport: '' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/companies', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setCompanies(await res.json());
    } catch (err) { }
  };

  useState(() => {
    if (token) fetchCompanies();
  });

  // load product options from localStorage (persisted by admin through Add Product)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('companyProductOptions');
      if (raw) {
        setProductOptions(JSON.parse(raw));
      } else {
        const defaults = [
          { key: 'personal', label: 'Personal Loan' },
          { key: 'business', label: 'Business Loan' },
          { key: 'car', label: 'Car Loan' },
          { key: 'home', label: 'Home Loan' },
          { key: 'credit_card', label: 'Credit Card' },
        ];
        setProductOptions(defaults);
        localStorage.setItem('companyProductOptions', JSON.stringify(defaults));
      }
    } catch (e) {
      // ignore
      setProductOptions([
        { key: 'personal', label: 'Personal Loan' },
        { key: 'business', label: 'Business Loan' },
        { key: 'car', label: 'Car Loan' },
        { key: 'home', label: 'Home Loan' },
        { key: 'credit_card', label: 'Credit Card' },
      ]);
    }
  }, []);

  const filteredCompanies = companies.filter(company => {
    const q = searchTerm.trim().toLowerCase();
    if (q && !company.title.toLowerCase().includes(q)) return false;

    // product filters (OR): if any product selected, company must support at least one
    if (productFilters.length > 0) {
      const companyTypes = String(company.loanTypes || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      const hasAny = productFilters.some((p) => companyTypes.includes(p));
      if (!hasAny) return false;
    }

    return true;
  });

  const handleAddLead = (company: any) => {
    setSelectedCompany(company);
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setSelectedCompany(null);
    setIsModalOpen(true);
  };

  const openManageModal = (company?: any) => {
    if (company) {
      setManagingCompany(company);
        setCompanyForm({
          title: company.title,
          logoUrl: company.logoUrl || '',
          website: company.website || '',
          infoText: company.infoText || '',
          loanTypes: company.loanTypes ? String(company.loanTypes).split(',').map((s: string) => s.trim()) : [],
          loanSupport: company.loanSupport || '',
        });
      setLogoPreview(company.logoUrl || null);
      setLogoFile(null);
    } else {
    setManagingCompany(null);
  setCompanyForm({ title: '', logoUrl: '', website: '', infoText: '', loanTypes: [], loanSupport: '' });
      setLogoPreview(null);
      setLogoFile(null);
    }
    setShowManageModal(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      let logoUrlToSend = companyForm.logoUrl;
      // If user selected a file and it's not already uploaded, upload it
      if (logoFile && !logoPreview?.startsWith('http')) {
        setUploadingLogo(true);
        const fd = new FormData();
        fd.append('file', logoFile);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          logoUrlToSend = data.url;
        } else {
          alert('Logo upload failed');
          setUploadingLogo(false);
          return;
        }
        setUploadingLogo(false);
      }

  const payload = { title: companyForm.title, logoUrl: logoUrlToSend, website: companyForm.website, infoText: companyForm.infoText, loanTypes: (companyForm.loanTypes || []).join(','), loanSupport: companyForm.loanSupport || '' };
      const url = managingCompany ? `/api/companies/${managingCompany.id}` : '/api/companies';
      const method = managingCompany ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowManageModal(false);
        setLogoFile(null);
        setLogoPreview(null);
        fetchCompanies();
      } else {
        let body = null;
        try { body = await res.json(); } catch (e) { body = { status: res.status }; }
        console.error('Save company error', body);
        alert('Failed to save company: ' + JSON.stringify(body));
      }
    } catch (err) {
      console.error(err);
    }
    finally {
      setIsSaving(false);
    }
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteCompany = async () => {
    if (!managingCompany) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/companies/${managingCompany.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) {
        setShowManageModal(false);
        setConfirmOpen(false);
        fetchCompanies();
      } else {
        alert('Failed to delete company');
      }
    } catch (err) {
      console.error('Delete company failed', err);
      alert('Failed to delete company');
    } finally {
      setDeleting(false);
    }
  };

  const addProductOption = (label: string) => {
    const key = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    if (!key) return alert('Enter a valid product name');
    if (productOptions.find((p) => p.key === key || p.label.toLowerCase() === label.trim().toLowerCase())) {
      alert('Product already exists');
      return;
    }
    const next = [...productOptions, { key, label: label.trim() }];
    setProductOptions(next);
    try { localStorage.setItem('companyProductOptions', JSON.stringify(next)); } catch (e) { /* ignore */ }
    setShowAddProduct(false);
    setNewProductLabel('');
  };

  const deleteProductOption = (key: string) => {
    // guard: ensure only MD can perform deletion (extra protection beyond hiding the button)
    if (user?.role !== 'MD') {
      alert('Unauthorized: only MD can delete product options');
      return;
    }
    if (!confirm('Delete this product option? This will remove it from the product list.')) return;
    const next = productOptions.filter((p) => p.key !== key);
    setProductOptions(next);
    try { localStorage.setItem('companyProductOptions', JSON.stringify(next)); } catch (e) { /* ignore */ }
    // remove from active filters if present
    if (productFilters.includes(key)) {
      setProductFilters(productFilters.filter((p) => p !== key));
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 mb-2">Lender Partners</h1>
            <p className="text-gray-600">Choose a lender to add a new lead</p>
          </div>
          <div className="flex gap-2">
            {user?.role === 'MD' && (
              <button onClick={() => openManageModal()} className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-xl transition-colors flex items-center gap-2">
                <Plus size={18} />
                Add Company
              </button>
            )}
            <button onClick={handleOpenCreate} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-xl transition-colors flex items-center gap-2">
              <Plus size={18} />
              Add Lead
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search lenders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
            <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddProduct(true)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50"
            >
              + Add Product
            </button>

            <div className="hidden md:flex items-center gap-2 max-h-40 overflow-auto">
              {productOptions.map((opt) => (
                <div key={opt.key} className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm ${productFilters.includes(opt.key) ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100'}`}>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productFilters.includes(opt.key)}
                      onChange={(e) => {
                        const cur = new Set(productFilters);
                        if (e.target.checked) cur.add(opt.key);
                        else cur.delete(opt.key);
                        setProductFilters(Array.from(cur));
                      }}
                    />
                    <span>{opt.label}</span>
                  </label>
                  {user?.role === 'MD' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteProductOption(opt.key); }}
                      className="text-red-500 ml-2 text-xs"
                      title="Delete product"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.map((company) => (
          <div
            key={company.id}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => {
              const url = company.website || null;
              if (url) {
                const href = url.startsWith('http') ? url : `https://${url}`;
                window.open(href, '_blank', 'noopener');
              }
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-20 flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center text-xl overflow-hidden">
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt={company.title} className="w-full h-full object-cover" />
                  ) : (
                    '🏢'
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="text-gray-900 mb-1 truncate">{company.title}</h3>
                    {/* website removed from tile by request; editable in Manage modal */}
                  </div>

                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    {user?.role === 'MD' && (
                      <button onClick={(e) => { e.stopPropagation(); openManageModal(company); }} className="text-blue-500 text-sm hover:underline">Edit</button>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-4">
                  {company.loanTypes && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                      {String(company.loanTypes).split(',').map((t: string) => t.trim()).filter(Boolean).map((t: string) => (
                        <span key={t} className="inline-block px-2 py-1 text-[11px] rounded bg-gray-100 text-gray-700 whitespace-nowrap">{t === 'personal' ? 'Personal' : t === 'business' ? 'Business' : t === 'car' ? 'Car' : t === 'home' ? 'Home' : t === 'credit_card' ? 'Credit Card' : t}</span>
                      ))}
                    </div>
                  )}

                  {company.infoText && (
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed break-words">{company.infoText}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Lead Modal */}
      {isModalOpen && selectedCompany && (
        <AddLeadModal
          company={selectedCompany}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedCompany(null);
          }}
        />
      )}
      {isModalOpen && !selectedCompany && (
        <AddLeadModal
          companies={companies}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedCompany(null);
          }}
        />
      )}
      {showManageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-gray-900 text-xl font-bold">{managingCompany ? 'Edit Company' : 'Add Company'}</h2>
            </div>
            <form onSubmit={handleSaveCompany} className="p-6 space-y-4">
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Company Title"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  value={companyForm.title}
                  onChange={e => setCompanyForm({ ...companyForm, title: e.target.value })}
                  required
                />

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Logo (upload or paste URL)</label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setLogoFile(f);
                          if (f) setLogoPreview(URL.createObjectURL(f));
                        }}
                      />
                      <span className="text-sm text-gray-700">Choose file</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Or paste image URL"
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      value={companyForm.logoUrl}
                      onChange={e => { setCompanyForm({ ...companyForm, logoUrl: e.target.value }); setLogoPreview(e.target.value || null); }}
                    />
                  </div>
                  {logoPreview && (
                    <div className="mt-3 w-28 h-28 rounded-xl overflow-hidden border border-gray-100">
                      <img src={logoPreview} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Website (optional) - e.g. example.com or https://example.com"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    value={companyForm.website}
                    onChange={e => setCompanyForm({ ...companyForm, website: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Custom Info / Eligibility Notes</label>
                  <textarea
                    value={companyForm.infoText}
                    onChange={(e) => setCompanyForm({ ...companyForm, infoText: e.target.value })}
                    placeholder="E.g. 'Salaried applicants with CIBIL &gt; 650 get faster approvals'"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Supported Loan Products</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-auto">
                    {productOptions.map((opt) => (
                      <label key={opt.key} className="inline-flex items-center gap-2 p-2 border border-gray-100 rounded-lg">
                        <input
                          type="checkbox"
                          checked={(companyForm.loanTypes || []).includes(opt.key)}
                          onChange={(e) => {
                            const cur = new Set(companyForm.loanTypes || []);
                            if (e.target.checked) cur.add(opt.key);
                            else cur.delete(opt.key);
                            setCompanyForm({ ...companyForm, loanTypes: Array.from(cur) });
                          }}
                        />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Select one or more loan products this lender supports.</p>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                {managingCompany && user?.role === 'MD' && (
                  <button type="button" onClick={() => setConfirmOpen(true)} className="px-4 py-3 border border-red-200 rounded-xl text-red-600 hover:bg-red-50">Delete</button>
                )}
                <div className="flex-1" />
                <button type="button" onClick={() => setShowManageModal(false)} className="px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cancel</button>
                <button type="submit" disabled={isSaving} className={`px-6 py-3 rounded-xl transition-colors font-bold ${isSaving ? 'bg-orange-300 text-white cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>
                  {isSaving ? 'Saving...' : 'Save Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmationModal
        open={confirmOpen}
        title="Delete company"
        description="This will permanently delete the company. This action cannot be undone."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDeleteCompany}
        confirmText={deleting ? 'Deleting...' : 'Delete'}
      />

      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-gray-900 text-lg font-bold">Add Loan Product</h2>
            </div>
            <div className="p-6">
              {productOptions.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-2">Existing products</div>
                  <div className="flex flex-wrap gap-2">
                    {productOptions.map((p) => (
                      <div key={p.key} className="inline-flex items-center gap-2 px-2 py-1 bg-gray-100 rounded">
                        <span className="text-sm">{p.label}</span>
                        {user?.role === 'MD' && (
                          <button onClick={() => deleteProductOption(p.key)} className="text-red-500 text-xs">Delete</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <label className="block text-sm text-gray-700 mb-2">Product name</label>
              <input
                value={newProductLabel}
                onChange={(e) => setNewProductLabel(e.target.value)}
                placeholder="e.g. Business Loan"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4"
              />
              <div className="flex gap-3">
                <button onClick={() => setShowAddProduct(false)} className="flex-1 px-4 py-2 border rounded-xl">Cancel</button>
                <button onClick={() => addProductOption(newProductLabel)} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-xl">Add Product</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
