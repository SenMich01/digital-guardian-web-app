import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Mail,
  ExternalLink,
  Shield,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';
import { scanApi, type Exposure } from '@/lib/api';

function getStepsForExposure(exposure: Exposure) {
  const source = (exposure.source || exposure.breach_name || '').toLowerCase();
  if (source.includes('linkedin')) {
    return [
      {
        title: 'Make your email private on LinkedIn',
        description: 'Change your privacy settings to hide your email from public view',
        instructions: [
          'Log in to your LinkedIn account',
          'Click on "Me" icon at the top of your homepage',
          'Select "Settings & Privacy"',
          'Go to "Visibility" section',
          'Click "Edit your public profile"',
          'Toggle off "Email Address" visibility',
          'Save changes',
        ],
        estimatedTime: '5 minutes',
        difficulty: 'Easy',
      },
    ];
  }
  if (source.includes('facebook')) {
    return [
      {
        title: 'Remove personal info from Facebook',
        description: 'Delete or hide your contact info from your Facebook profile',
        instructions: [
          'Log in to Facebook',
          'Go to your profile → About',
          'Select "Contact and Basic Info"',
          'Edit visibility or remove your phone/email',
          'Save changes',
        ],
        estimatedTime: '5 minutes',
        difficulty: 'Easy',
      },
    ];
  }
  if (source.includes('adobe') || source.includes('collection')) {
    return [
      {
        title: 'Change your password',
        description: 'If you used this email on Adobe, change your password immediately',
        instructions: [
          'Go to Adobe account settings',
          'Change your password to a strong, unique one',
          'Enable two-factor authentication if available',
        ],
        estimatedTime: '5 minutes',
        difficulty: 'Easy',
      },
    ];
  }
  // Generic steps for any breach
  return [
    {
      title: 'Change your password',
      description: `If you had an account on ${exposure.source}, change your password immediately`,
      instructions: [
        `Visit ${exposure.source} and log in`,
        'Go to account/security settings',
        'Change your password to a strong, unique password',
        'Use a password manager to generate a secure password',
      ],
      estimatedTime: '5 minutes',
      difficulty: 'Easy',
    },
    {
      title: 'Enable two-factor authentication',
      description: 'Add an extra layer of security to your account',
      instructions: [
        'Go to account security settings',
        'Enable 2FA using an authenticator app (not SMS)',
        'Save your backup codes securely',
      ],
      estimatedTime: '10 minutes',
      difficulty: 'Medium',
    },
    {
      title: 'Monitor for suspicious activity',
      description: 'Watch for phishing attempts and unauthorized access',
      instructions: [
        'Check your email for phishing attempts',
        'Review login history on important accounts',
        'Consider a credit freeze if sensitive data was exposed',
      ],
      estimatedTime: '15 minutes',
      difficulty: 'Easy',
    },
  ];
}

