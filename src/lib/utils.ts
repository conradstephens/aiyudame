import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert a base64 string in a Blob according to the data and contentType.
 * @param base64String
 * @param contentType
 * @returns Blob
 */
export function base64StringToBlob(
  base64String: string,
  contentType: string,
): Blob {
  const byteCharacters = atob(base64String); // Decode the base64 string
  const byteArrays: Uint8Array[] = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
}

/**
 * Convert a Blob into a base64 string.
 * @param blob
 * @returns Promise<string>
 */
export async function blobToBase64String(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const byteArray = new Uint8Array(arrayBuffer);

  let binary = "";
  byteArray.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  const base64string = btoa(binary);

  return base64string;
}
