import { SchoolLayout } from "@/components/school/SchoolLayout";
import SchoolChatKnowledgeTab from "@/components/school/SchoolChatKnowledgeTab";
import SchoolChatInbox from "@/components/school/SchoolChatInbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, BookOpen } from "lucide-react";

export default function SchoolEdleadChat() {
  return (
    <SchoolLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">edLEAD Chat</h1>
          <p className="text-muted-foreground">
            Manage your school's AI chat assistant. Respond to live conversations and train the AI with your school's knowledge.
          </p>
        </div>
        <Tabs defaultValue="conversations" className="w-full">
          <TabsList>
            <TabsTrigger value="conversations" className="flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" /> Conversations
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" /> Knowledge Base
            </TabsTrigger>
          </TabsList>
          <TabsContent value="conversations" className="mt-4">
            <SchoolChatInbox />
          </TabsContent>
          <TabsContent value="knowledge" className="mt-4">
            <SchoolChatKnowledgeTab />
          </TabsContent>
        </Tabs>
      </div>
    </SchoolLayout>
  );
}
