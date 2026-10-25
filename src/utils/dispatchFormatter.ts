import type { SampleRequest } from '../types';

/**
 * Formats the exact WhatsApp dispatch message to be posted into the company WhatsApp group
 * or sent directly to the assigned sampler.
 *
 * Example:
 * @Ramesh
 * *Sigma sea foods*
 * Gnr
 * 90c-2tons
 * Kuppanapudi,(konalapalli)
 * +919014747367
 * Madhu 9032259499
 */
export function formatWhatsAppDispatchMessage(
  sample: SampleRequest,
  samplerName: string,
  includeMapLink = false
): string {
  const lines: string[] = [];

  // 1. @Sampler mention
  lines.push(`@${samplerName.trim()}`);

  // 2. Bold Company Name
  if (sample.company && sample.company.trim()) {
    lines.push(`*${sample.company.trim()}*`);
  }

  // 3. Farmer / Lot Code (only if present)
  if (sample.farmerCode && sample.farmerCode.trim() && sample.farmerCode !== 'General') {
    lines.push(sample.farmerCode.trim());
  }

  // 4. Count & Tonnage (only if present)
  if (sample.countTons && sample.countTons.trim() && sample.countTons !== 'Standard') {
    lines.push(sample.countTons.trim());
  }

  // 5. Location with sublocation/landmark in parentheses
  if (sample.subLocation && sample.subLocation.trim().length > 0) {
    lines.push(`${sample.locationName.trim()},(${sample.subLocation.trim()})`);
  } else if (sample.locationName && sample.locationName.trim()) {
    lines.push(sample.locationName.trim());
  }

  // 6. Pond Owner Phone Number
  if (sample.ownerPhone && sample.ownerPhone.trim()) {
    lines.push(sample.ownerPhone.trim());
  }

  // 7. Alternate Contact Person & Number (e.g., "Madhu 9032259499")
  if (sample.altContactPhone || sample.altContactName) {
    const contactParts = [sample.altContactName?.trim(), sample.altContactPhone?.trim()].filter(Boolean);
    if (contactParts.length > 0) {
      lines.push(contactParts.join(' '));
    }
  }

  // Optional: Direct Google Maps navigation link
  if (includeMapLink) {
    if (sample.googleMapsUrl) {
      lines.push(`📍 Maps: ${sample.googleMapsUrl}`);
    } else if (sample.coords && sample.coords.lat && sample.coords.lng) {
      lines.push(`📍 Maps: https://www.google.com/maps?q=${sample.coords.lat},${sample.coords.lng}`);
    }
  }

  return lines.join('\n');
}

/**
 * Opens WhatsApp with pre-filled message text.
 * Works seamlessly on mobile devices (Android/iOS) and desktop (WhatsApp Web / App).
 */
export function sendViaWhatsApp(text: string, phone?: string): void {
  const encodedText = encodeURIComponent(text);
  let url = '';

  if (phone) {
    // Direct chat with sampler phone number
    const cleanPhone = phone.replace(/[^\d]/g, '');
    url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
  } else {
    // Open WhatsApp share sheet (for group posting)
    url = `https://api.whatsapp.com/send?text=${encodedText}`;
  }

  window.open(url, '_blank');
}

/**
 * Copies text to system clipboard.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
}
