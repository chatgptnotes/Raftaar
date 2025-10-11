import React from 'react';

const StatsCard = ({ title, value, icon, color = 'blue', trend }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 border-blue-300',
    teal: 'from-teal-500 to-teal-600 border-teal-300',
    purple: 'from-purple-500 to-purple-600 border-purple-300',
    green: 'from-green-500 to-green-600 border-green-300',
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
          {trend && (
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <span>↑</span> {trend}
            </p>
          )}
        </div>
        <div className={`w-16 h-16 bg-gradient-to-br ${colorClasses[color]} rounded-full flex items-center justify-center shadow-lg`}>
          <span className="text-3xl">{icon}</span>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
