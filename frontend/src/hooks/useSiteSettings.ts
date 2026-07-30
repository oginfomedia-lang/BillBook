import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";

export interface SiteSettings {
  site_name: string;
  footer_text: string;
  logo_url: string;
  favicon_url: string;
}

const DEFAULTS: SiteSettings = {
  site_name: "BillBook",
  footer_text: "Powered by BillBook",
  logo_url: "",
  favicon_url: "",
};

// Shares the exact queryKey + queryFn shape used by SettingsPage's
// generalSettingsQuery (GET /settings) so both hooks read/write the SAME
// cache entry: saving on the Settings page invalidates ["settings",
// "general"], which this hook (mounted in DashboardLayout) also
// subscribes to, so branding updates everywhere immediately without a
// duplicate fetch or a stale, differently-shaped cache entry.
export function useSiteSettings() {
  return useQuery({
    queryKey: ["settings", "general"],
    queryFn: async () => {
      const { data } = await apiClient.get("/settings");
      return data;
    },
    select: (data: any): SiteSettings => ({
      site_name: data.site_name || DEFAULTS.site_name,
      footer_text: data.footer_text || DEFAULTS.footer_text,
      logo_url: data.logo_url || "",
      favicon_url: data.favicon_url || "",
    }),
    staleTime: 1000 * 60 * 5,
  });
}
