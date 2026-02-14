import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import edleadLogo from "@/assets/edlead-logo.png";

interface ApplicationData {
  id: string;
  reference_number?: string;
  full_name: string;
  student_email: string;
  student_phone?: string;
  date_of_birth?: string;
  gender?: string;
  school_name: string;
  school_address: string;
  school_email?: string;
  school_contact?: string;
  grade: string;
  province: string;
  country?: string;
  status: string;
  created_at: string;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  parent_relationship?: string;
  nominating_teacher?: string;
  teacher_position?: string;
  project_idea?: string;
  project_problem?: string;
  project_benefit?: string;
  project_team?: string;
  why_edlead?: string;
  leadership_meaning?: string;
  school_challenge?: string;
  school_activities?: string;
  academic_importance?: string;
  manage_schoolwork?: string;
  learner_photo_url?: string;
  video_link?: string;
  cohort_id?: string;
}

interface ApplicationDetailViewProps {
  application: ApplicationData;
  cohortName?: string;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case "approved": return { label: "Approved", variant: "default" as const, className: "bg-green-500/10 text-green-600" };
    case "rejected": return { label: "Rejected", variant: "destructive" as const, className: "" };
    case "cancelled": return { label: "Cancelled", variant: "outline" as const, className: "bg-muted" };
    default: return { label: "Pending", variant: "secondary" as const, className: "" };
  }
};

const InfoRow = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <div className="flex gap-2 py-1.5">
      <dt className="text-muted-foreground min-w-[140px] text-sm font-medium">{label}</dt>
      <dd className="text-sm flex-1">{value}</dd>
    </div>
  );
};

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-2 mt-6 mb-3">
    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">{title}</h3>
    <div className="flex-1 h-px bg-border" />
  </div>
);

const EssayBlock = ({ title, content }: { title: string; content?: string | null }) => {
  if (!content) return null;
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold mb-1">{title}</p>
      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-md p-3 border">
        {content}
      </p>
    </div>
  );
};

