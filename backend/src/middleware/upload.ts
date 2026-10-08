import multer from 'multer';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
]);

function magicOk(buf: Buffer, mime: string): boolean {
  if (buf.length < 4) return false;
  const sig = buf.subarray(0, 4).toString('hex').toUpperCase();
  if (mime === 'application/pdf') return buf.subarray(0, 5).toString() === '%PDF-';
  if (mime === 'image/png') return sig === '89504E47';
  if (mime === 'image/jpeg') return sig.startsWith('FFD8FF');
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return sig === '504B0304';
  return true; // doc/txt fallback
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) return cb(new Error('Unsupported file type'));
    cb(null, true);
  },
});

export function assertMagic(buffer: Buffer, mime: string) {
  if (!magicOk(buffer, mime)) {
    const e: any = new Error('File content does not match MIME type');
    e.status = 400;
    throw e;
  }
}
