import React, { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useOutletContext } from '@/contexts/OutletContext'
import { getUserStoreId } from '@/utils/store'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface MessageRow {
	id: string
	store_id: string
	customer_phone: string
	message_type: string
	message_payload: any
	status: string
	whatsapp_message_id?: string | null
	created_at?: string
}

export default function WhatsappInbox() {
    const [loading, setLoading] = useState(true)
    const [rows, setRows] = useState<MessageRow[]>([])
    const { selectedOutlet } = useOutletContext()
    const [storeId, setStoreId] = useState<string>('')

	useEffect(() => {
        // Resolve store id priority: selected outlet -> localStorage -> user store lookup
        const selectedStore = selectedOutlet?.store_id
        const cached = localStorage.getItem('active_store_id') || ''
        if (selectedStore && selectedStore !== storeId) {
            setStoreId(selectedStore)
            return
        }
        if (cached && cached !== storeId) {
            setStoreId(cached)
            return
        }
        let cancelled = false
        ;(async () => {
            const userStore = await getUserStoreId()
            if (!cancelled && userStore) setStoreId(userStore)
        })()
        return () => {
            cancelled = true
        }
    }, [selectedOutlet, storeId])

    useEffect(() => {
		let cancelled = false
		async function load() {
			try {
				setLoading(true)
				const { data, error } = await supabase
					.from('messaging_log')
					.select('id, store_id, customer_phone, message_type, message_payload, status, whatsapp_message_id, created_at')
                    .eq('store_id', storeId)
					.order('created_at', { ascending: false })
					.limit(200)
				if (error) throw error
				if (!cancelled) setRows(data || [])
			} catch (e) {
				console.error('Failed to load messaging_log', e)
			} finally {
				if (!cancelled) setLoading(false)
			}
		}
        if (storeId) load()
		return () => {
			cancelled = true
		}
    }, [storeId])

	const grouped = useMemo(() => {
		const map = new Map<string, MessageRow[]>()
		for (const r of rows) {
			const key = r.customer_phone
			if (!map.has(key)) map.set(key, [])
			map.get(key)!.push(r)
		}
		return Array.from(map.entries())
	}, [rows])

    return (
		<div className="p-4 space-y-4">
			<h1 className="text-xl font-semibold">WhatsApp Inbox</h1>
            {!storeId && (
				<div className="text-sm text-gray-500">No active store selected.</div>
			)}
            {loading && <div>Loading...</div>}
			{!loading && grouped.length === 0 && (
				<div className="text-sm text-gray-500">No conversations yet.</div>
			)}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{grouped.map(([phone, messages]) => (
					<div key={phone} className="border rounded p-3">
						<div className="font-medium mb-2">{phone}</div>
						<div className="space-y-2 max-h-80 overflow-auto">
							{messages.map((m) => (
								<div key={m.id} className="text-sm">
									<div className="text-gray-500">{new Date(m.created_at || '').toLocaleString()}</div>
									<div>
										<span className="inline-block px-2 py-0.5 rounded bg-gray-100 mr-2">{m.message_type}</span>
										<span className="break-all">{renderMessage(m)}</span>
									</div>
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

function renderMessage(m: MessageRow): string {
	try {
		if (m?.message_payload?.text) {
			if (typeof m.message_payload.text === 'string') return m.message_payload.text
			if (typeof m.message_payload.text?.body === 'string') return m.message_payload.text.body
		}
		return JSON.stringify(m.message_payload)
	} catch {
		return String(m.message_payload)
	}
}
