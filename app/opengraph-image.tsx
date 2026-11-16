import { ImageResponse } from "next/og";
import { store } from "@/config/store";

export const alt = `${store.name}, Naya Nangal`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default link preview for pages without their own photo. */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0b0b0b",
          color: "#ffffff",
        }}
      >
        <div style={{ fontSize: 84, fontWeight: 700, color: "#c9a24b" }}>{store.name}</div>
        <div style={{ fontSize: 44, marginTop: 20 }}>{store.tagline}</div>
        <div style={{ fontSize: 34, marginTop: 40, color: "#d9d9d9" }}>
          Branded apparel, footwear and accessories · Naya Nangal, Punjab
        </div>
      </div>
    ),
    size,
  );
}
