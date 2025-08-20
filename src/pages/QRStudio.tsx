import { useParams } from "react-router-dom";

export default function QRStudio() {
  const { tenantSlug } = useParams();
  const src = `/dynamic-qr.html${tenantSlug ? `?tenant=${tenantSlug}` : ''}`;
  return (
    <div className="w-full h-[calc(100vh-56px)]">
      <iframe
        src={src}
        title="QR Studio"
        className="w-full h-full border-0"
      />
    </div>
  );
}

