'use client';

import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED', '#0891B2'];

export default function PieChart({ data, title }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {title && <h3 className="text-sm font-semibold text-text mb-4">{title}</h3>}
        <div className="h-64 flex items-center justify-center text-text-muted text-sm">
          Sin datos disponibles
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {title && <h3 className="text-sm font-semibold text-text mb-4">{title}</h3>}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPie>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [value, name]}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            />
            <Legend />
          </RechartsPie>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
