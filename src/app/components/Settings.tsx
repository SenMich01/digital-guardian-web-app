import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  User,
  Mail,
  Phone,
  Shield,
  Bell,
  CreditCard,
  Trash2,
  Save,
  Crown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { billingApi } from '@/lib/api';
import { StripeCardForm } from './StripeCardForm';

export function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, subscription, refreshSubscription } = useAuth();
  const [name, setName] = useState(user?.name || localStorage.getItem('userName') || '');
  const [email, setEmail] = useState(user?.email || localStorage.getItem('userEmail') || '');
  const [phone, setPhone] = useState('+1 (555) 123-4567');
  const [showCardForm, setShowCardForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  const trialActive = subscription?.trialActive ?? false;
  const trialEndsAt = subscription?.trialEndsAt;
  const exempt = subscription?.exempt ?? false;
  const isPremium = subscription?.isPremium ?? false;

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const cardSaved = searchParams.get('card_saved');
    if (success) {
      toast.success('Payment successful! Welcome to Premium.');
      refreshSubscription();
      setSearchParams({});
    }
    if (canceled) {
      toast.info('Payment canceled');
      setSearchParams({});
    }
    if (cardSaved) {
      toast.success('Card saved successfully');
      setShowCardForm(false);
      setClientSecret(null);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, refreshSubscription]);

  useEffect(() => {
    setName(user?.name || localStorage.getItem('userName') || '');
    setEmail(user?.email || localStorage.getItem('userEmail') || '');
  }, [user]);

  const handleSaveProfile = () => {
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', email);
    toast.success('Profile updated successfully!');
  };

  const handleUpgrade = async () => {
    setLoadingCheckout(true);
    try {
      const { url } = await billingApi.createCheckout();
      if (url) window.location.href = url;
      else toast.error('Payment not configured. Please contact support.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleAddCard = async () => {
    if (!showCardForm) {
      try {
        const { clientSecret: secret } = await billingApi.setupIntent();
        setClientSecret(secret);
        setShowCardForm(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not load payment form');
      }
    } else {
      setShowCardForm(false);
      setClientSecret(null);
    }
  };

  const cardFormSuccess = () => {
    setShowCardForm(false);
    setClientSecret(null);
    toast.success('Card saved!');
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

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
          {trialActive && (
            <p className="text-sm">
              <strong>Trial:</strong> Ends{' '}
              {trialEndsAt ? new Date(trialEndsAt).toLocaleDateString() : 'soon'}. Subscribe to
              continue.
            </p>
          )}
          {isPremium && !trialActive && (
            <p className="text-sm">
              <strong>Premium:</strong> You have full access to all features.
            </p>
          )}
          {!isPremium && !trialActive && (
            <p className="text-sm">
              <strong>Subscription required:</strong> Subscribe to continue using the app.
            </p>
          )}
        </div>
      )}

      <Tabs defaultValue={searchParams.get('tab') || 'profile'} className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled
                  />
                </div>
                <p className="text-xs text-gray-500">Email cannot be changed (used for breach scanning)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="pt-4 border-t">
                <Button onClick={handleSaveProfile}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <Button
                variant="destructive"
                onClick={() => toast.error('Account deletion would require confirmation')}
              >
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy & Security
              </CardTitle>
              <CardDescription>
                Control your privacy settings and monitoring preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Continuous Monitoring</Label>
                  <p className="text-sm text-gray-500">Automatically scan for new exposures daily</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Social Media Scanning</Label>
                  <p className="text-sm text-gray-500">Include social media platforms in scans</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Data Broker Monitoring</Label>
                  <p className="text-sm text-gray-500">Monitor data broker websites for your information</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose how and when you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-4">Email Notifications</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Trial Ending Soon</Label>
                      <p className="text-sm text-gray-500">Get notified before your trial ends</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Payment Required</Label>
                      <p className="text-sm text-gray-500">Alerts when subscription payment fails</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>New Exposure Alerts</Label>
                      <p className="text-sm text-gray-500">Get notified when new exposures are found</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <Card className="mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold">
                      {isPremium ? 'Premium' : trialActive ? 'Free Trial' : 'Free Plan'}
                    </h3>
                    <Badge className={exempt ? 'bg-green-100 text-green-700' : isPremium ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}>
                      {exempt ? 'Exempt' : isPremium ? 'Active' : trialActive ? 'Trial' : 'Current'}
                    </Badge>
                  </div>
                  <p className="text-gray-600 mb-2">
                    {exempt ? 'You have indefinite premium access.' : null}
                    {trialActive && !exempt
                      ? `Your 3-day trial ends ${trialEndsAt ? new Date(trialEndsAt).toLocaleDateString() : 'soon'}.`
                      : null}
                    {!isPremium && !trialActive && !exempt
                      ? 'Subscribe to continue using the app.'
                      : null}
                  </p>
                  {!isPremium && !exempt && (
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>✓ Monthly scans</li>
                      <li>✓ Basic risk assessment</li>
                      <li>✗ Advanced email search</li>
                      <li>✗ Continuous monitoring</li>
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Upgrade to Premium
              </CardTitle>
              <CardDescription>Get advanced protection and features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="border-2 border-indigo-200 rounded-lg p-6 bg-indigo-50">
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold mb-1">Premium</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">$15</span>
                      <span className="text-gray-600">/month</span>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-6 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>24/7 continuous monitoring</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Unlimited scans</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Advanced email search</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Automated removal requests</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Detailed PDF reports</span>
                    </li>
                  </ul>
                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    onClick={handleUpgrade}
                    disabled={loadingCheckout || (isPremium && !exempt)}
                  >
                    {loadingCheckout ? 'Processing...' : isPremium ? 'Current Plan' : 'Upgrade to Premium'}
                  </Button>
                </div>

                <div className="border-2 rounded-lg p-6">
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold mb-1">Enterprise</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">$99</span>
                      <span className="text-gray-600">/month</span>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-6 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Everything in Premium</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Team monitoring (up to 10 users)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>API access</span>
                    </li>
                  </ul>
                  <Button variant="outline" className="w-full" onClick={() => toast.info('Contact sales@digitalguardian.com')}>
                    Contact Sales
                  </Button>
                </div>
              </div>

              {/* Add card section */}
              <div className="pt-6 border-t">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Method
                </h4>
                <p className="text-sm text-gray-500 mb-4">
                  Add a credit or debit card to subscribe. Payments are processed securely via Stripe.
                </p>
                <Button variant="outline" onClick={handleAddCard} className="mb-4">
                  {showCardForm ? 'Cancel' : 'Add Card'}
                </Button>
                {showCardForm && (
                  <div className="border rounded-lg p-6 bg-gray-50 max-w-md">
                    <StripeCardForm clientSecret={clientSecret} onSuccess={cardFormSuccess} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
