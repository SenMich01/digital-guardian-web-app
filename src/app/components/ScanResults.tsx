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
import { scanApi, type Exposure } from '@/lib/api';
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
    try {
      const res = await scanApi.search(premiumSearchEmail);
      setPremiumSearchResults(res.exposures);
      toast.success(`Found ${res.count} breach${res.count !== 1 ? 'es' : ''} for ${res.scanned}`);
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

  const renderInsights = () => {
    if (!primaryEmail) return null;
    const [, domain = ''] = primaryEmail.split('@');
    const normalizedDomain = domain.toLowerCase();

    const providerHint =
      normalizedDomain.includes('gmail') ||
      normalizedDomain.includes('outlook') ||
      normalizedDomain.includes('yahoo')
        ? 'This address uses a large email provider, which is frequently targeted for phishing and account takeover. Enabling 2FA and monitoring for new breaches is especially important.'
        : 'Smaller or custom domains can still appear in breaches, but may not always be visible in public breach datasets.';

    return (
      <Card className="mt-4">
        <CardContent className="p-6 space-y-3">
          <h3 className="font-medium text-lg">Privacy insights for {primaryEmail}</h3>
          <p className="text-sm text-gray-600">
            We didn&apos;t find public breach records for this address in our current dataset. That&apos;s good
            news, but it doesn&apos;t guarantee the address is risk free.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
            <li>{providerHint}</li>
            <li>
              Attackers often reuse lists from older leaks. Regular scans help you catch exposures when new
              data is added.
            </li>
            <li>
              Reused passwords remain one of the biggest risks. If this email uses the same password on
              multiple sites, update them and use a password manager.
            </li>
          </ul>
          {!isPremiumPaid && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3 mt-2">
              Upgrade to Premium to scan other addresses you use (work email, secondary accounts) and see a
              fuller picture of your digital exposure.
            </p>
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
