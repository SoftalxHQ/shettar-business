import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import type { AdAccount, AdCampaign } from "@/lib/ads-api"
import type { RootState } from "./store"

type RealtimeCounters = Record<number, { impressions: number; clicks: number; spend: number; roas: number }>

type AdsState = {
  adAccount: AdAccount | null
  campaigns: AdCampaign[]
  campaignStats: Record<number, unknown>
  realtimeCounters: RealtimeCounters
}

const initialState: AdsState = {
  adAccount: null,
  campaigns: [],
  campaignStats: {},
  realtimeCounters: {},
}

const adsSlice = createSlice({
  name: "ads",
  initialState,
  reducers: {
    setAdAccount(state, action: PayloadAction<AdAccount | null>) {
      state.adAccount = action.payload
    },
    setCampaigns(state, action: PayloadAction<AdCampaign[]>) {
      state.campaigns = action.payload
    },
    setCampaignStats(state, action: PayloadAction<{ campaignId: number; stats: unknown }>) {
      state.campaignStats[action.payload.campaignId] = action.payload.stats
    },
    applyRealtimeUpdate(
      state,
      action: PayloadAction<{ campaignId: number; impressions?: number; clicks?: number; spend?: number; roas?: number }>
    ) {
      const { campaignId, ...rest } = action.payload
      state.realtimeCounters[campaignId] = {
        ...state.realtimeCounters[campaignId],
        impressions: rest.impressions ?? state.realtimeCounters[campaignId]?.impressions ?? 0,
        clicks: rest.clicks ?? state.realtimeCounters[campaignId]?.clicks ?? 0,
        spend: rest.spend ?? state.realtimeCounters[campaignId]?.spend ?? 0,
        roas: rest.roas ?? state.realtimeCounters[campaignId]?.roas ?? 0,
      }
    },
    resetAdsState() {
      return initialState
    },
  },
})

export const { setAdAccount, setCampaigns, setCampaignStats, applyRealtimeUpdate, resetAdsState } = adsSlice.actions
export const selectAdAccount = (state: RootState) => state.ads?.adAccount ?? null
export const selectCampaigns = (state: RootState) => state.ads?.campaigns ?? []
export const selectRealtimeCounters = (state: RootState) => state.ads?.realtimeCounters ?? {}

export default adsSlice.reducer
