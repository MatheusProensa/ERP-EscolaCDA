import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0D1F4E",
          fontSize: 70,
          fontWeight: 800,
          color: "#F5C400",
          fontFamily: "Arial, sans-serif",
          letterSpacing: -3,
        }}
      >
        CDA
      </div>
    ),
    { ...size }
  );
}
