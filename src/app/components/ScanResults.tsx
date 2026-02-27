import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Mail,
  Phone,
  MapPin,
  Globe,
  User,
  ExternalLink,
  Download,
  Filter,
  Search,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { scanApi, reputationApi, type Exposure, type EmailReputation } from '@/lib/api';
import { toast } from 'sonner';

export function ScanResults() {
  const { subscription, user } = useAuth();
  const [exposures, setExposures] = useState<Exposure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Premium search: manual email lookup
  const [premiumSearchEmail, setPremiumSearchEmail] = useState('');
  const [premiumSearchLoading, setPremiumSearchLoading] = useState(false);
  const [premiumSearchResults, setPremiumSearchResults] = useState<Exposure[] | null>(null);
  const isPremiumPaid = (subscription?.plan === 'premium') || subscription?.exempt;
  const [reputation, setReputation] = useState<EmailReputation | null>(null);
  const [reputationLoading, setReputationLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await scanApi.results();
        setExposures(res.exposures);
      } catch {
        setExposures([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredExposures = exposures.filter((exposure) => {
    const matchesSearch =
      (exposure.data?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exposure.source?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exposure.type?.toLowerCase().includes(searchQuery.toLowerCase())) ??
      false;
    const matchesRisk = filterRisk === 'all' || exposure.risk === filterRisk;
    const matchesStatus = filterStatus === 'all' || exposure.status === filterStatus;
    return matchesSearch && matchesRisk && matchesStatus;
  });

  const handlePremiumSearch = async () => {
    if (!premiumSearchEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(premiumSearchEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!isPremiumPaid) {
      toast.error('Premium subscription required for manual email search');
      return;
    }
    setPremiumSearchLoading(true);
    setPremiumSearchResults(null);
    setReputation(null);
    try {
      const res = await scanApi.search(premiumSearchEmail);
      setPremiumSearchResults(res.exposures);
      toast.success(`Found ${res.count} breach${res.count !== 1 ? 'es' : ''} for ${res.scanned}`);

      // Email reputation (Abstract API) – only after user clicks Search
      setReputationLoading(true);
      try {
        const repRes = await reputationApi.get(premiumSearchEmail);
        setReputation(repRes.reputation);
      } catch {
        setReputation(null);
      } finally {
        setReputationLoading(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setPremiumSearchLoading(false);
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

  const getStatusBadge = (status: string) => {
    return status === 'active'
      ? 'bg-blue-100 text-blue-700 border-blue-200'
      : 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Email':
        return <Mail className="w-5 h-5 text-indigo-600" />;
      case 'Phone':
        return <Phone className="w-5 h-5 text-indigo-600" />;
      case 'Address':
        return <MapPin className="w-5 h-5 text-indigo-600" />;
      case 'Full Name':
        return <User className="w-5 h-5 text-indigo-600" />;
      default:
        return <Globe className="w-5 h-5 text-indigo-600" />;
    }
  };

  const exportReport = () => {
    toast.info('PDF report export coming soon');
  };

  const displayExposures = premiumSearchResults ?? filteredExposures;
  const displayLabel = premiumSearchResults
    ? `Search results for ${premiumSearchEmail}`
    : `Found ${filteredExposures.length} exposure${filteredExposures.length !== 1 ? 's' : ''} across the web`;

  const primaryEmail = premiumSearchResults ? premiumSearchEmail : user?.email || '';

  const renderReputationInsights = () => {
    if (!primaryEmail) return null;
    return (
      <Card className="mt-4">
        <CardContent className="p-6 space-y-3">
          <h3 className="font-medium text-lg">Email Reputation &amp; Security Insights</h3>
          {reputationLoading && (
            <p className="text-sm text-gray-500">Loading email reputation…</p>
          )}
          {!reputationLoading && !reputation && (
            <p className="text-sm text-gray-500">
              We couldn&apos;t load reputation insights right now.
            </p>
          )}
          {!reputationLoading && reputation && (
            <div className="space-y-3 text-sm text-gray-700">
              {/* Risk level */}
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

              {/* Quality & deliverability */}
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

              {/* Domain & provider */}
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

              {/* Fraud & abuse indicators */}
              <div>
                <p className="font-medium">Fraud &amp; abuse indicators</p>
                <p className="mt-1">
                  {reputation.is_disposable_email
                    ? 'This address is marked as disposable or temporary, which is often associated with higher abuse or throwaway usage.'
                    : 'Based on the signals we check, we did not see clear indicators that this email is used for fraud, spam, or abuse. This does not guarantee it is risk free, but nothing obvious was flagged.'}
                </p>
              </div>

              {/* Recommendations */}
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
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Scan Results</h1>
          <p className="text-gray-600">{displayLabel}</p>
        </div>
        <Button onClick={exportReport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Premium Search (Premium users only) */}
      {isPremiumPaid && (
        <Card className="mb-6 border-indigo-200 bg-indigo-50/30">
          <CardContent className="pt-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-600" />
              Advanced Search (Premium)
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Search any email address for breach information.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Input
                type="email"
                placeholder="Enter email to search"
                value={premiumSearchEmail}
                onChange={(e) => setPremiumSearchEmail(e.target.value)}
                className="max-w-xs"
              />
              <Button
                onClick={handlePremiumSearch}
                disabled={premiumSearchLoading}
              >
                {premiumSearchLoading ? 'Searching...' : 'Search Breaches'}
              </Button>
              {premiumSearchResults !== null && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setPremiumSearchResults(null);
                    setPremiumSearchEmail('');
                  }}
                >
                  Clear & Show My Data
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isPremiumPaid && (
        <Card className="mb-6 border-amber-200 bg-amber-50/30">
          <CardContent className="pt-6">
            <p className="text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <strong>Premium feature:</strong> Upgrade to search any email address for breach
              information.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters (only when showing own data) */}
      {!premiumSearchResults && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search exposures..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex gap-4">
                <Select value={filterRisk} onValueChange={setFilterRisk}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Risk Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risks</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="removed">Removed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading scan results...</div>
      ) : (
        <div className="space-y-4">
          {displayExposures.map((exposure, idx) => (
            <Card key={exposure.id ?? idx} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1">{getTypeIcon(exposure.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{exposure.type}</h3>
                          <Badge variant="outline" className={getRiskBadge(exposure.risk)}>
                            {(exposure.risk || 'medium').toUpperCase()} RISK
                          </Badge>
                          <Badge variant="outline" className={getStatusBadge(exposure.status)}>
                            {(exposure.status || 'active').toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-gray-900 mb-1">{exposure.data}</p>
                        <p className="text-sm text-gray-500">
                          Found on <span className="font-medium">{exposure.source}</span> •{' '}
                          {exposure.date}
                        </p>
                      </div>
                      {exposure.status === 'active' && (
                        <Link to={`/remediation/${exposure.id ?? idx}`}>
                          <Button>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Take Action
                          </Button>
                        </Link>
                      )}
                    </div>
                    {exposure.aiAssessment && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm">
                          <span className="font-medium text-blue-900">Assessment: </span>
                          <span className="text-blue-800">{exposure.aiAssessment}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {displayExposures.length === 0 && (
            <>
              <Card>
                <CardContent className="p-8 text-center space-y-2">
                  <p className="text-gray-700 font-medium">
                    {premiumSearchResults
                      ? 'No breaches found for this email in our current dataset.'
                      : 'No exposures found matching your filters.'}
                  </p>
                  <p className="text-sm text-gray-500">
                    New breaches are added regularly, and some may not be public yet. Regular scans help you
                    catch new exposures early.
                  </p>
                </CardContent>
              </Card>
              {renderInsights()}
            </>
          )}
        </div>
      )}
    </div>
  );
}
