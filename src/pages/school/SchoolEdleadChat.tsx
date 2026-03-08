import { SchoolLayout } from "@/components/school/SchoolLayout";
import SchoolChatKnowledgeTab from "@/components/school/SchoolChatKnowledgeTab";

export default function SchoolEdleadChat() {
  return (
    <SchoolLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">edLEAD Chat</h1>
          <p className="text-muted-foreground">
            Manage your school's AI chat assistant. Add knowledge articles to train it for your school.
          </p>
        </div>
        <SchoolChatKnowledgeTab />
      </div>
    </SchoolLayout>
  );
}
