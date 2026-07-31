import React from 'react';

const statusConfig = {
  na_escola: {
    label: 'Na Escola',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  responsavel_chegou: {
    label: 'Responsável Chegou',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  liberado: {
    label: 'A Caminho',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  saiu: {
    label: 'Saiu',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig['na_escola'];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}
