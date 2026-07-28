import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 7,
          fontSize: 15,
          fontWeight: 800,
          color: "#F5C400",
          fontFamily: "Arial, sans-serif",
          letterSpacing: -1,
        }}
      >
        CDA
      </div>
    ),
    { ...size }
  );
}
