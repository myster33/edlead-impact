import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, PenLine } from "lucide-react";

export const CTASection = () => {
  return (
    <section className="py-20 bg-muted">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-8">
          {/* For Students */}
          <div className="bg-background rounded-2xl p-8 md:p-10 shadow-sm border border-border">
            <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mb-6">
              <Users className="h-7 w-7 text-primary-foreground" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              For Students
            </h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Are you ready to make a difference in your school? Apply to become an edLEAD Captain and develop the leadership skills that will shape your future.
            </p>
            <Link to="/admissions">
              <Button className="gap-2">
                Apply Now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Share Your Story */}
          <div className="bg-primary rounded-2xl p-8 md:p-10 shadow-sm">
            <div className="w-14 h-14 rounded-xl bg-primary-foreground/20 flex items-center justify-center mb-6">
              <PenLine className="h-7 w-7 text-primary-foreground" />
            </div>
            <h3 className="text-2xl font-bold text-primary-foreground mb-4">
              Share Your Story
            </h3>
            <p className="text-primary-foreground/90 mb-6 leading-relaxed">
              Have an inspiring leadership journey to share? Submit your story to edLEAD Stories and inspire the next generation of student leaders.
            </p>
            <Link to="/blog">
              <Button variant="secondary" className="gap-2 bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                Submit Your Story
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
