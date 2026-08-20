import { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "@/hooks/use-theme";

// Center-point lookup for Dubai/UAE service areas that show up in address
// data. New areas fall back to being skipped (no pin) rather than guessed —
// a missing pin is a smaller problem than a wrong one.
const AREA_COORDS: Record<string, [number, number]> = {
  "Jumeirah 3": [25.2087, 55.2497],
  "Downtown Dubai": [25.1972, 55.2744],
  "Dubai Marina": [25.0805, 55.1403],
  "Al Barsha": [25.1121, 55.2003],
  "Dubai Hills": [25.1004, 55.2477],
  "Business Bay": [25.1857, 55.2633],
  "JBR": [25.0777, 55.1330],
  "Al Qouz": [25.1367, 55.2372],
};

const DUBAI_CENTER: [number, number] = [25.15, 55.22];

export function ZoneMap({ zones }: { zones: { zone: string; bookings: number }[] }) {
  const { theme } = useTheme();
  const points = useMemo(
    () => zones.map((z) => ({ ...z, coords: AREA_COORDS[z.zone] })).filter((z) => z.coords),
    [zones],
  );
  const maxBookings = Math.max(1, ...points.map((p) => p.bookings));

  // CARTO's free basemaps, no API key — light/dark variant to match the toggle.
  const tileUrl = theme === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  if (points.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No mapped service areas yet.
      </div>
    );
  }

  return (
    <div className="h-[220px] overflow-hidden rounded-lg border border-border" data-testid="map-vendor-coverage">
      <MapContainer center={DUBAI_CENTER} zoom={11} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }} attributionControl={false}>
        <TileLayer url={tileUrl} />
        {points.map((p) => {
          // Radius scales with volume so busier zones read as heavier without
          // a full heatmap layer/dependency — clamped so a single outlier
          // booking doesn't collapse to an invisible dot.
          const radius = 8 + (p.bookings / maxBookings) * 16;
          return (
            <CircleMarker
              key={p.zone}
              center={p.coords!}
              radius={radius}
              pathOptions={{ color: "hsl(216 100% 58%)", fillColor: "hsl(216 100% 58%)", fillOpacity: 0.45, weight: 1.5 }}
            >
              <Tooltip direction="top" offset={[0, -radius]}>
                {p.zone} · {p.bookings} booking{p.bookings === 1 ? "" : "s"}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
