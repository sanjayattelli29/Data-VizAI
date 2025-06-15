import React, { useState } from 'react';

interface N8nInsightsProps {
  metrics: Record<string, number>;
  overallScore: number;
  topIssues: Record<string, number>;
}

const N8nInsights: React.FC<N8nInsightsProps> = ({ metrics, overallScore, topIssues }) => {
  const [insights, setInsights] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // n8n webhook URL
  const WEBHOOK_URL = 'https://n8n-n91d.onrender.com/webhook/355f72e9-adf0-4071-9ce4-e4bff5bf8ff3/chat';

  const sendToN8n = async (message: string): Promise<string> => {
    try {
      const requestBody = {
        action: 'sendMessage',
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        chatInput: message,
        message: message
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const simpleResponse = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatInput: message,
            sessionId: `session_${Date.now()}`
          }),
        });

        if (!simpleResponse.ok) {
          throw new Error(`Server error: ${response.status} - Check n8n workflow configuration`);
        }

        const simpleData = await simpleResponse.json();
        return simpleData.output || simpleData.response || simpleData.message || simpleData.text || simpleData.result || 'Analysis completed';
      }

      const data = await response.json();
      return data.output || data.response || data.message || data.text || data.result || 'Analysis completed';
    } catch (error) {
      console.error('Error calling n8n webhook:', error);
      throw new Error('Unable to connect to AI agent. Please check your n8n workflow.');
    }
  };

  const formatAllMetrics = () => {
    const allMetrics = Object.entries(metrics)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const topIssuesStr = Object.entries(topIssues)
      .map(([issue, score]) => `${issue}: ${score}`)
      .join(', ');

    return `
Please analyze my dataset and provide comprehensive insights covering:

1. Preprocessing Suggestions - What preprocessing steps should I apply?
2. ML & DL Model Recommendations - Which models are suitable for my data?
3. Production Readiness - Can this dataset be used directly in production?
4. Monitoring & Alerts - What should I monitor for incoming datasets?

Dataset Metrics:
${allMetrics}

Overall Score: ${overallScore}

Top Issues: ${topIssuesStr}

Please provide detailed recommendations for each area.
    `.trim();
  };

  const getAllInsights = async () => {
    setLoading(true);
    setError('');

    try {
      const fullPrompt = formatAllMetrics();
      const response = await sendToN8n(fullPrompt);
      setInsights(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get insights';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearInsights = () => {
    setInsights('');
    setError('');
  };

  const downloadInsights = () => {
    if (!insights) return;
    
    const cleanText = insights.replace(/\*\*/g, '').replace(/\*/g, '');
    const blob = new Blob([cleanText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dataset-insights-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatInsightText = (text: string) => {
    // Remove asterisks
    let cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '');
    
    // Split into sections
    const sections = cleanText.split(/(\d+\.\s*[A-Za-z\s&-]+)/);
    
    return sections.map((section, index) => {
      if (section.match(/^\d+\.\s*[A-Za-z\s&-]+/)) {
        // This is a header - match the gen-z style
        return (
          <div key={index} className="mb-6 mt-8 first:mt-0">
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200/50 p-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {section.match(/^\d+/)?.[0]}
                  </span>
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  {section.replace(/^\d+\.\s*/, '')}
                </h3>
              </div>
            </div>
          </div>
        );
      } else if (section.trim()) {
        // This is content - match the gen-z card style
        const lines = section.trim().split('\n').filter(line => line.trim());
        return (
          <div key={index} className="mb-6">
            <div className="backdrop-blur-sm bg-white/70 rounded-2xl border border-white/20 p-6">
              {lines.map((line, lineIndex) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return null;
                
                // Check if line starts with bullet point pattern
                if (trimmedLine.match(/^[•\-\*]\s*/)) {
                  return (
                    <div key={lineIndex} className="flex items-start gap-3 mb-3">
                      <div className="w-1.5 h-1.5 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-slate-700 leading-relaxed">
                        {trimmedLine.replace(/^[•\-\*]\s*/, '')}
                      </p>
                    </div>
                  );
                }
                
                return (
                  <p key={lineIndex} className="text-slate-700 leading-relaxed mb-3">
                    {trimmedLine}
                  </p>
                );
              })}
            </div>
          </div>
        );
      }
      return null;
    });
  };

  return (
    <div className="space-y-8">
      {/* Header Section - matching gen-z card style */}
      <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200/50 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Dataset Insights Hub
          </h2>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="backdrop-blur-sm bg-white/70 rounded-2xl border border-white/20 p-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-1">Overall Score</h3>
            <p className="text-2xl font-bold text-slate-800">
              {overallScore.toFixed(1)}
            </p>
          </div>
          <div className="backdrop-blur-sm bg-white/70 rounded-2xl border border-white/20 p-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-1">Metrics Count</h3>
            <p className="text-2xl font-bold text-slate-800">
              {Object.keys(metrics).length}
            </p>
          </div>
          <div className="backdrop-blur-sm bg-white/70 rounded-2xl border border-white/20 p-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-1">Top Issues</h3>
            <p className="text-2xl font-bold text-slate-800">
              {Object.keys(topIssues).length}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={getAllInsights}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Analyzing Dataset...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Get AI Insights
              </div>
            )}
          </button>

          {insights && (
            <>
              <button
                onClick={clearInsights}
                className="px-6 py-3 bg-slate-600 text-white rounded-xl font-semibold"
              >
                Clear Insights
              </button>
              <button
                onClick={downloadInsights}
                className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download .txt
              </button>
            </>
          )}
        </div>
      </div>

      {/* Insights Section */}
      {(insights || error) && (
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200/50 p-8">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">⚠️</span>
                </div>
                <span className="text-red-800 font-semibold">Error Getting Insights</span>
              </div>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={getAllInsights}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">🤖</span>
                </div>
                <span className="text-xl font-bold text-slate-800">
                  AI Dataset Analysis Results
                </span>
              </div>
              
              <div className="space-y-4">
                {formatInsightText(insights)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* What You'll Get Section */}
      {!insights && !error && (
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200/50 p-8">
          <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">
            What You'll Get:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { num: '1', title: 'Preprocessing Recommendations', desc: 'Specific steps to clean and prepare your data', color: 'blue' },
              { num: '2', title: 'Model Suggestions', desc: 'Best ML/DL algorithms for your dataset', color: 'purple' },
              { num: '3', title: 'Production Readiness', desc: 'Assessment of deployment readiness', color: 'green' },
              { num: '4', title: 'Monitoring Strategy', desc: 'Key metrics and alerts to set up', color: 'orange' }
            ].map((item) => (
              <div key={item.num} className="flex items-start gap-4 backdrop-blur-sm bg-white/70 rounded-2xl border border-white/20 p-6">
                <div className={`w-8 h-8 bg-gradient-to-r ${
                  item.color === 'blue' ? 'from-blue-500 to-indigo-500' :
                  item.color === 'purple' ? 'from-purple-500 to-violet-500' :
                  item.color === 'green' ? 'from-green-500 to-emerald-500' :
                  'from-orange-500 to-amber-500'
                } rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-bold text-sm">{item.num}</span>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2">{item.title}</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default N8nInsights;