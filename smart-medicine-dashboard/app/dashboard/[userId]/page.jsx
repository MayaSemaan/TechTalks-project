"use client";

// app/dashboard/[userId]/page.jsx
// Person D - Sprint 6: Dashboard UI with charts, filters, and doctor reports

import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart, Line, PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage({ params }) {
  const { userId } = params;
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("week");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [userId, filter]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/dashboard/${userId}?filter=${filter}`);
      if (response.data.success) {
        setData(response.data);
      } else {
        setError(response.data.error || "Failed to load data");
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
          <Button onClick={fetchDashboardData} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Prepare pie chart data
  const pieData = [
    { name: "Taken", value: parseFloat(data.compliance) },
    { name: "Missed", value: 100 - parseFloat(data.compliance) },
  ];
  const COLORS = ["#22c55e", "#ef4444"];

  // Format trend data for line chart
  const trendData = data.trendData.map(item => {
    const date = new Date(item.date);
    let label = "";
    
    if (filter === 'year') {
      label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } else {
      label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    return {
      day: label,
      taken: item.taken || 0,
      missed: item.missed || 0
    };
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">User ID: {userId}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-500 text-sm font-medium mb-1">Total Medications</p>
              <h2 className="text-3xl font-bold text-gray-900">{data.totalMeds}</h2>
              <p className="text-gray-400 text-xs mt-1">Active prescriptions</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-500 text-sm font-medium mb-1">Compliance Rate</p>
              <h2 className="text-3xl font-bold text-green-600">{data.compliance}%</h2>
              <p className="text-gray-400 text-xs mt-1">Medication adherence</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-500 text-sm font-medium mb-1">Missed Doses</p>
              <h2 className="text-3xl font-bold text-red-600">{data.missedLogs}</h2>
              <p className="text-gray-400 text-xs mt-1">Total missed</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-500 text-sm font-medium mb-1">Doctor Reports</p>
              <h2 className="text-3xl font-bold text-blue-600">{data.reportCount}</h2>
              <p className="text-gray-400 text-xs mt-1">Available reports</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-3 bg-white p-4 rounded-lg shadow-sm">
          <p className="text-gray-700 font-medium mr-2">Time Period:</p>
          {["week", "month", "year"].map((f) => (
            <Button
              key={f}
              onClick={() => setFilter(f)}
              className={`${
                filter === f 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Compliance Pie Chart */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                Compliance Overview
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie 
                    data={pieData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={100} 
                    label={(entry) =>`${entry.name}: ${entry.value.toFixed(1)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Medication Trend Line Chart */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                Medication Trend ({filter})
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="taken" 
                    stroke="#22c55e" 
                    strokeWidth={3}
                    name="Taken"
                    dot={{ fill: '#22c55e', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="missed" 
                    stroke="#ef4444" 
                    strokeWidth={3}
                    name="Missed"
                    dot={{ fill: '#ef4444', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Doctor Reports Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Doctor Reports</h2>
              <span className="text-sm text-gray-500">
                {data.reports?.length || 0} report{data.reports?.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            {data.reports && data.reports.length > 0 ? (
              <div className="space-y-3">
                {data.reports.map((report) => (
                  <div 
                    key={report._id} 
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg mb-2">
                          {report.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-3">
                          {report.description}
                        </p>
                        <div className="flex items-center gap-2 text-gray-400 text-xs">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>
                            {new Date(report.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      {report.fileUrl && (
                        <a
                          href={report.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 text-lg">No doctor reports available</p>
                <p className="text-gray-400 text-sm mt-1">Reports will appear here when uploaded</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}