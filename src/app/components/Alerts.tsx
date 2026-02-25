import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { 
  Bell, 
  Mail, 
  Phone, 
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Settings as SettingsIcon
} from 'lucide-react';

// Mock alerts data
const mockAlerts = [
  {
    id: 1,
    type: 'new_exposure',
    severity: 'high',
    title: 'New Phone Number Exposure',
    description: 'Your phone number was found on a data broker website (FastPeopleSearch)',
    data: '+1 (555) 123-4567',
    timestamp: '2026-02-24 14:30',
    read: false
  },
  {
    id: 2,
    type: 'risk_increase',
    severity: 'medium',
    title: 'Risk Level Increased',
    description: 'Your email address on LinkedIn now has medium risk due to recent data breach reports',
    data: 'john.doe@email.com',
    timestamp: '2026-02-23 09:15',
    read: false
  },
  {
    id: 3,
    type: 'new_exposure',
    severity: 'high',
    title: 'Address Found on Public Records',
    description: 'Your home address was detected on a public records database',
    data: '123 Main St, City, State',
    timestamp: '2026-02-22 16:45',
    read: true
  },
  {
    id: 4,
    type: 'success',
    severity: 'low',
    title: 'Successfully Removed',
    description: 'Your data removal request for Twitter/X has been processed',
    data: 'j.doe@company.com',
    timestamp: '2026-02-21 11:20',
    read: true
  },
  {
    id: 5,
    type: 'new_exposure',
    severity: 'medium',
    title: 'Email Found on Forum',
    description: 'Your personal email was mentioned in a public forum post',
    data: 'johndoe1985@gmail.com',
    timestamp: '2026-02-20 08:00',
    read: true
  },
  {
    id: 6,
    type: 'scheduled_scan',
    severity: 'low',
    title: 'Scheduled Scan Complete',
    description: 'Weekly scan completed. 2 new sources checked, no new exposures found.',
    data: null,
    timestamp: '2026-02-19 02:00',
    read: true
  }
];

export function Alerts() {
  const [alerts, setAlerts] = useState(mockAlerts);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const markAsRead = (id: number) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, read: true } : alert
    ));
  };

  const markAllAsRead = () => {
    setAlerts(alerts.map(alert => ({ ...alert, read: true })));
  };

  const filteredAlerts = showUnreadOnly 
    ? alerts.filter(alert => !alert.read)
    : alerts;

  const unreadCount = alerts.filter(alert => !alert.read).length;

  const getSeverityColor = (severity: string) => {
    const colors = {
      high: 'bg-red-100 text-red-700 border-red-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      low: 'bg-green-100 text-green-700 border-green-200'
    };
    return colors[severity as keyof typeof colors];
  };

  const getAlertIcon = (type: string, severity: string) => {
    switch (type) {
      case 'new_exposure':
        return <AlertTriangle className={`w-5 h-5 ${severity === 'high' ? 'text-red-500' : 'text-yellow-500'}`} />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'risk_increase':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'scheduled_scan':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Alerts & Notifications</h1>
        <p className="text-gray-600">
          {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Alert Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Alert Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-gray-500">Receive alerts via email</p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Real-time Alerts</Label>
              <p className="text-sm text-gray-500">Get notified immediately when new exposures are found</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Weekly Digest</Label>
              <p className="text-sm text-gray-500">Receive a weekly summary of all alerts</p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>High Risk Only</Label>
              <p className="text-sm text-gray-500">Only receive alerts for high-risk exposures</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Filter Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Switch
            checked={showUnreadOnly}
            onCheckedChange={setShowUnreadOnly}
          />
          <Label>Show unread only</Label>
        </div>
        
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <Card 
            key={alert.id} 
            className={`transition-all ${!alert.read ? 'border-indigo-300 bg-indigo-50/30' : 'hover:shadow-md'}`}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {getAlertIcon(alert.type, alert.severity)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{alert.title}</h3>
                        {!alert.read && (
                          <Badge className="bg-indigo-600 text-white">New</Badge>
                        )}
                        <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                      {alert.data && (
                        <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                          {alert.data}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {alert.timestamp}
                    </p>
                    {!alert.read && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => markAsRead(alert.id)}
                      >
                        Mark as Read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredAlerts.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {showUnreadOnly ? 'No unread alerts' : 'No alerts yet'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
