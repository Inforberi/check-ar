import { ArDashboard } from "@/components/ar-dashboard";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const PROJECT_URL = "https://fiftyfourms.com";
const STRAPI_URL = "https://strapi.fiftyfourms.com";

const Page = () => {
  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                AR Model Dashboard
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Тестирование AR-моделей продуктов из Strapi CMS
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="bg-transparent"
              >
                <a
                  href={PROJECT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Проект
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="bg-transparent"
              >
                <a
                  href={STRAPI_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Strapi
                </a>
              </Button>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Connected to Strapi
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6">
        <ArDashboard />
      </div>
    </main>
  );
};

export default Page;
