const fs = require("fs");
const path = require("path");
const multer = require("multer");
const zlib = require("zlib");
const { TextDecoder } = require("util");

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const readZipEntries = (archive) => {
  const min = Math.max(0, archive.length - 65557);
  let eocd = -1;
  for (let i = archive.length - 22; i >= min; i -= 1) {
    if (archive.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0 || archive.readUInt16LE(eocd + 4) || archive.readUInt16LE(eocd + 6)) throw new Error("Invalid ZIP directory");
  const count = archive.readUInt16LE(eocd + 10);
  const directorySize = archive.readUInt32LE(eocd + 12);
  let cursor = archive.readUInt32LE(eocd + 16);
  if (count > 10000 || cursor + directorySize > eocd) throw new Error("Invalid ZIP bounds");
  const entries = new Map();
  let totalUncompressed = 0;
  for (let n = 0; n < count; n += 1) {
    if (cursor + 46 > eocd) throw new Error("Truncated ZIP directory");
    if (archive.readUInt32LE(cursor) !== 0x02014b50) throw new Error("Invalid ZIP entry");
    const flags = archive.readUInt16LE(cursor + 8);
    const method = archive.readUInt16LE(cursor + 10);
    const expectedCrc = archive.readUInt32LE(cursor + 16);
    const compressedSize = archive.readUInt32LE(cursor + 20);
    const size = archive.readUInt32LE(cursor + 24);
    const nameLength = archive.readUInt16LE(cursor + 28);
    const extraLength = archive.readUInt16LE(cursor + 30);
    const commentLength = archive.readUInt16LE(cursor + 32);
    const localOffset = archive.readUInt32LE(cursor + 42);
    const name = archive.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    cursor += 46 + nameLength + extraLength + commentLength;
    if (!name || name.startsWith("/") || name.split(/[\\/]/).includes("..") || entries.has(name) || (flags & 1) || ![0, 8].includes(method)) throw new Error("Unsupported ZIP entry");
    if (archive.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("Invalid ZIP local header");
    if (archive.readUInt16LE(localOffset + 8) !== method) throw new Error("ZIP compression mismatch");
    const localNameLength = archive.readUInt16LE(localOffset + 26);
    const localExtraLength = archive.readUInt16LE(localOffset + 28);
    const localName = archive.subarray(localOffset + 30, localOffset + 30 + localNameLength).toString("utf8");
    if (localName !== name) throw new Error("ZIP filename mismatch");
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    totalUncompressed += size;
    if (dataEnd > archive.length || totalUncompressed > 20 * 1024 * 1024) throw new Error("Invalid ZIP entry bounds");
    const compressed = archive.subarray(dataStart, dataEnd);
    const contents = method === 0 ? Buffer.from(compressed) : zlib.inflateRawSync(compressed, { maxOutputLength: 20 * 1024 * 1024 });
    if (contents.length !== size || crc32(contents) !== expectedCrc) throw new Error("Corrupt ZIP entry");
    entries.set(name, contents);
  }
  if (cursor !== archive.readUInt32LE(eocd + 16) + directorySize) throw new Error("Invalid ZIP directory length");
  return entries;
};

const validOfficeArchive = (extension, archive) => {
  const entries = readZipEntries(archive);
  const types = entries.get("[Content_Types].xml")?.toString("utf8");
  const required = extension === ".docx" ? "word/document.xml" : extension === ".xlsx" ? "xl/workbook.xml" : "ppt/presentation.xml";
  const content = entries.get(required)?.toString("utf8");
  const mainType = extension === ".docx" ? "wordprocessingml.document.main+xml" : extension === ".xlsx" ? "spreadsheetml.sheet.main+xml" : "presentationml.presentation.main+xml";
  const hasExecutable = [...entries.keys()].some((name) => /(?:^|\/)(?:embeddings\/|[^/]+\.(?:exe|dll|com|bat|cmd|ps1|vbs|js|sh)$)/i.test(name));
  return Boolean(!hasExecutable && types?.includes("<Types") && types.includes(mainType) &&
    content && /<\w*:?(document|workbook|presentation)(?:\s|>)/i.test(content));
};

const formats = {
  ".pdf": { mime: "application/pdf", signature: (b) => b.subarray(0, 5).toString() === "%PDF-" },
  ".png": { mime: "image/png", signature: (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  ".jpg": { mime: "image/jpeg", signature: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  ".jpeg": { mime: "image/jpeg", signature: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  ".gif": { mime: "image/gif", signature: (b) => ["GIF87a", "GIF89a"].includes(b.subarray(0, 6).toString()) },
  ".txt": { mime: "text/plain", signature: (b) => !b.includes(0) },
  ".doc": { mime: "application/msword", signature: (b) => b.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) },
  ".xls": { mime: "application/vnd.ms-excel", signature: (b) => b.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) },
  ".ppt": { mime: "application/vnd.ms-powerpoint", signature: (b) => b.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) },
  ".docx": { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", signature: (b) => b[0] === 0x50 && b[1] === 0x4b },
  ".xlsx": { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", signature: (b) => b[0] === 0x50 && b[1] === 0x4b },
  ".pptx": { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", signature: (b) => b[0] === 0x50 && b[1] === 0x4b }
};

const createUpload = ({ destination, extensions, maxBytes }) => multer({
  storage: multer.diskStorage({
    destination,
    filename: (req, file, callback) => callback(null, `${Date.now()}-${require("crypto").randomBytes(12).toString("hex")}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: maxBytes, files: 1 },
  fileFilter: (req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const format = formats[ext];
    if (!extensions.includes(ext) || !format || file.mimetype.toLowerCase() !== format.mime) {
      const error = new Error("Unsupported file type.");
      error.status = 400;
      return callback(error);
    }
    callback(null, true);
  }
});

const verifyUploadedFile = (extensions) => async (req, res, next) => {
  if (!req.file) return next();
  try {
    const ext = path.extname(req.file.originalname).toLowerCase();
    const format = formats[ext];
    const handle = await fs.promises.open(req.file.path, "r");
    const sample = Buffer.alloc(16);
    const { bytesRead } = await handle.read(sample, 0, sample.length, 0);
    await handle.close();
    let contentMatches = extensions.includes(ext) && Boolean(format) && format.signature(sample.subarray(0, bytesRead));
    if (contentMatches && ext === ".txt") {
      const text = await fs.promises.readFile(req.file.path);
      try {
        new TextDecoder("utf-8", { fatal: true }).decode(text);
        contentMatches = !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text.toString("utf8")) && !/^\s*#!/.test(text.toString("utf8"));
      } catch { contentMatches = false; }
    }
    if (contentMatches && [".docx", ".xlsx", ".pptx"].includes(ext)) {
      contentMatches = validOfficeArchive(ext, await fs.promises.readFile(req.file.path));
    }
    if (!contentMatches) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      const error = new Error("File content does not match an allowed file type.");
      error.status = 400;
      return next(error);
    }
    next();
  } catch (error) {
    if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
    next(error);
  }
};

module.exports = { createUpload, verifyUploadedFile };
