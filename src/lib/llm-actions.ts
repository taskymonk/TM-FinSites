"use server"

import OpenAI from "openai"
import { getAdminSession } from "@/lib/admin-actions"
import { createServerClient } from "@/lib/supabase/server"

const PROXY_URL = "https://integrations.emergentagent.com/llm"
const LLM_KEY = process.env.EMERGENT_LLM_KEY || ""
const APP_URL = process.env.REACT_APP_BACKEND_URL || process.env.APP_URL || ""

function getClient() {
  return new OpenAI({
    apiKey: LLM_KEY,
    baseURL: PROXY_URL,
    defaultHeaders: {
      "x-app-url": APP_URL,
    },
  })
}

export async function generateWebsitePRD(submissionId: string) {
  const session = await getAdminSession()
  if (!session) return { error: "Unauthorized" }

  const supabase = createServerClient()
  const { data: sub, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("submission_id", submissionId)
    .single()

  if (error || !sub) return { error: "Submission not found" }

  const wizardData = (sub.data || {}) as Record<string, unknown>
  const reg = (wizardData.registration || {}) as Record<string, Record<string, string>>
  const svc = (wizardData.services || {}) as Record<string, string[]>
  const design = (wizardData.design || {}) as Record<string, string>

  const prompt = `You are a senior web developer and compliance expert for Indian financial services websites. Generate a detailed Product Requirements Document (PRD) for building a compliant website.

## Client Details
- Name: ${sub.client_name || "N/A"}
- Email: ${sub.client_email || "N/A"}
- Phone: ${sub.client_phone || "N/A"}
- Business Types: ${(sub.business_types || []).join(", ")}
- Reference: ${sub.reference_number}

## Registration Details
${Object.entries(reg).map(([type, fields]) => `### ${type}\n${Object.entries(fields || {}).filter(([,v]) => v).map(([k, v]) => `- ${k.replace(/_/g, " ")}: ${v}`).join("\n")}`).join("\n\n")}

## Services Offered
${Object.entries(svc).map(([type, services]) => `### ${type}\n${(services || []).map(s => `- ${s}`).join("\n")}`).join("\n\n")}

## Design Preferences
- Color Scheme: ${design.colorPreset || "Not specified"}
- Style: ${design.style || "Modern"}
- Tagline: ${design.tagline || "Not specified"}
- Existing Website: ${design.logoUrl || "None"}

## Instructions
Generate a comprehensive PRD in Markdown format that includes:
1. **Project Overview** - Brief summary of the website to be built
2. **Target Audience** - Who will use this website
3. **Required Pages** - List every page needed with descriptions
4. **Compliance Requirements** - Every regulatory requirement for the selected business types (SEBI/AMFI/IRDAI/PFRDA as applicable)
5. **Content Requirements** - What content is needed for each page, including mandatory disclaimers and disclosures
6. **Technical Requirements** - SSL, responsive design, SEO, performance
7. **Design Specifications** - Based on the client's preferences
8. **Mandatory Disclosures** - Full text of all required disclaimers for the business types
9. **Timeline & Milestones** - Suggested project phases

Make it detailed, actionable, and ready for a developer to start building from.`

  try {
    const client = getClient()
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a senior web developer and Indian financial regulatory compliance expert. Generate detailed, actionable PRDs in Markdown format." },
        { role: "user", content: prompt },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    })

    const prd = completion.choices[0]?.message?.content || "Failed to generate PRD"
    return { prd }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "LLM generation failed"
    return { error: msg }
  }
}
