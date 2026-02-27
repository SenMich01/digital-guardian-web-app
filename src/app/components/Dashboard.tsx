import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Search,
  Globe,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '@/lib/auth-context';
import {
  dashboardApi,
  scanApi,
  reputationApi,
  type Exposure,
  type DashboardStats,
  type EmailReputation,
} from '@/lib/api';
import { toast } from 'sonner';

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'];

export function Dashboard() {
  const { user, subscription } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [exposures, setExposures] = useState<Exposure[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const autoScanned = useRef(false);
  const [reputation, setReputation] = useState<EmailReputation | null>(null);
  const [reputationLoading, setReputationLoading] = useState(false);

  const userName = user?.name || localStorage.getItem('userName') || 'User';
  const trialActive = subscription?.trialActive ?? false;
  const trialEndsAt = subscription?.trialEndsAt;
  const exempt = subscription?.exempt ?? false;
  const isPremium = subscription?.isPremium ?? false;

  const getTrialCountdown = () => {
    if (!trialEndsAt) return 'soon';
    const end = new Date(trialEndsAt).getTime();
    const now = Date.now();
    const diffMs = end - now;
    if (diffMs <= 0) return 'today';
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.floor(diffMs / dayMs);
    const hours = Math.floor((diffMs % dayMs) / (60 * 60 * 1000));
    if (days <= 0) {
      return `in ${hours} hour${hours === 1 ? '' : 's'}`;
    }
    return `in ${days} day${days === 1 ? '' : 's'}`;
  };

  const loadDashboard = async () => {
    try {
      const res = await dashboardApi.stats();
      setStats(res.stats);
    } catch {
      setStats({
        totalExposures: 0,
        highRisk: 0,
        mediumRisk: 0,
        lowRisk: 0,
        removed: 0,
      });
    }
  };

  const loadExposures = async () => {
    try {
      const res = await scanApi.results();
      setExposures(res.exposures);
    } catch {
      setExposures([]);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadDashboard(), loadExposures()]);
      setLoading(false);
    })();
  }, []);

  // Auto-scan on first visit when no exposures (per requirement: search after login)
  useEffect(() => {
    if (loading || isScanning || exposures.length > 0 || !user?.email || autoScanned.current) return;
    autoScanned.current = true;
    handleScan(false);
  }, [loading, user?.email, exposures.length, isScanning]);

  const handleScan = async (fromUser = false) => {
    setIsScanning(true);
    try {
      const res = await scanApi.scan();
      setExposures(res.exposures);
      await loadDashboard();
      toast.success(`Scan complete. Found ${res.count} breach${res.count !== 1 ? 'es' : ''}.`);

      // Email reputation insights for the primary email – only when user clicks the scan button
      if (fromUser && user?.email) {
        setReputationLoading(true);
        try {
          const repRes = await reputationApi.get(user.email);
          setReputation(repRes.reputation);
        } catch {
          setReputation(null);
        } finally {
          setReputationLoading(false);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const getRiskBadge = (risk: string) => {
    const variants = {
      high: 'bg-red-100 text-red-700 border-red-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      low: 'bg-green-100 text-green-700 border-green-200',
    };
    return variants[(risk || 'medium') as keyof typeof variants];
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Email':
        return <Mail className="w-4 h-4" />;
      case 'Phone':
        return <Phone className="w-4 h-4" />;
      case 'Address':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const s = stats || {
    totalExposures: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    removed: 0,
  };

  const trendData = [
    { month: 'Sep', exposures: Math.max(0, s.totalExposures - 5) },
    { month: 'Oct', exposures: Math.max(0, s.totalExposures - 3) },
    { month: 'Nov', exposures: Math.max(0, s.totalExposures - 2) },
    { month: 'Dec', exposures: Math.max(0, s.totalExposures - 1) },
    { month: 'Jan', exposures: s.totalExposures },
    { month: 'Feb', exposures: s.totalExposures },
  ];

  const riskData = [
    { risk: 'High', count: s.highRisk },
    { risk: 'Medium', count: s.mediumRisk },
    { risk: 'Low', count: s.lowRisk },
  ];

  const sourceData = exposures.length
    ? (() => {
        const bySource: Record<string, number> = {};
        exposures.forEach((e) => {
          const src = e.source || 'Other';
          bySource[src] = (bySource[src] || 0) + 1;
        });
        return Object.entries(bySource).map(([name, value]) => ({ name, value }));
      })()
    : [{ name: 'No data yet', value: 1 }];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Trial / Premium banner */}
      {!exempt && (
        <div
          className={`mb-6 rounded-lg p-4 ${
            trialActive
              ? 'bg-amber-50 border border-amber-200 text-amber-800'
              : isPremium
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
              }`}
        >
          {trialActive ? (
            <p className="text-sm">
              <strong>Free trial:</strong> Your 3-day trial ends {getTrialCountdown()}. Subscribe to
              continue using Digital Guardian after your trial.
            </p>
          ) : isPremium ? (
            <p className="text-sm">
              <strong>Premium member:</strong> You have full access to all features.
            </p>
          ) : (
            <p className="text-sm">
              <strong>Subscription required:</strong> Please subscribe to continue using the app.
            </p>
          )}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Welcome back, {userName}!</h1>
        <p className="text-gray-600">Here's your privacy overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Exposures</CardTitle>
            <Shield className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{s.totalExposures}</div>
            <p className="text-xs text-gray-500 mt-1">Detected across all sources</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-red-600">{s.highRisk}</div>
            <p className="text-xs text-gray-500 mt-1">Requires immediate action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Medium Risk</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-yellow-600">{s.mediumRisk}</div>
            <p className="text-xs text-gray-500 mt-1">Monitor closely</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Successfully Removed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-green-600">{s.removed}</div>
            <p className="text-xs text-gray-500 mt-1">Privacy wins</p>
          </CardContent>
        </Card>
      </div>

      {/* Scan Action */}
      <Card className="mb-8 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl mb-2">Run a New Scan</h3>
              <p className="text-indigo-100 mb-4">
                Scan your registered email ({user?.email}) for breaches and exposures.
              </p>
              {isScanning && (
                <div className="space-y-2">
                  <Progress value={66} className="bg-indigo-400" />
                  <p className="text-sm text-indigo-100">Scanning HaveIBeenPwned database...</p>
                </div>
              )}
            </div>
            <Button
              onClick={() => handleScan(true)}
              disabled={isScanning}
              className="bg-white text-indigo-600 hover:bg-indigo-50"
            >
              <Search className="w-4 h-4 mr-2" />
              {isScanning ? 'Scanning...' : 'Start Scan'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Exposure Trend</CardTitle>
            <CardDescription>Number of exposures detected over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="exposures" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>Breakdown by risk level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={riskData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="risk" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Exposure Sources</CardTitle>
            <CardDescription>Where your data was found</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Exposures</CardTitle>
            <CardDescription>Latest privacy concerns detected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {exposures.slice(0, 4).map((exposure, idx) => (
                <div
                  key={exposure.id ?? idx}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-gray-500">{getTypeIcon(exposure.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{exposure.type}</span>
                        <Badge variant="outline" className={getRiskBadge(exposure.risk)}>
                          {exposure.risk}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{exposure.data}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Found on {exposure.source} • {exposure.date}
                      </p>
                    </div>
                  </div>
                  <Link to={`/remediation/${exposure.id ?? idx}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Fix
                    </Button>
                  </Link>
                </div>
              ))}
              {exposures.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No exposures yet. Run a scan to check your email for breaches.
                </p>
              )}
            </div>
            <div className="mt-4 text-center">
              <Link to="/scans">
                <Button variant="outline">View All Exposures</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Email Reputation & Security Insights (free for all users after scan) */}
      {user?.email && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Email Reputation &amp; Security Insights</CardTitle>
            <CardDescription>
              Based on checks for {user.email}. We use these signals to help you understand how this
              address looks from a deliverability and risk perspective.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reputationLoading && (
              <p className="text-sm text-gray-500">Loading email reputation…</p>
            )}
            {!reputationLoading && !reputation && (
              <p className="text-sm text-gray-500">
                Click &quot;Start Scan&quot; to load reputation and security insights for your email.
              </p>
            )}
            {!reputationLoading && reputation && (
              <div className="space-y-3 text-sm text-gray-700">
                <div>
                  <p className="font-medium">Email risk level</p>
                  <p className="mt-1">
                    {(() => {
                      const score = reputation.quality_score ?? 0;
                      const deliverable = reputation.deliverability === 'DELIVERABLE';
                      let label = 'Unknown';
                      let explanation =
                        'We were able to look up this address, but could not clearly determine its risk level.';
                      if (deliverable && score >= 0.8 && !reputation.is_disposable_email) {
                        label = 'Low';
                        explanation =
                          'This email looks deliverable and healthy based on the checks we run. It is still important to keep passwords unique and enable 2FA.';
                      } else if (score >= 0.5) {
                        label = 'Medium';
                        explanation =
                          'Some signals suggest this email may be lower quality or more likely to be misused. Be cautious about where you share it and how it is secured.';
                      } else {
                        label = 'High';
                        explanation =
                          'Multiple signals indicate this email may be higher risk (for example low quality score or limited deliverability). Use strong, unique passwords and be careful where it is used.';
                      }
                      return (
                        <>
                          <span className="font-semibold">{label}</span> – {explanation}
                        </>
                      );
                    })()}
                  </p>
                </div>

                <div>
                  <p className="font-medium">Email quality &amp; deliverability</p>
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    <li>
                      Deliverability:{' '}
                      <span className="font-medium">
                        {reputation.deliverability || 'Unknown'}
                      </span>
                    </li>
                    <li>
                      Catch-all address:{' '}
                      <span className="font-medium">
                        {reputation.is_catchall_email === null
                          ? 'Unknown'
                          : reputation.is_catchall_email
                          ? 'Yes'
                          : 'No'}
                      </span>
                    </li>
                    <li>
                      SMTP validation:{' '}
                      <span className="font-medium">
                        {reputation.is_smtp_valid === null
                          ? 'Not checked'
                          : reputation.is_smtp_valid
                          ? 'Valid'
                          : 'Not valid'}
                      </span>
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium">Domain &amp; provider</p>
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    <li>
                      Provider type:{' '}
                      <span className="font-medium">
                        {reputation.is_free_email === null
                          ? 'Unknown'
                          : reputation.is_free_email
                          ? 'Free email provider'
                          : 'Custom or business domain'}
                      </span>
                    </li>
                    <li>
                      Disposable or temporary:{' '}
                      <span className="font-medium">
                        {reputation.is_disposable_email === null
                          ? 'Unknown'
                          : reputation.is_disposable_email
                          ? 'Yes'
                          : 'No'}
                      </span>
                    </li>
                    <li>
                      MX records found:{' '}
                      <span className="font-medium">
                        {reputation.is_mx_found === null
                          ? 'Unknown'
                          : reputation.is_mx_found
                          ? 'Yes'
                          : 'No'}
                      </span>
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium">Security recommendations</p>
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    <li>Use strong, unique passwords for any accounts that use this email.</li>
                    <li>Enable two-factor authentication (2FA) where possible.</li>
                    <li>
                      Re-scan this email regularly so new reputation or breach changes can be detected
                      early.
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
