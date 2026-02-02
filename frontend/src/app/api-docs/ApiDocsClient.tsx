'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  Code,
  Copy,
  Check,
  Server,
  Database,
  Zap,
  Shield,
  Key,
  ExternalLink,
} from 'lucide-react';
import { openApiSpec } from '@/lib/openapi';

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

const METHOD_COLORS: Record<HttpMethod, string> = {
  get: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  post: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  put: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  delete: 'bg-red-500/20 text-red-400 border-red-500/30',
  patch: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export default function ApiDocsClient() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const tags = openApiSpec.tags || [];
  const paths = openApiSpec.paths;

  // Group endpoints by tag
  const endpointsByTag = useMemo(() => {
    const grouped: Record<string, { path: string; method: HttpMethod; operation: any }[]> = {};

    Object.entries(paths).forEach(([path, methods]) => {
      Object.entries(methods as Record<string, any>).forEach(([method, operation]) => {
        const opTags = operation.tags || ['Other'];
        opTags.forEach((tag: string) => {
          if (!grouped[tag]) grouped[tag] = [];
          grouped[tag].push({ path, method: method as HttpMethod, operation });
        });
      });
    });

    return grouped;
  }, [paths]);

  const filteredEndpoints = selectedTag
    ? endpointsByTag[selectedTag] || []
    : Object.values(endpointsByTag).flat();

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const generateCurlExample = (path: string, method: string, operation: any) => {
    const baseUrl = openApiSpec.servers[1]?.url || 'http://localhost:3000/api';
    const fullPath = `${baseUrl}${path}`;

    // Replace path parameters with example values
    let examplePath = fullPath;
    operation.parameters?.forEach((param: any) => {
      if (param.in === 'path') {
        examplePath = examplePath.replace(`{${param.name}}`, param.schema?.example || 'example');
      }
    });

    return `curl -X ${method.toUpperCase()} "${examplePath}"`;
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-indigo-600/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-purple-600/5 blur-[150px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl">
              <Code size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">API Documentation</h1>
              <p className="text-slate-500 font-medium">Version {openApiSpec.info.version}</p>
            </div>
          </div>

          <p className="text-slate-400 max-w-2xl">
            Access mining industry data programmatically. Get stock prices, metal prices,
            company profiles, and news through our REST API.
          </p>

          {/* Quick Stats */}
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
              <Server size={16} className="text-emerald-400" />
              <span className="text-sm text-slate-300">{Object.keys(paths).length} Endpoints</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
              <Database size={16} className="text-blue-400" />
              <span className="text-sm text-slate-300">200+ Companies</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
              <Zap size={16} className="text-amber-400" />
              <span className="text-sm text-slate-300">15-min Updates</span>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-24 lg:h-[calc(100vh-120px)] lg:overflow-y-auto">
            <div className="space-y-6">
              {/* Getting Started */}
              <div className="bg-slate-900/50 rounded-2xl p-5 border border-white/5">
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <Key size={16} className="text-amber-400" />
                  Getting Started
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="#authentication" className="text-slate-400 hover:text-white transition-colors">
                      Authentication
                    </a>
                  </li>
                  <li>
                    <a href="#rate-limits" className="text-slate-400 hover:text-white transition-colors">
                      Rate Limits
                    </a>
                  </li>
                  <li>
                    <a href="#errors" className="text-slate-400 hover:text-white transition-colors">
                      Error Handling
                    </a>
                  </li>
                </ul>
              </div>

              {/* Tags Filter */}
              <div className="bg-slate-900/50 rounded-2xl p-5 border border-white/5">
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <Shield size={16} className="text-purple-400" />
                  Endpoints
                </h3>
                <ul className="space-y-1">
                  <li>
                    <button
                      onClick={() => setSelectedTag(null)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedTag === null
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      All Endpoints
                    </button>
                  </li>
                  {tags.map((tag) => (
                    <li key={tag.name}>
                      <button
                        onClick={() => setSelectedTag(tag.name)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedTag === tag.name
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {tag.name}
                        <span className="ml-2 text-xs opacity-50">
                          ({endpointsByTag[tag.name]?.length || 0})
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="space-y-6">
            {/* Authentication Section */}
            <section id="authentication" className="bg-slate-900/50 rounded-2xl p-6 border border-white/5">
              <h2 className="text-xl font-bold text-white mb-4">Authentication</h2>
              <p className="text-slate-400 mb-4">
                Public endpoints are available without authentication but have lower rate limits.
                For higher limits, include your API key in the request header:
              </p>
              <div className="relative bg-slate-950 rounded-xl p-4 font-mono text-sm">
                <code className="text-emerald-400">X-API-Key: your_api_key_here</code>
                <button
                  onClick={() => copyToClipboard('X-API-Key: your_api_key_here', 'auth')}
                  className="absolute top-3 right-3 p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {copiedCode === 'auth' ? (
                    <Check size={16} className="text-emerald-400" />
                  ) : (
                    <Copy size={16} className="text-slate-400" />
                  )}
                </button>
              </div>
            </section>

            {/* Rate Limits Section */}
            <section id="rate-limits" className="bg-slate-900/50 rounded-2xl p-6 border border-white/5">
              <h2 className="text-xl font-bold text-white mb-4">Rate Limits</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="text-sm text-slate-500 mb-1">Free Tier</div>
                  <div className="text-2xl font-bold text-white">60</div>
                  <div className="text-xs text-slate-400">requests/minute</div>
                </div>
                <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <div className="text-sm text-amber-400 mb-1">Pro Tier</div>
                  <div className="text-2xl font-bold text-white">1,000</div>
                  <div className="text-xs text-slate-400">requests/day</div>
                </div>
                <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <div className="text-sm text-purple-400 mb-1">Institutional</div>
                  <div className="text-2xl font-bold text-white">10,000</div>
                  <div className="text-xs text-slate-400">requests/day</div>
                </div>
              </div>
            </section>

            {/* Endpoints List */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">
                {selectedTag || 'All'} Endpoints
              </h2>

              {filteredEndpoints.map(({ path, method, operation }) => {
                const endpointId = `${method}-${path}`;
                const isExpanded = expandedEndpoint === endpointId;

                return (
                  <motion.div
                    key={endpointId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedEndpoint(isExpanded ? null : endpointId)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
                    >
                      <span
                        className={`px-3 py-1 text-xs font-bold uppercase rounded border ${METHOD_COLORS[method]}`}
                      >
                        {method}
                      </span>
                      <span className="font-mono text-sm text-white flex-1 text-left">
                        {path}
                      </span>
                      <span className="text-sm text-slate-400 hidden md:block">
                        {operation.summary}
                      </span>
                      <ChevronRight
                        size={20}
                        className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>

                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="border-t border-white/5"
                      >
                        <div className="p-6 space-y-6">
                          {/* Description */}
                          <div>
                            <h4 className="text-sm font-semibold text-white mb-2">Description</h4>
                            <p className="text-sm text-slate-400">{operation.description}</p>
                          </div>

                          {/* Parameters */}
                          {operation.parameters && operation.parameters.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-3">Parameters</h4>
                              <div className="space-y-2">
                                {operation.parameters.map((param: any, i: number) => (
                                  <div
                                    key={i}
                                    className="flex items-start gap-3 p-3 bg-white/5 rounded-lg"
                                  >
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-700 text-slate-300 rounded">
                                      {param.in}
                                    </span>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm text-white">
                                          {param.name}
                                        </span>
                                        {param.required && (
                                          <span className="text-[10px] text-red-400">required</span>
                                        )}
                                        <span className="text-xs text-slate-500">
                                          {param.schema?.type}
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-400 mt-1">
                                        {param.description}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Example */}
                          <div>
                            <h4 className="text-sm font-semibold text-white mb-3">Example Request</h4>
                            <div className="relative bg-slate-950 rounded-xl p-4">
                              <code className="text-sm text-emerald-400 font-mono break-all">
                                {generateCurlExample(path, method, operation)}
                              </code>
                              <button
                                onClick={() =>
                                  copyToClipboard(generateCurlExample(path, method, operation), endpointId)
                                }
                                className="absolute top-3 right-3 p-2 hover:bg-white/10 rounded-lg transition-colors"
                              >
                                {copiedCode === endpointId ? (
                                  <Check size={16} className="text-emerald-400" />
                                ) : (
                                  <Copy size={16} className="text-slate-400" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Responses */}
                          {operation.responses && (
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-3">Responses</h4>
                              <div className="space-y-2">
                                {Object.entries(operation.responses).map(([code, response]: [string, any]) => (
                                  <div
                                    key={code}
                                    className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                                  >
                                    <span
                                      className={`px-2 py-0.5 text-xs font-bold rounded ${
                                        code.startsWith('2')
                                          ? 'bg-emerald-500/20 text-emerald-400'
                                          : code.startsWith('4')
                                          ? 'bg-amber-500/20 text-amber-400'
                                          : 'bg-red-500/20 text-red-400'
                                      }`}
                                    >
                                      {code}
                                    </span>
                                    <span className="text-sm text-slate-400">
                                      {response.description}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
