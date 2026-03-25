import { useState } from 'react';
import { Calculator, IndianRupee, Percent, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function EmiCalculatorScreen() {
  const [principal, setPrincipal] = useState<number>(100000);
  const [rate, setRate] = useState<number>(10.5);
  const [years, setYears] = useState<number>(5);

  // EMI Calculation Formula
  // EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
  const calculateEMI = () => {
    const r = rate / 12 / 100; // monthly rate
    const n = years * 12; // tenure in months

    if (r === 0) return principal / n;
    
    const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return emi;
  };

  const emi = calculateEMI();
  const totalPayment = emi * years * 12;
  const totalInterest = totalPayment - principal;

  const chartData = [
    { name: 'Principal Amount', value: principal },
    { name: 'Total Interest', value: totalInterest > 0 ? totalInterest : 0 },
  ];

  const COLORS = ['#f97316', '#fdba74']; // orange-500, orange-300

  // format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
          <Calculator size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-1">EMI Calculator</h1>
          <p className="text-orange-100">Calculate your monthly loan installments instantly.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Inputs */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-8">
          
          {/* Principal Amount */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-gray-700 font-medium flex items-center gap-2">
                <IndianRupee size={18} className="text-orange-500" />
                Loan Amount
              </label>
              <div className="px-4 py-2 bg-orange-50 text-orange-700 font-bold rounded-xl border border-orange-100">
                {formatCurrency(principal)}
              </div>
            </div>
            <input 
              type="range" 
              min="10000" 
              max="5000000" 
              step="10000"
              value={principal} 
              onChange={(e) => setPrincipal(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-xs text-gray-400 font-medium">
              <span>₹10,000</span>
              <span>₹50L</span>
            </div>
          </div>

          {/* Interest Rate */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-gray-700 font-medium flex items-center gap-2">
                <Percent size={18} className="text-orange-500" />
                Interest Rate (p.a.)
              </label>
              <div className="px-4 py-2 bg-orange-50 text-orange-700 font-bold rounded-xl border border-orange-100">
                {rate}%
              </div>
            </div>
            <input 
              type="range" 
              min="1" 
              max="30" 
              step="0.1"
              value={rate} 
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-xs text-gray-400 font-medium">
              <span>1%</span>
              <span>30%</span>
            </div>
          </div>

          {/* Tenure */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-gray-700 font-medium flex items-center gap-2">
                <Clock size={18} className="text-orange-500" />
                Loan Tenure
              </label>
              <div className="px-4 py-2 bg-orange-50 text-orange-700 font-bold rounded-xl border border-orange-100">
                {years} Yr{years > 1 ? 's' : ''} ({years * 12} Mos)
              </div>
            </div>
            <input 
              type="range" 
              min="1" 
              max="30" 
              step="1"
              value={years} 
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-xs text-gray-400 font-medium">
              <span>1 Yr</span>
              <span>30 Yrs</span>
            </div>
          </div>

        </div>

        {/* Right Side: Results */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="col-span-2 text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl border border-orange-200/50">
              <p className="text-sm font-medium text-orange-800/70 mb-1">Monthly EMI</p>
              <h3 className="text-4xl font-extrabold text-orange-600 tracking-tight">{formatCurrency(emi)}</h3>
            </div>
            
            <div className="p-5 border border-gray-100 rounded-2xl bg-gray-50/50 flex flex-col items-center justify-center text-center">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Principal</p>
              <h4 className="text-lg font-bold text-gray-900">{formatCurrency(principal)}</h4>
            </div>

            <div className="p-5 border border-gray-100 rounded-2xl bg-gray-50/50 flex flex-col items-center justify-center text-center">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Interest</p>
              <h4 className="text-lg font-bold text-gray-900">{formatCurrency(totalInterest)}</h4>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full mt-auto relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label for total amount */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8 text-center">
              <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Total</span>
              <span className="text-gray-900 font-bold text-lg">{formatCurrency(totalPayment)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
