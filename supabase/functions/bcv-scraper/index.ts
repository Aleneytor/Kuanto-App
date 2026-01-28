import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Version 7.0 - Using Vercel BCV Scraper
// Cron schedule: 5pm, 5:30pm, 6pm, 6:30pm, 7pm VET (21:00, 21:30, 22:00, 22:30, 23:00 UTC)
console.log("BCV Scraper v7.0 - Vercel Integration")

serve(async (req) => {
    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        console.log('🔍 Fetching from Vercel BCV Scraper...')

        // Call Vercel scraper (bypasses SSL issues)
        const response = await fetch('https://bcvscrapper.vercel.app/api/bcv')
        const data = await response.json()

        if (!data.success) {
            throw new Error(data.error || 'Vercel scraper failed')
        }

        const { date: targetDate, usd, eur } = data

        console.log(`✅ Got rates: ${targetDate} - USD=${usd}, EUR=${eur}`)

        // Check if rate already exists and is unchanged
        const { data: existing } = await supabase
            .from('bcv_rates_history')
            .select('usd, eur')
            .eq('date', targetDate)
            .maybeSingle()

        if (existing && existing.usd === usd && existing.eur === eur) {
            console.log(`ℹ️ Rate for ${targetDate} already exists and unchanged`)
            return new Response(JSON.stringify({
                success: true,
                message: 'Rate unchanged',
                data: { date: targetDate, usd, eur, status: 'unchanged' }
            }), { headers: { "Content-Type": "application/json" } })
        }

        // Store in Supabase
        const { error } = await supabase
            .from('bcv_rates_history')
            .upsert({
                date: targetDate,
                usd,
                eur,
                source: 'vercel-scraper',
                updated_at: new Date().toISOString()
            }, { onConflict: 'date' })

        if (error) throw error

        console.log(`✅ Stored rates for ${targetDate}`)

        return new Response(JSON.stringify({
            success: true,
            message: 'Rates updated',
            data: { date: targetDate, usd, eur }
        }), { headers: { "Content-Type": "application/json" } })

    } catch (error) {
        console.error('❌ Error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }), { status: 500, headers: { "Content-Type": "application/json" } })
    }
})
