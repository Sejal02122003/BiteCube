import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We will call quickCommerceAPI here in the future
    // For now, simulate an API call to our new backend route
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('admin_accessToken');
        const response = await fetch('http://localhost:5000/api/v1/quick-commerce/admin/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error("Error fetching QC dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-neutral-800">Quick Commerce Dashboard</h1>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9C27B0]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Orders" value={stats?.totalOrders || 0} color="bg-blue-500" />
          <StatCard title="Active Stores" value={stats?.activeStores || 0} color="bg-green-500" />
          <StatCard title="Total Revenue" value={`$${stats?.totalRevenue || 0}`} color="bg-purple-500" />
          <StatCard title="Pending Deliveries" value={stats?.pendingDeliveries || 0} color="bg-orange-500" />
        </div>
      )}
      
      <div className="mt-12 bg-white p-8 rounded-xl shadow-sm border border-neutral-200">
        <h2 className="text-xl font-bold mb-4 text-neutral-700">Recent Activity</h2>
        <p className="text-neutral-500">Welcome to the new Quick Commerce module. This section is strictly isolated from Food Delivery.</p>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
      <div className={`h-2 w-full ${color}`}></div>
      <div className="p-6">
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">{title}</h3>
        <p className="text-3xl font-bold text-neutral-900 mt-2">{value}</p>
      </div>
    </div>
  );
}