export function ApplicationDetailView({ application, cohortName }: ApplicationDetailViewProps) {
  const statusConfig = getStatusConfig(application.status);
  const refNumber = application.reference_number || application.id.slice(0, 8).toUpperCase();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="application-letterhead">
      {/* Print-only styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .application-letterhead, .application-letterhead * { visibility: visible; }
          .application-letterhead { 
            position: absolute; left: 0; top: 0; width: 100%;
            padding: 20mm;
            font-size: 11px;
          }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
        }
      `}</style>

      {/* Letterhead Header */}
      <div className="border-b-2 border-primary pb-4 mb-6">
        <div className="flex items-start justify-between">
          <img src={edleadLogo} alt="edLEAD" className="h-12 w-auto" />
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Application Reference</p>
            <code className="text-sm font-mono font-bold text-primary">{refNumber}</code>
          </div>
        </div>
      </div>

      {/* Document Title & Status Bar */}
      <div className="flex items-center justify-between mb-6 bg-muted/50 rounded-lg px-4 py-3 border">
        <div>
          <h2 className="text-base font-bold">Application Form</h2>
          <p className="text-xs text-muted-foreground">
            Submitted on {format(new Date(application.created_at), "dd MMMM yyyy 'at' HH:mm")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {cohortName && (
            <Badge variant="outline" className="text-xs">{cohortName}</Badge>
          )}
          <Badge variant={statusConfig.variant} className={statusConfig.className}>
            {statusConfig.label}
          </Badge>
          <Button variant="outline" size="sm" className="no-print" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
        </div>
      </div>

      {/* Learner Photo + Key Info */}
      <div className="flex gap-6 items-start mb-2">
        {application.learner_photo_url && (
          <div className="shrink-0">
            <div className="w-28 h-36 rounded-lg overflow-hidden border-2 border-primary/20 shadow-sm">
              <img
                src={application.learner_photo_url}
                alt={`${application.full_name}'s photo`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
        <div className="flex-1 grid grid-cols-2 gap-x-8">
          <SectionHeader title="Learner Information" />
          <div className="col-span-2" />
          <dl>
            <InfoRow label="Full Name" value={application.full_name} />
            <InfoRow label="Email" value={application.student_email} />
            <InfoRow label="Phone" value={application.student_phone} />
          </dl>
          <dl>
            <InfoRow label="Date of Birth" value={application.date_of_birth} />
            <InfoRow label="Gender" value={application.gender} />
            <InfoRow label="Country" value={application.country} />
          </dl>
        </div>
      </div>

      <Separator className="my-4" />

      {/* School Information */}
      <div className="grid grid-cols-2 gap-x-8">
        <SectionHeader title="School Information" />
        <div className="col-span-2" />
        <dl>
          <InfoRow label="School Name" value={application.school_name} />
          <InfoRow label="School Address" value={application.school_address} />
          <InfoRow label="School Email" value={application.school_email} />
        </dl>
        <dl>
          <InfoRow label="School Contact" value={application.school_contact} />
          <InfoRow label="Grade" value={application.grade} />
          <InfoRow label="Province" value={application.province} />
        </dl>
      </div>

      <Separator className="my-4" />

      {/* Parent/Guardian */}
      <div className="grid grid-cols-2 gap-x-8">
        <SectionHeader title="Parent / Guardian" />
        <div className="col-span-2" />
        <dl>
          <InfoRow label="Name" value={application.parent_name} />
          <InfoRow label="Email" value={application.parent_email} />
        </dl>
        <dl>
          <InfoRow label="Phone" value={application.parent_phone} />
          <InfoRow label="Relationship" value={application.parent_relationship} />
        </dl>
      </div>

      <Separator className="my-4" />

      {/* Teacher Nomination */}
      <div className="grid grid-cols-2 gap-x-8">
        <SectionHeader title="Teacher Nomination" />
        <div className="col-span-2" />
        <dl>
          <InfoRow label="Nominating Teacher" value={application.nominating_teacher} />
        </dl>
        <dl>
          <InfoRow label="Position" value={application.teacher_position} />
        </dl>
      </div>

      {/* Essay Sections */}
      {(application.why_edlead || application.leadership_meaning || application.academic_importance || application.manage_schoolwork) && (
        <>
          <Separator className="my-4" />
          <SectionHeader title="Motivation & Leadership" />
          <EssayBlock title="Why edLEAD?" content={application.why_edlead} />
          <EssayBlock title="What Leadership Means to Me" content={application.leadership_meaning} />
          <EssayBlock title="Importance of Academics" content={application.academic_importance} />
          <EssayBlock title="Managing Schoolwork" content={application.manage_schoolwork} />
          <EssayBlock title="School Activities" content={application.school_activities} />
          <EssayBlock title="School Challenge" content={application.school_challenge} />
        </>
      )}

      {/* School Impact Project */}
      {(application.project_idea || application.project_problem || application.project_benefit) && (
        <>
          <Separator className="my-4" />
          <SectionHeader title="School Impact Project" />
          <EssayBlock title="Project Idea" content={application.project_idea} />
          <EssayBlock title="Problem Being Addressed" content={application.project_problem} />
          <EssayBlock title="Benefit to School / Community" content={application.project_benefit} />
          <EssayBlock title="Project Team" content={application.project_team} />
        </>
      )}

      {/* Video Link */}
      {application.video_link && (
        <>
          <Separator className="my-4" />
          <SectionHeader title="Additional Materials" />
          <InfoRow label="Video Link" value={application.video_link} />
        </>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t-2 border-primary/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <p>edLEAD Africa — Confidential Application Document</p>
          <p>Ref: {refNumber} • Generated {format(new Date(), "dd MMM yyyy")}</p>
        </div>
      </div>
    </div>
  );
}