export function Remediation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exposure, setExposure] = useState<Exposure | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [generatedEmail, setGeneratedEmail] = useState('');

  useEffect(() => {
    if (!id) return;
    scanApi
      .result(id)
      .then(setExposure)
      .catch(() => setExposure(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse text-gray-500">Loading remediation guide...</div>
      </div>
    );
  }

  if (!exposure) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500 mb-4">Exposure not found or you don't have access.</p>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const steps = getStepsForExposure(exposure);

  const generateRemovalEmail = () => {
    const email = `Subject: Request for Personal Information Removal

Dear ${exposure.source} Privacy Team,

I am writing to request the removal of my personal information from your platform/database. I have discovered that the following information is publicly visible:

Data Type: ${exposure.type}
Information: ${exposure.data}
Date Found: ${exposure.date}

Under data protection regulations (GDPR/CCPA), I am exercising my right to erasure. Please remove this information from your systems and confirm the deletion within 30 days.

Thank you for your prompt attention to this matter.

Best regards,
[Your Name]
[Your Contact Information]`;
    setGeneratedEmail(email);
    toast.success('Removal request email generated!');
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(generatedEmail);
    toast.success('Email copied to clipboard!');
  };

  const toggleStep = (index: number) => {
    if (completedSteps.includes(index)) {
      setCompletedSteps(completedSteps.filter((i) => i !== index));
    } else {
      setCompletedSteps([...completedSteps, index]);
      toast.success('Step marked as complete!');
    }
  };

  const getRiskColor = (risk: string) => {
    const colors = {
      high: 'text-red-600 bg-red-50 border-red-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      low: 'text-green-600 bg-green-50 border-green-200',
    };
    return colors[(risk || 'medium') as keyof typeof colors];
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      Easy: 'bg-green-100 text-green-700',
      Medium: 'bg-yellow-100 text-yellow-700',
      Hard: 'bg-red-100 text-red-700',
    };
    return colors[difficulty as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Results
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="mb-2">Remediation Plan</CardTitle>
              <p className="text-gray-600">Step-by-step guide to protect your privacy</p>
            </div>
            <Badge variant="outline" className={getRiskColor(exposure.risk)}>
              {(exposure.risk || 'medium').toUpperCase()} RISK
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Data Type</p>
                <p className="font-medium">{exposure.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Source</p>
                <p className="font-medium">{exposure.source}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Exposed Data</p>
                <p className="font-medium">{exposure.data}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Detected On</p>
                <p className="font-medium">{exposure.date}</p>
              </div>
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
        </CardContent>
      </Card>

      <Card className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium mb-1">Your Progress</h3>
              <p className="text-sm text-gray-600">
                {completedSteps.length} of {steps.length} steps completed
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-semibold text-indigo-600">
                {Math.round((completedSteps.length / steps.length) * 100)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Remediation Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {steps.map((step: { title: string; description: string; instructions: string[]; estimatedTime: string; difficulty: string }, index: number) => (
              <AccordionItem key={index} value={`step-${index}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        completedSteps.includes(index) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {completedSteps.includes(index) ? <CheckCircle2 className="w-5 h-5" /> : <span>{index + 1}</span>}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{step.title}</h4>
                      <p className="text-sm text-gray-500">{step.description}</p>
                    </div>
                    <div className="flex gap-2 mr-2">
                      <Badge variant="outline" className={getDifficultyColor(step.difficulty)}>
                        {step.difficulty}
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {step.estimatedTime}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-11 pr-4 pt-2">
                    <ol className="space-y-3 mb-4">
                      {step.instructions.map((instruction: string, i: number) => (
                        <li key={i} className="flex gap-3">
                          <span className="text-indigo-600 font-medium flex-shrink-0">{i + 1}.</span>
                          <span className="text-gray-700">{instruction}</span>
                        </li>
                      ))}
                    </ol>
                    <Button
                      onClick={() => toggleStep(index)}
                      variant={completedSteps.includes(index) ? 'outline' : 'default'}
                      className={completedSteps.includes(index) ? '' : 'bg-indigo-600 hover:bg-indigo-700'}
                    >
                      {completedSteps.includes(index) ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Completed
                        </>
                      ) : (
                        'Mark as Complete'
                      )}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Automated Removal Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Generate a professional email to request removal of your data from {exposure.source}.
          </p>
          {!generatedEmail ? (
            <Button onClick={generateRemovalEmail}>
              <Mail className="w-4 h-4 mr-2" />
              Generate Removal Email
            </Button>
          ) : (
            <div className="space-y-4">
              <Textarea value={generatedEmail} onChange={(e) => setGeneratedEmail(e.target.value)} rows={15} className="font-mono text-sm" />
              <div className="flex gap-2">
                <Button onClick={copyEmail}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy to Clipboard
                </Button>
                <Button variant="outline" onClick={() => setGeneratedEmail('')}>
                  Reset
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Additional Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <a
              href="https://www.privacyrights.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-medium">Privacy Rights Clearinghouse</p>
                <p className="text-sm text-gray-500">Learn about your privacy rights</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
            <a
              href="https://www.eff.org/issues/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-medium">Electronic Frontier Foundation</p>
                <p className="text-sm text-gray-500">Digital privacy guides and tools</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
