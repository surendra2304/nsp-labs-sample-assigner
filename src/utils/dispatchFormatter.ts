import { SampleRequest } from '../types';

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
  includeMapLink = true
): string {
  const lines: string[] = [];

  // 1. @Sampler mention
  lines.push(`@${samplerName.trim()}`);

  // 2. Bold Company Name
  lines.push(`*${sample.company.trim()}*`);

  // 3. Farmer / Lot Code
  lines.push(sample.farmerCode.trim());

  // 4. Count & Tonnage
  lines.push(sample.countTons.trim());

  // 5. Location with sublocation/landmark in parentheses
  if (sample.subLocation && sample.subLocation.trim().length > 0) {
    lines.push(`${sample.locationName.trim()},(${sample.subLocation.trim()})`);
  } else {
    lines.push(sample.locationName.trim());
  }

  // 6. Pond Owner Phone Number
  if (sample.ownerPhone) {
    lines.push(sample.ownerPhone.trim());
  }

  // 7. Alternate Contact Person & Number (e.g., "Madhu 9032259499")
  if (sample.altContactPhone || sample.altContactName) {
    const contactParts = [sample.altContactName?.trim(), sample.altContactPhone?.trim()].filter(Boolean);
    if (contactParts.length > 0) {
      lines.push(contactParts.join(' '));
    }
  }

  // Optional: Direct Google Maps navigation link for the sampler
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
export function sendViaWhatsApp(messageText: string, phoneNumber?: string): void {
  const encodedText = encodeURIComponent(messageText);
  let url = '';

  if (phoneNumber) {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
  } else {
    // Opens WhatsApp share dialog to pick any group or contact
    url = `https://api.whatsapp.com/send?text=${encodedText}`;
  }

  window.open(url, '_blank');
}

/**
 * Copies message text to clipboard with modern navigator.clipboard and fallback.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard API failed, trying fallback...', err);
  }

  // Fallback for older browsers / webviews
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    textArea.remove();
    return successful;
  } catch (err) {
    console.error('Fallback clipboard failed', err);
    return false;
  }
}
