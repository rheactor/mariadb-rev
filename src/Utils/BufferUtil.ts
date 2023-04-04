export const readNullTerminatedString = (data: Buffer, byteOffset?: number) => {
  const nullIndexOf = data.indexOf("\0", byteOffset);

  if (nullIndexOf === -1) {
    throw Error("expected a NULL-terminated string");
  }

  return data.subarray(byteOffset, nullIndexOf);
};

export const readNullTerminatedStringEscaped = (
  data: Buffer,
  byteOffset?: number
) => {
  const buffers: Buffer[] = [];

  let byteOffsetCurrent = byteOffset;

  for (;;) {
    const nullIndexOf = data.indexOf("\0", byteOffsetCurrent);

    if (nullIndexOf === -1) {
      throw Error("expected a NULL-terminated string");
    }

    const nullEscaped = data.at(nullIndexOf + 1) === 0;

    buffers.push(data.subarray(byteOffsetCurrent, nullIndexOf + +nullEscaped));

    if (nullEscaped) {
      byteOffsetCurrent = nullIndexOf + 2;
      continue;
    }

    break;
  }

  return Buffer.concat(buffers);
};

export const toNullTerminatedStringEscaped = (data: string | null) => {
  if (data === "" || data === null) {
    return Buffer.from([0x00]);
  }

  return Buffer.from(`${data.replaceAll("\x00", "\x00\x00")}\x00`);
};

export const readStringEncoded = (
  data: Buffer,
  byteOffset = 0
): Buffer | null => {
  const bufferInt = readIntEncoded(data, byteOffset);

  if (bufferInt === null) {
    return null;
  }

  if (bufferInt === 0) {
    return Buffer.from("");
  }

  const bufferType = data.readUInt8(byteOffset);
  const bufferOffset =
    bufferType === 0xfc
      ? 3
      : bufferType === 0xfd
      ? 4
      : bufferType === 0xfe
      ? 9
      : 1;

  return data.subarray(
    byteOffset + bufferOffset,
    byteOffset + bufferOffset + Number(bufferInt)
  );
};

export const toStringEncoded = (value: Buffer | string | null) => {
  if (value === null) {
    return Buffer.from([0xfb]);
  }

  if (value === "") {
    return Buffer.from([0x00]);
  }

  if (value instanceof Buffer) {
    return Buffer.concat([toIntEncoded(value.length), value]);
  }

  return Buffer.concat([
    toIntEncoded(value.length),
    Buffer.from(value, "binary"),
  ]);
};

export const toDatetimeEncoded = (
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  seconds: number,
  ms: number
): Buffer => {
  const hasDate = year !== 0 || month !== 0 || day !== 0;
  const hasTime = hours !== 0 || minutes !== 0 || seconds !== 0;
  const hasMs = ms !== 0;

  if (hasDate || hasTime || hasMs) {
    const yearBuffer = Buffer.alloc(2);

    yearBuffer.writeInt16LE(year);

    if (hasTime || hasMs) {
      if (hasMs) {
        const msBuffer = Buffer.alloc(4);

        msBuffer.writeUint32LE(ms);

        return Buffer.concat([
          Buffer.from([11]),
          yearBuffer,
          Buffer.from([month, day, hours, minutes, seconds]),
          msBuffer,
        ]);
      }

      return Buffer.concat([
        Buffer.from([7]),
        yearBuffer,
        Buffer.from([month, day, hours, minutes, seconds]),
      ]);
    }

    return Buffer.concat([
      Buffer.from([4]),
      yearBuffer,
      Buffer.from([month, day]),
    ]);
  }

  return Buffer.from([0]);
};

export const readIntEncoded = (
  data: Buffer,
  byteOffset = 0
): bigint | number | null => {
  const bufferInt = data.readUInt8(byteOffset);

  if (bufferInt === 0xfb) {
    return null;
  }

  if (bufferInt === 0xfc) {
    return data.readUInt16LE(byteOffset + 1);
  }

  if (bufferInt === 0xfd) {
    return data.readUintLE(byteOffset + 1, 3);
  }

  if (bufferInt === 0xfe) {
    return data.readBigUInt64LE(byteOffset + 1);
  }

  return bufferInt;
};

export const toIntEncoded = (value: bigint | number | null) => {
  if (value === null) {
    return Buffer.from([0xfb]);
  }

  if (typeof value === "bigint") {
    const bufferBigInt = Buffer.allocUnsafe(9);

    bufferBigInt.writeUInt8(0xfe);
    bufferBigInt.writeBigUint64LE(value, 1);

    return bufferBigInt;
  }

  if (value > 0xfa) {
    const inputBigger = Number(value > 0xffff);
    const bufferInt = Buffer.allocUnsafe(3 + inputBigger);

    bufferInt.writeUInt8(0xfc + inputBigger);
    bufferInt.writeUIntLE(value, 1, 2 + inputBigger);

    return bufferInt;
  }

  return Buffer.from([value]);
};

export const bufferXOR = (bufferA: Buffer, bufferB: Buffer) => {
  if (bufferA.length !== bufferB.length) {
    throw Error("both Buffer instances must have the same size");
  }

  const bufferResult = Buffer.allocUnsafe(bufferA.length);

  for (let i = 0; i < bufferA.length; i++) {
    bufferResult[i] = bufferA[i]! ^ bufferB[i]!;
  }

  return bufferResult;
};

export const createUInt16LE = (value: number) => {
  const buffer = Buffer.allocUnsafe(2);

  buffer.writeUInt16LE(value);

  return buffer;
};

export const createUInt24LE = (value: number) => {
  const buffer = Buffer.allocUnsafe(3);

  buffer.writeUIntLE(value, 0, 3);

  return buffer;
};

export const createUInt32LE = (value: number) => {
  const buffer = Buffer.allocUnsafe(4);

  buffer.writeUInt32LE(value);

  return buffer;
};

export const createUInt64LE = (value: bigint) => {
  const buffer = Buffer.allocUnsafe(8);

  buffer.writeBigUInt64LE(value);

  return buffer;
};

export const getFieldsPositions = (
  nullBitmap: Buffer,
  fieldsCount: number
): number[] => {
  const positions: number[] = [];

  nullBitmapLoop: for (let i = 0; i < nullBitmap.length; i++) {
    const nullBitmapCurrent = nullBitmap[i]!;

    for (let j = 0; j < 8; j++) {
      const position = i * 8 + j;

      if (position >= fieldsCount) {
        break nullBitmapLoop;
      }

      if ((nullBitmapCurrent & (1 << j)) === 0) {
        positions.push(position);
      }
    }
  }

  return positions;
};

export const generateNullBitmap = (args: unknown[]): Buffer => {
  const nullBitmap: number[] = Array(Math.floor((args.length + 7) / 8)).fill(0);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === null) {
      const bit = Math.floor(i / 8);

      nullBitmap[bit] |= 1 << (i - bit * 8);
    }
  }

  return Buffer.from(nullBitmap);
};
