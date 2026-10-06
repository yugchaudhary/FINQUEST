'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import * as xlsx from 'xlsx'
import { z } from 'zod'

const registrationSchema = z.object({
  registration_number: z.string().min(1)
})

export async function importRegistrations(formData: FormData) {
  try {
    const file = formData.get('file') as File
    if (!file) return { success: false, error: 'No file provided' }
    
    const buffer = await file.arrayBuffer()
    const workbook = xlsx.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[]

    const validRegistrations = data.map(row => ({
      registration_number: (row.registration_number || row.RegistrationNumber || row['Registration Number'] || row.id || row.ID || row.Id || row.RegNo || row.reg_no)?.toString().trim()
    })).filter(r => r.registration_number)

    const validated = z.array(registrationSchema).parse(validRegistrations)
    return { success: true, data: validated }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function confirmRegistrationImport(registrations: Array<{registration_number: string}>) {
  try {
    const adminClient = createAdminClient()

    for (const reg of registrations) {
      // Upsert so we don't crash on duplicates
      await adminClient.from('allowed_registrations').upsert({
        registration_number: reg.registration_number,
        is_used: false
      }, { onConflict: 'registration_number' })
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getAllowedRegistrations() {
  const adminClient = createAdminClient()
  const { data } = await adminClient.from('allowed_registrations').select('*').order('created_at', { ascending: false })
  return data || []
}
