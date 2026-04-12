'use client';

import { useState } from 'react';
import Link from 'next/link';
import VoterCountForm from './VoterCountForm';
import IncidentForm from './IncidentForm';

type Tab = 'voter_count' | 'incident';

export default function ReportPage() {
  const [tab, setTab] = useState<Tab>('voter_count');

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">참관 보고</h1>
            <p className="text-sm text-gray-500">참관 현장에서 보고해주세요</p>
          </div>
        </div>

        {/* Tab */}
        <div className="flex rounded-xl bg-gray-200 p-1 mb-6">
          <button
            onClick={() => setTab('voter_count')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              tab === 'voter_count'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📊 투표인수 보고
          </button>
          <button
            onClick={() => setTab('incident')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              tab === 'incident'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ⚠️ 특이사항 보고
          </button>
        </div>

        {/* Form */}
        {tab === 'voter_count' ? <VoterCountForm /> : <IncidentForm />}
      </div>
    </main>
  );
}
