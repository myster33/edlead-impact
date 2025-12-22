import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { useTypingAnimation } from "@/hooks/use-typing-animation";

interface ApplicationStatus {
  referenceNumber: string;
  status: string;
  submittedAt: string;
  applicantFirstName: string;
}

const CheckStatus = () => {
  const { displayedText: animatedTitle } = useTypingAnimation("Check Application Status", 50);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!referenceNumber.trim()) {
      toast({
        title: "Reference Required",
        description: "Please enter your application reference number.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setApplicationStatus(null);

    try {
      const { data, error } = await supabase.functions.invoke('check-application-status', {
        body: { referenceNumber: referenceNumber.trim() }
      });

      if (error) {
        throw new Error(error.message || "Failed to check status");
      }

      if (data.error) {
        toast({
          title: "Application Not Found",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setApplicationStatus(data.application);
    } catch (error: any) {
      console.error("Status check error:", error);
      toast({
        title: "Error",
        description: "Failed to check application status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return {
          icon: <CheckCircle className="h-8 w-8 text-green-500" />,
          variant: "default" as const,
          label: "Approved",
          description: "Congratulations! Your application has been approved. You will receive further instructions via email.",
          bgColor: "bg-green-50 border-green-200"
        };
      case 'rejected':
        return {
          icon: <XCircle className="h-8 w-8 text-destructive" />,
          variant: "destructive" as const,
          label: "Not Selected",
          description: "Thank you for your interest. Unfortunately, your application was not selected this time. We encourage you to apply again in the future.",
          bgColor: "bg-red-50 border-red-200"
        };
      case 'under_review':
        return {
          icon: <Clock className="h-8 w-8 text-amber-500" />,
          variant: "secondary" as const,
          label: "Under Review",
          description: "Your application is currently being reviewed by our team. We will notify you once a decision has been made.",
          bgColor: "bg-amber-50 border-amber-200"
        };
      default:
        return {
          icon: <Clock className="h-8 w-8 text-primary" />,
          variant: "outline" as const,
          label: "Pending",
          description: "Your application has been received and is awaiting review. Thank you for your patience.",
          bgColor: "bg-primary/5 border-primary/20"
        };
    }
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-secondary py-16 md:py-24">
        <div className="container">
          <h1 className="text-4xl md:text-5xl font-bold text-secondary-foreground mb-4">
            {animatedTitle}
            <span className="animate-pulse">|</span>
          </h1>
          <p className="text-xl text-secondary-foreground/80 max-w-2xl">
            Enter your application reference number to check the status of your edLEAD application.
          </p>
        </div>
      </section>

      {/* Status Check Section */}
      <section className="py-16 md:py-24">
        <div className="container max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Find Your Application
              </CardTitle>
              <CardDescription>
                Your reference number was provided when you submitted your application and sent to your email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    type="text"
                    placeholder="Enter reference number (e.g., ABC12345)"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value.toUpperCase())}
                    className="flex-1 uppercase"
                    maxLength={12}
                  />
                  <Button type="submit" disabled={isLoading} className="sm:w-auto">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Check Status
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Status Result */}
          {applicationStatus && (
            <Card className={`mt-8 ${getStatusInfo(applicationStatus.status).bgColor}`}>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  {getStatusInfo(applicationStatus.status).icon}
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Hello, {applicationStatus.applicantFirstName}!
                    </p>
                    <h3 className="text-xl font-semibold mb-2">
                      Application Status
                    </h3>
                    <Badge variant={getStatusInfo(applicationStatus.status).variant} className="text-sm px-4 py-1">
                      {getStatusInfo(applicationStatus.status).label}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground max-w-md">
                    {getStatusInfo(applicationStatus.status).description}
                  </p>

                  <div className="pt-4 border-t border-border/50 w-full space-y-2 text-sm text-muted-foreground">
                    <p>
                      <strong>Reference:</strong> {applicationStatus.referenceNumber}
                    </p>
                    <p>
                      <strong>Submitted:</strong> {new Date(applicationStatus.submittedAt).toLocaleDateString('en-ZA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help Section */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              Can't find your reference number? Check your email inbox for the confirmation message sent after submission.
            </p>
            <p className="mt-2">
              Need help? <a href="/contact" className="text-primary hover:underline">Contact us</a>
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default CheckStatus;
