import { PageHeader } from "@/components/navigation/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowRight, Book, Code, MessageSquare } from "lucide-react"

export default function DocsPage() {
  return (
    <div className="container py-6">
      <PageHeader heading="Documentation" description="Learn how to use and customize your AI chatbot" />

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader>
            <MessageSquare className="h-6 w-6 mb-2 text-primary" />
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Learn the basics of using the AI chatbot</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/docs/introduction"
                  className="text-muted-foreground hover:text-foreground flex items-center justify-between"
                >
                  Introduction
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
              <li>
                <Link
                  href="/docs/quick-start"
                  className="text-muted-foreground hover:text-foreground flex items-center justify-between"
                >
                  Quick Start Guide
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
              <li>
                <Link
                  href="/docs/features"
                  className="text-muted-foreground hover:text-foreground flex items-center justify-between"
                >
                  Key Features
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <Code className="h-6 w-6 mb-2 text-primary" />
            <CardTitle>Developer Guide</CardTitle>
            <CardDescription>Technical documentation for developers</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/docs/api-reference"
                  className="text-muted-foreground hover:text-foreground flex items-center justify-between"
                >
                  API Reference
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
              <li>
                <Link
                  href="/docs/customization"
                  className="text-muted-foreground hover:text-foreground flex items-center justify-between"
                >
                  Customization
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
              <li>
                <Link
                  href="/docs/deployment"
                  className="text-muted-foreground hover:text-foreground flex items-center justify-between"
                >
                  Deployment
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <Book className="h-6 w-6 mb-2 text-primary" />
            <CardTitle>Tutorials</CardTitle>
            <CardDescription>Step-by-step guides for common tasks</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/docs/tutorials/custom-model"
                  className="text-muted-foreground hover:text-foreground flex items-center justify-between"
                >
                  Using Custom Models
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
              <li>
                <Link
                  href="/docs/tutorials/integrations"
                  className="text-muted-foreground hover:text-foreground flex items-center justify-between"
                >
                  Third-party Integrations
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
              <li>
                <Link
                  href="/docs/tutorials/advanced"
                  className="text-muted-foreground hover:text-foreground flex items-center justify-between"
                >
                  Advanced Techniques
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

