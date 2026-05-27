// Resume anti-hallucination validator
// Validates AI-generated resume fields against the source profile data

interface ResumeData {
  name?: string
  email?: string
  phone?: string
  experiences?: Array<{ company?: string; title?: string; startDate?: string; endDate?: string }>
  education?: Array<{ school?: string; degree?: string; major?: string }>
  skills?: string[]
  [key: string]: unknown
}

interface ProfileData {
  basicInfo?: { name?: string; email?: string; phone?: string }
  experiences?: Array<{ company?: string; title?: string; startDate?: string; endDate?: string }>
  education?: Array<{ school?: string; degree?: string; major?: string }>
  skills?: Array<{ name?: string } | string>
  [key: string]: unknown
}

export interface ResumeValidationResult {
  valid: boolean
  invalidatedFields: string[]
}

export function validateResumeContent(
  resume: ResumeData,
  profile: ProfileData,
): ResumeValidationResult {
  const invalidated: string[] = []

  // Collect profile values for loose matching
  const profileText = JSON.stringify(profile).toLowerCase()

  // Check basic identity fields
  if (resume.name) {
    const profileName = profile.basicInfo?.name ?? ''
    if (profileName && !looslyMatches(resume.name, profileName)) {
      invalidated.push(`name（AI生成：${resume.name}，檔案庫：${profileName}）`)
    }
  }

  // Check each experience company/title
  const profileExps = profile.experiences ?? []
  for (const [i, exp] of (resume.experiences ?? []).entries()) {
    if (exp.company && profileExps.length > 0) {
      const found = profileExps.some(
        (pe) => pe.company && looslyMatches(exp.company!, pe.company)
      )
      if (!found && !profileText.includes(exp.company.toLowerCase())) {
        invalidated.push(`experiences[${i}].company（"${exp.company}" 不在檔案庫中）`)
      }
    }
  }

  // Check each education school
  const profileEdus = profile.education ?? []
  for (const [i, edu] of (resume.education ?? []).entries()) {
    if (edu.school && profileEdus.length > 0) {
      const found = profileEdus.some(
        (pe) => pe.school && looslyMatches(edu.school!, pe.school)
      )
      if (!found && !profileText.includes(edu.school.toLowerCase())) {
        invalidated.push(`education[${i}].school（"${edu.school}" 不在檔案庫中）`)
      }
    }
  }

  // Check skills not hallucinated
  const profileSkillNames = (profile.skills ?? [])
    .map((s) => (typeof s === 'string' ? s : s.name ?? ''))
    .filter(Boolean)
    .map((s) => s.toLowerCase())

  if (profileSkillNames.length > 0) {
    for (const skill of resume.skills ?? []) {
      const skillLower = skill.toLowerCase()
      if (
        !profileSkillNames.some((ps) => ps.includes(skillLower) || skillLower.includes(ps)) &&
        !profileText.includes(skillLower)
      ) {
        invalidated.push(`skills（"${skill}" 不在檔案庫中）`)
      }
    }
  }

  return { valid: invalidated.length === 0, invalidatedFields: invalidated }
}

function looslyMatches(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[\s\-_.,]/g, '')
  return normalize(a) === normalize(b) || normalize(a).includes(normalize(b)) || normalize(b).includes(normalize(a))
}
