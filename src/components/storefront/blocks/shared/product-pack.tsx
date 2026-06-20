"use client";

import { EditableImage } from "@/components/storefront/theme/editable-image";
import { cosmeticsTemplateImages } from "@/lib/storefront/cosmetics-defaults";

export function ProductPack({
  compact = false,
  src,
  alt = "Cosmetic skincare product arrangement",
}: {
  compact?: boolean;
  src?: string;
  alt?: string;
}) {
  const imageSrc = src ?? (compact ? cosmeticsTemplateImages.cleanser : cosmeticsTemplateImages.hero);

  return (
    <div className={`relative ${compact ? "h-64" : "h-[430px]"} w-full`}>
      <div className="absolute inset-x-6 bottom-6 h-20 rounded-[50%] bg-[#dfe5d2] blur-2xl" />
      <EditableImage
        src={imageSrc}
        alt={alt}
        className={`absolute inset-0 overflow-hidden bg-transparent ${compact ? "p-4" : "p-0"}`}
        imgClassName="object-contain object-center drop-shadow-[0_22px_38px_rgba(91,70,49,0.18)]"
      />
    </div>
  );
}
