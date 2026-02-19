import { OnlineAdmin } from "@/hooks/use-online-presence";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface OnlineAdminsPanelProps {
  admins: OnlineAdmin[];
  currentAdminId?: string;
  /** compact: just stacked avatars with a dot; full: list with names */
  variant?: "compact" | "full";
}

function getInitials(admin: OnlineAdmin) {
  return (admin.full_name || admin.email)
    .split(/[\s@]/)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");
}

export function OnlineAdminsPanel({
  admins,
  currentAdminId,
  variant = "compact",
}: OnlineAdminsPanelProps) {
  if (admins.length === 0) return null;

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1">
          {admins.slice(0, 5).map((admin) => (
            <Tooltip key={admin.id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="h-6 w-6 ring-2 ring-background">
                    {admin.profile_picture_url && (
                      <AvatarImage src={admin.profile_picture_url} alt={admin.full_name || admin.email} />
                    )}
                    <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                      {getInitials(admin)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background" style={{ backgroundColor: "hsl(142 71% 45%)" }} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="font-medium">{admin.full_name || admin.email}</p>
                <p className="text-xs text-muted-foreground capitalize">{admin.role}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {admins.length > 5 && (
            <span className="text-xs text-muted-foreground ml-1">+{admins.length - 5}</span>
          )}
        </div>
      </TooltipProvider>
    );
  }

  // full variant
  return (
    <div className="space-y-2">
      {admins.map((admin) => (
        <div key={admin.id} className="flex items-center gap-2">
          <div className="relative shrink-0">
            <Avatar className="h-7 w-7">
              {admin.profile_picture_url && (
                <AvatarImage src={admin.profile_picture_url} alt={admin.full_name || admin.email} />
              )}
              <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                {getInitials(admin)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background" style={{ backgroundColor: "hsl(142 71% 45%)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate text-foreground">
              {admin.full_name || admin.email}
              {admin.id === currentAdminId && (
                <span className="text-muted-foreground font-normal"> (you)</span>
              )}
            </p>
            <p className="text-[10px] text-muted-foreground capitalize">{admin.role}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
