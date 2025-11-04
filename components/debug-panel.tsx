// Debug panel component for development and troubleshooting
'use client';

import { useState, useEffect } from 'react';
// import { useUser } from '@clerk/nextjs'; // BYPASSED FOR MOCK MODE
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, RefreshCw, Trash2 } from 'lucide-react';

interface DebugPanelProps {
  logs: any[];
  userState?: any;
  apiCalls?: any[];
  dbStatus?: any;
}

export function DebugPanel({ logs, userState, apiCalls, dbStatus }: DebugPanelProps) {
  // MOCK MODE: Bypass Clerk authentication
  const user = { id: 'mock-user-123' };
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'user' | 'api' | 'db'>('logs');

  // Only show in development or with debug=true
  const shouldShow = process.env.NODE_ENV === 'development' || 
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'true');

  if (!shouldShow) {
    return null;
  }

  const clearLogs = () => {
    if (typeof window !== 'undefined') {
      console.clear();
      window.location.reload();
    }
  };

  const refreshData = () => {
    window.location.reload();
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <Card className="w-96 max-h-96 bg-black/90 text-white border-gray-700">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-mono">Debug Panel</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={refreshData}
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearLogs}
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsOpen(!isOpen)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              >
                {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {isOpen && (
          <CardContent className="pt-0">
            {/* Tabs */}
            <div className="flex space-x-1 mb-3">
              {[
                { id: 'logs', label: 'Logs', count: logs?.length || 0 },
                { id: 'user', label: 'User', count: userState ? 1 : 0 },
                { id: 'api', label: 'API', count: apiCalls?.length || 0 },
                { id: 'db', label: 'DB', count: dbStatus ? 1 : 0 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-2 py-1 text-xs rounded ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label} {tab.count > 0 && `(${tab.count})`}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="max-h-64 overflow-y-auto text-xs font-mono">
              {activeTab === 'logs' && (
                <div className="space-y-1">
                  {logs?.slice(0, 20).map((log, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          log.level === 'ERROR'
                            ? 'bg-red-500/20 text-red-400'
                            : log.level === 'WARN'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : log.level === 'INFO'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {log.level}
                      </Badge>
                      <span className="text-gray-400">{log.timestamp}</span>
                      <span className="text-white">{log.message}</span>
                    </div>
                  ))}
                  {(!logs || logs.length === 0) && (
                    <div className="text-gray-500">No logs available</div>
                  )}
                </div>
              )}

              {activeTab === 'user' && (
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-400">Clerk User:</span>
                    <div className="text-white">{user?.id || 'Not authenticated'}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Email:</span>
                    <div className="text-white">{'N/A'}</div>
                  </div>
                  {userState && (
                    <div>
                      <span className="text-gray-400">Profile:</span>
                      <pre className="text-white text-xs overflow-x-auto">
                        {JSON.stringify(userState, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'api' && (
                <div className="space-y-1">
                  {apiCalls?.slice(0, 10).map((call, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          call.status >= 400
                            ? 'bg-red-500/20 text-red-400'
                            : call.status >= 300
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}
                      >
                        {call.status}
                      </Badge>
                      <span className="text-white">{call.method} {call.url}</span>
                      <span className="text-gray-400">{call.duration}ms</span>
                    </div>
                  ))}
                  {(!apiCalls || apiCalls.length === 0) && (
                    <div className="text-gray-500">No API calls recorded</div>
                  )}
                </div>
              )}

              {activeTab === 'db' && (
                <div className="space-y-2">
                  {dbStatus && (
                    <div>
                      <span className="text-gray-400">Database Status:</span>
                      <div className="text-white">{dbStatus.database}</div>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400">Environment:</span>
                    <div className="text-white">{process.env.NODE_ENV}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Timestamp:</span>
                    <div className="text-white">{new Date().toISOString()}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
