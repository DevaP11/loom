"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FormSectionComponent } from "@/components/form-section"
import { Send, FileJson, Upload } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export type FieldType = "string" | "number" | "boolean" | "array"

export interface FormField {
  id: string
  name: string
  type: FieldType
  value: string | number | boolean | number[]
  comment?: string // Added comment support
}

export interface FormSection {
  id: string
  name: string
  fields: FormField[]
  subsections: FormSection[]
}

export type CommentsMap = Record<string, string>

interface DynamicFormBuilderProps {
  initialConfig?: Record<string, unknown>
  comments?: CommentsMap
}

function getFieldType(value: unknown): FieldType {
  if (typeof value === "boolean") return "boolean"
  if (typeof value === "number") return "number"
  if (Array.isArray(value)) return "array"
  return "string"
}

function getComment(comments: CommentsMap, path: string): string | undefined {
  return comments[path]
}

function parseConfigToSections(
  config: Record<string, unknown>,
  comments: CommentsMap,
  parentPath = "",
): { generalFields: FormField[]; sections: FormSection[] } {
  const generalFields: FormField[] = []
  const sections: FormSection[] = []

  Object.entries(config).forEach(([key, value]) => {
    const currentPath = parentPath ? `${parentPath}.${key}` : key

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      // Nested object becomes a section
      const nested = parseConfigToSections(value as Record<string, unknown>, comments, currentPath)

      const section: FormSection = {
        id: `section-${currentPath.replace(/\./g, "-")}`,
        name: key,
        fields: nested.generalFields,
        subsections: nested.sections,
      }
      sections.push(section)
    } else {
      // Primitive or array becomes a field
      const field: FormField = {
        id: `field-${currentPath.replace(/\./g, "-")}`,
        name: key,
        type: getFieldType(value),
        value: Array.isArray(value) ? value : (value as string | number | boolean),
        comment: getComment(comments, currentPath),
      }
      generalFields.push(field)
    }
  })

  return { generalFields, sections }
}

function sectionsToConfig(sections: FormSection[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  sections.forEach((section) => {
    if (section.name === "General") {
      // General section fields go to root level
      section.fields.forEach((field) => {
        result[field.name] = formatFieldValue(field)
      })
    } else {
      // Other sections become nested objects
      const sectionData: Record<string, unknown> = {}

      section.fields.forEach((field) => {
        sectionData[field.name] = formatFieldValue(field)
      })

      // Recursively handle subsections
      if (section.subsections.length > 0) {
        const nestedData = sectionsToConfig(section.subsections)
        Object.assign(sectionData, nestedData)
      }

      result[section.name] = sectionData
    }
  })

  return result
}

function formatFieldValue(field: FormField): unknown {
  switch (field.type) {
    case "number":
      return Number(field.value) || 0
    case "boolean":
      return Boolean(field.value)
    case "array":
      if (Array.isArray(field.value)) return field.value
      // Parse string to array if needed
      if (typeof field.value === "string") {
        try {
          return JSON.parse(field.value)
        } catch {
          return field.value.split(",").map((v) => {
            const num = Number(v.trim())
            return isNaN(num) ? v.trim() : num
          })
        }
      }
      return [field.value]
    default:
      return String(field.value)
  }
}

const exampleConfig: Record<string, unknown> = {
  CONFIG_KEY1: "random_string",
  CONFIG_KEY2: true,
  CONFIG_key3: {
    CHILD_1: 12,
    CHILD_2: [3, 4, 5],
  },
  Header: {
    Type: "Invoice",
    Number: 6496721,
    DateIssued: "30/11/2018",
    DateDue: "31/12/2018",
  },
  Company: {
    Name: "Abc company",
    Tax: "",
    Contact: {
      Email: "",
      Phone: "",
    },
  },
}

const exampleComments: CommentsMap = {
  CONFIG_KEY1: "Primary configuration string",
  CONFIG_KEY2: "Enable or disable feature flag",
  "CONFIG_key3.CHILD_1": "Numeric threshold value",
  "CONFIG_key3.CHILD_2": "Array of priority levels",
  "Header.Type": "Document type (Invoice, Quote, etc.)",
  "Header.Number": "Unique document number",
  "Company.Name": "Legal company name",
  "Company.Contact.Email": "Primary contact email address",
}

export function DynamicFormBuilder({ initialConfig, comments }: DynamicFormBuilderProps) {
  const [sections, setSections] = useState<FormSection[]>([])
  const [commentsMap, setCommentsMap] = useState<CommentsMap>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [configInput, setConfigInput] = useState("")
  const [commentsInput, setCommentsInput] = useState("")

  useEffect(() => {
    const config = initialConfig || exampleConfig
    const commentData = comments || exampleComments
    setCommentsMap(commentData)

    const { generalFields, sections: parsedSections } = parseConfigToSections(config, commentData)

    // Create General section for root-level primitives
    const allSections: FormSection[] = []
    if (generalFields.length > 0) {
      allSections.push({
        id: "general",
        name: "General",
        fields: generalFields,
        subsections: [],
      })
    }
    allSections.push(...parsedSections)

    setSections(allSections)
  }, [initialConfig, comments])

  const handleImport = () => {
    try {
      const config = JSON.parse(configInput || "{}")
      let commentData: CommentsMap = {}

      if (commentsInput.trim()) {
        commentData = JSON.parse(commentsInput)
      }

      setCommentsMap(commentData)
      const { generalFields, sections: parsedSections } = parseConfigToSections(config, commentData)

      const allSections: FormSection[] = []
      if (generalFields.length > 0) {
        allSections.push({
          id: "general",
          name: "General",
          fields: generalFields,
          subsections: [],
        })
      }
      allSections.push(...parsedSections)

      setSections(allSections)
      setIsImportOpen(false)
      setConfigInput("")
      setCommentsInput("")
    } catch (error) {
      alert("Invalid JSON format. Please check your input.")
    }
  }

  const buildJson = (): Record<string, unknown> => {
    return sectionsToConfig(sections)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    const jsonData = buildJson()

    try {
      const response = await fetch("http://localhost:3000/config/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonData),
      })

      if (response.ok) {
        alert("Configuration uploaded successfully!")
      } else {
        alert("Failed to upload configuration")
      }
    } catch (error) {
      console.error("Upload error:", error)
      alert("Error uploading configuration. Make sure the server is running.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileJson className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-semibold">Dynamic Form Builder</h1>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import JSON
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Configuration</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="configJson">Configuration JSON</Label>
                  <Textarea
                    id="configJson"
                    value={configInput}
                    onChange={(e) => setConfigInput(e.target.value)}
                    placeholder='{"CONFIG_KEY1": "value", "CONFIG_key3": {"CHILD_1": 12}}'
                    className="font-mono text-sm max-h-[150px]"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="commentsJson">Comments JSON (optional)</Label>
                  <Textarea
                    id="commentsJson"
                    value={commentsInput}
                    onChange={(e) => setCommentsInput(e.target.value)}
                    placeholder='{"CONFIG_KEY1": "Description for KEY1", "CONFIG_key3.CHILD_1": "Description"}'
                    className="font-mono text-sm min-h-[100px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImport}>Import</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? "Uploading..." : "Submit Configuration"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <FormSectionComponent sections={sections} onUpdate={setSections} commentsMap={commentsMap} />
      </div>

      <div className="mt-8 p-4 bg-card rounded-lg border">
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Preview JSON Output</h3>
        <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
          {JSON.stringify(buildJson(), null, 2)}
        </pre>
      </div>
    </div>
  )
}
