"use client"

import Image from "next/image"

import { cn } from "@ui/web/lib/utils"

type BrandLogoProps = {
  className?: string
  alt?: string
}

export function BrandLogo({ className, alt = "EverFreeNote" }: BrandLogoProps) {
  return (
    <Image
      src="/brand/everfreenote-logo-mark.png"
      alt={alt}
      width={512}
      height={512}
      className={cn("object-contain", className)}
    />
  )
}
