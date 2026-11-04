export interface DigitalFile {
  name: string;
  key: string;
  versionId: string;
}

export function validateDigitalFiles(value: unknown): DigitalFile[] {
  if (!Array.isArray(value) || value.length > 30) {
    throw new Error('Digital files must be an array of at most 30 files');
  }
  return value.map((file) => {
    if (
      !file ||
      typeof file.name !== 'string' ||
      !file.name.trim() ||
      file.name.length > 255 ||
      /[\x00-\x1f\x7f/\\]/.test(file.name) ||
      typeof file.key !== 'string' ||
      !file.key ||
      Buffer.byteLength(file.key, 'utf8') > 1024 ||
      /[\x00-\x1f\x7f\\]/.test(file.key) ||
      file.key.split('/').some((part) => !part || part === '.' || part === '..') ||
      typeof file.versionId !== 'string' ||
      !file.versionId.trim() ||
      file.versionId === 'null' ||
      file.versionId.length > 1024 ||
      /[\x00-\x1f\x7f]/.test(file.versionId)
    ) {
      throw new Error('Digital files require a safe name, object key and immutable version ID');
    }
    return { name: file.name.trim(), key: file.key, versionId: file.versionId };
  });
}

export function resolveDigitalFiles(
  own: DigitalFile[] | null | undefined,
  inherited: DigitalFile[] | null | undefined
): DigitalFile[] {
  return validateDigitalFiles(own ?? inherited ?? []);
}

export function canDownload(
  order: { customer_id: number | null; payment_status: string; status: string },
  customerId: number | null | undefined,
  disabled: boolean
): boolean {
  return (
    Number.isSafeInteger(customerId) &&
    Number(customerId) > 0 &&
    order.customer_id === customerId &&
    order.payment_status === 'paid' &&
    !['canceled', 'cancelled'].includes(order.status) &&
    !disabled
  );
}
