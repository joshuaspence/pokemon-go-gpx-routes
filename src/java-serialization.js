/**
 * A minimal codec for Java's Object Serialization Stream Protocol — just the slice PGSData.dat uses — ported from the
 * pgsedit tool. `loads` reads a stream into a live object graph and `dumps` writes one back; `box` wraps a JS value as
 * a boxed Java primitive (an Integer, Long, Float or Boolean) for the map values that are not strings.
 *
 * The whole stream is re-emitted from scratch rather than patched in place: back-references are positional handles, so
 * changing one value shifts every handle after it, and only a full re-serialization keeps them consistent. See the
 * pgsedit README for the wire format this mirrors.
 */
export const JavaSer = (() => {
  // ObjectStreamConstants.
  const STREAM_MAGIC = 0xaced,
    STREAM_VERSION = 5;
  const TC_NULL = 0x70,
    TC_REFERENCE = 0x71,
    TC_CLASSDESC = 0x72,
    TC_OBJECT = 0x73,
    TC_STRING = 0x74,
    TC_ENDBLOCKDATA = 0x78,
    TC_BLOCKDATA = 0x77,
    TC_BLOCKDATALONG = 0x7a,
    TC_LONGSTRING = 0x7c;
  const BASE_HANDLE = 0x7e0000;
  const SC_WRITE_METHOD = 0x01,
    SC_SERIALIZABLE = 0x02;

  /**
   * Boxed primitives, keyed by JVM field-type code. The value carried is a Number for I/F, a BigInt for J (a 64-bit
   * long won't fit a JS number and must round-trip exactly — PGSharp hides doubles inside longs), and a boolean for Z.
   */
  const BOX = {
    I: { cls: 'java.lang.Integer', uid: 0x12e2a0a4f7818738n },
    J: { cls: 'java.lang.Long', uid: 0x3b8be490cc8f23dfn },
    F: { cls: 'java.lang.Float', uid: 0xdaedc9a2db3cf0ecn },
    Z: { cls: 'java.lang.Boolean', uid: 0xcd207280d59cfaeen },
  };
  const BOX_BY_CLASS = {
    'java.lang.Integer': 'I',
    'java.lang.Long': 'J',
    'java.lang.Float': 'F',
    'java.lang.Boolean': 'Z',
  };
  const NUMBER = { name: 'java.lang.Number', uid: 0x86ac951d0b94e08bn };
  const HASHMAP_UID = 0x0507dac1c31660d1n;

  const err = (m) => new Error(m);

  /**
   * Java's "modified UTF-8": U+0000 is C0 80 and non-BMP characters are written as their two UTF-16 surrogates (3 bytes
   * each), so we iterate UTF-16 code units rather than code points.
   */
  function encodeMutf8(s) {
    const out = [];

    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);

      if (c === 0) {
        out.push(0xc0, 0x80);
      } else if (c < 0x80) {
        out.push(c);
      } else if (c < 0x800) {
        out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      } else {
        out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      }
    }

    return out;
  }

  function decodeMutf8(bytes) {
    let s = '',
      i = 0;
    const n = bytes.length;

    while (i < n) {
      const c = bytes[i];

      if (c < 0x80) {
        s += String.fromCharCode(c);
        i += 1;
      } else if ((c & 0xe0) === 0xc0) {
        if (i + 1 >= n) {
          throw err('truncated modified UTF-8 sequence');
        }

        s += String.fromCharCode(((c & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
        i += 2;
      } else if ((c & 0xf0) === 0xe0) {
        if (i + 2 >= n) {
          throw err('truncated modified UTF-8 sequence');
        }

        s += String.fromCharCode(((c & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f));
        i += 3;
      } else {
        throw err(`invalid modified UTF-8 byte 0x${c.toString(16)}`);
      }
    }

    return s;
  }

  class Reader {
    constructor(bytes) {
      this.b = bytes;
      this.dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      this.p = 0;
      this.handles = [];
    }
    u1() {
      if (this.p >= this.b.length) {
        throw err('truncated stream');
      }

      return this.b[this.p++];
    }
    u2() {
      const v = this.dv.getUint16(this.p);
      this.p += 2;
      return v;
    }
    i4() {
      const v = this.dv.getInt32(this.p);
      this.p += 4;
      return v;
    }
    i8() {
      const v = this.dv.getBigInt64(this.p);
      this.p += 8;
      return v;
    }
    f4() {
      const v = this.dv.getFloat32(this.p);
      this.p += 4;
      return v;
    }
    f8() {
      const v = this.dv.getFloat64(this.p);
      this.p += 8;
      return v;
    }
    raw(n) {
      const v = this.b.subarray(this.p, this.p + n);

      if (v.length !== n) {
        throw err('truncated stream');
      }

      this.p += n;
      return v;
    }
    peek() {
      return this.b[this.p];
    }
    newHandle(obj) {
      this.handles.push(obj);
      return obj;
    }
    /**
     * The JVM assigns an object's handle before its fields are read, so a self-referential object can cite itself;
     * reserve the slot, back-patch it.
     */
    claimHandle() {
      this.handles.push(null);
      return this.handles.length - 1;
    }
    resolveHandle(slot, obj) {
      this.handles[slot] = obj;
      return obj;
    }
    ref() {
      const h = this.i4() - BASE_HANDLE;

      if (h < 0 || h >= this.handles.length) {
        throw err(`bad handle reference ${h}`);
      }

      return this.handles[h];
    }
    utf() {
      return decodeMutf8(this.raw(this.u2()));
    }
    longUtf() {
      return decodeMutf8(this.raw(Number(this.i8())));
    }

    classDesc() {
      const tag = this.u1();

      if (tag === TC_NULL) {
        return null;
      }

      if (tag === TC_REFERENCE) {
        return this.ref();
      }

      if (tag !== TC_CLASSDESC) {
        throw err(`expected classdesc, got 0x${tag.toString(16)} at ${this.p - 1}`);
      }

      const name = this.utf();
      const uid = this.i8();
      const flags = this.u1();
      const desc = this.newHandle({ name, uid, flags, fields: [] });
      const nfields = this.u2();

      for (let i = 0; i < nfields; i++) {
        const tcode = String.fromCharCode(this.u1());
        const fname = this.utf();

        if (tcode === 'L' || tcode === '[') {
          this.content();
        } // field type string; unused

        desc.fields.push([tcode, fname]);
      }

      this.skipAnnotation();
      desc.super = this.classDesc();
      return desc;
    }
    skipAnnotation() {
      for (;;) {
        if (this.peek() === TC_ENDBLOCKDATA) {
          this.p += 1;
          return;
        }

        this.content();
      }
    }
    readPrimitive(tcode) {
      switch (tcode) {
        case 'I':
          return this.i4();
        case 'J':
          return this.i8();
        case 'F':
          return this.f4();
        case 'D':
          return this.f8();
        case 'Z':
          return this.u1() !== 0;
        case 'B':
          return this.u1();

        case 'S': {
          const v = this.dv.getInt16(this.p);
          this.p += 2;
          return v;
        }

        case 'C': {
          const v = this.dv.getUint16(this.p);
          this.p += 2;
          return String.fromCharCode(v);
        }

        default:
          throw err(`unsupported field type '${tcode}'`);
      }
    }
    content() {
      const tag = this.u1();

      if (tag === TC_NULL) {
        return null;
      }

      if (tag === TC_REFERENCE) {
        return this.ref();
      }

      if (tag === TC_STRING) {
        return this.newHandle(this.utf());
      }

      if (tag === TC_LONGSTRING) {
        return this.newHandle(this.longUtf());
      }

      if (tag === TC_BLOCKDATA) {
        return { blockdata: this.raw(this.u1()) };
      }

      if (tag === TC_BLOCKDATALONG) {
        return { blockdata: this.raw(this.i4()) };
      }

      if (tag === TC_OBJECT) {
        return this.object();
      }

      throw err(`unsupported tag 0x${tag.toString(16)} at offset ${this.p - 1}`);
    }
    object() {
      const desc = this.classDesc();
      const slot = this.claimHandle();
      const chain = [];

      for (let d = desc; d; d = d.super) {
        chain.push(d);
      }

      chain.reverse(); // superclass fields come first

      for (const d of chain) {
        for (const [tcode, fname] of d.fields) {
          d.values ||= {};
          /**
           * We only need HashMap's writeObject payload; a field's value is read to advance the stream but not otherwise
           * used here.
           */
          d.values[fname] = tcode === 'L' || tcode === '[' ? this.content() : this.readPrimitive(tcode);
        }

        if (d.flags & SC_WRITE_METHOD) {
          d.custom = this.customData(d.name);
        }
      }

      const name = desc.name;

      if (name in BOX_BY_CLASS) {
        const t = BOX_BY_CLASS[name];
        return this.resolveHandle(slot, { box: t, value: chain[chain.length - 1].values.value });
      }

      if (name === 'java.util.HashMap') {
        let entries = null;

        for (const d of chain) {
          if (d.custom !== undefined) {
            entries = d.custom;
          }
        }

        return this.resolveHandle(slot, entries);
      }

      throw err(`unsupported class ${name}`);
    }
    customData(className) {
      if (className !== 'java.util.HashMap') {
        throw err(`no custom-data handler for ${className}`);
      }

      if (this.u1() !== TC_BLOCKDATA) {
        throw err('expected HashMap block data');
      }

      const payload = this.raw(this.u1());
      const pdv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
      const size = pdv.getInt32(4); // [capacity, size]; capacity is recomputed on write
      const m = new Map();

      for (let i = 0; i < size; i++) {
        const k = this.content();
        m.set(k, this.content());
      }

      if (this.u1() !== TC_ENDBLOCKDATA) {
        throw err('expected TC_ENDBLOCKDATA after HashMap');
      }

      return m;
    }
  }

  function loads(bytes) {
    const r = new Reader(bytes);

    if (r.u2() !== STREAM_MAGIC || r.u2() !== STREAM_VERSION) {
      throw err('not a Java serialization stream (bad magic/version)');
    }

    const root = r.content();

    if (r.p !== bytes.length) {
      throw err(`${bytes.length - r.p} trailing bytes after root object`);
    }

    return root;
  }

  class Writer {
    constructor() {
      this.out = [];
      this.strHandles = new Map(); // value-keyed; a repeat becomes a back-reference
      this.boxHandles = new Map(); // identity-keyed
      this.classHandles = new Map(); // name-keyed
      this.next = 0;
    }
    claim() {
      return this.next++;
    }
    push(arr) {
      for (let i = 0; i < arr.length; i++) {
        this.out.push(arr[i]);
      }
    }
    u1(v) {
      this.out.push(v & 0xff);
    }
    u2(v) {
      this.out.push((v >> 8) & 0xff, v & 0xff);
    }
    i4(v) {
      this.out.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
    }
    i8(v) {
      let x = BigInt.asUintN(64, BigInt(v));
      const bytes = new Array(8);

      for (let i = 7; i >= 0; i--) {
        bytes[i] = Number(x & 0xffn);
        x >>= 8n;
      }

      this.push(bytes);
    }
    f4(v) {
      const b = new Uint8Array(4);
      new DataView(b.buffer).setFloat32(0, v, false);
      this.push(b);
    }
    utf(s) {
      const b = encodeMutf8(s);

      if (b.length > 0xffff) {
        throw err('string too long for TC_STRING');
      }

      this.u2(b.length);
      this.push(b);
    }
    ref(h) {
      this.u1(TC_REFERENCE);
      this.i4(BASE_HANDLE + h);
    }
    string(s) {
      const h = this.strHandles.get(s);

      if (h !== undefined) {
        this.ref(h);
        return;
      }

      const b = encodeMutf8(s);

      if (b.length <= 0xffff) {
        this.u1(TC_STRING);
        this.u2(b.length);
      } else {
        this.u1(TC_LONGSTRING);
        this.i8(BigInt(b.length));
      }

      this.push(b);
      this.strHandles.set(s, this.claim());
    }
    classDesc(name, uid, flags, fields, superName, superUid) {
      const h = this.classHandles.get(name);

      if (h !== undefined) {
        this.ref(h);
        return;
      }

      this.u1(TC_CLASSDESC);
      this.utf(name);
      this.i8(uid);
      this.u1(flags);
      this.u2(fields.length);

      for (const [tc, fn] of fields) {
        this.u1(tc.charCodeAt(0));
        this.utf(fn);
      }

      this.u1(TC_ENDBLOCKDATA); // empty classAnnotation
      this.classHandles.set(name, this.claim());

      if (superName == null) {
        this.u1(TC_NULL);
      } else {
        this.classDesc(superName, superUid, SC_SERIALIZABLE, []);
      }
    }
    box(b) {
      const info = BOX[b.box];
      this.u1(TC_OBJECT);

      if (b.box === 'Z') {
        this.classDesc(info.cls, info.uid, SC_SERIALIZABLE, [['Z', 'value']]);
      } else {
        this.classDesc(info.cls, info.uid, SC_SERIALIZABLE, [[b.box, 'value']], NUMBER.name, NUMBER.uid);
      }

      this.boxHandles.set(b, this.claim());

      if (b.box === 'Z') {
        this.u1(b.value ? 1 : 0);
      } else if (b.box === 'I') {
        this.i4(b.value);
      } else if (b.box === 'J') {
        this.i8(b.value);
      } else if (b.box === 'F') {
        this.f4(b.value);
      }
    }
    value(v) {
      if (v === null || v === undefined) {
        this.u1(TC_NULL);
      } else if (typeof v === 'string') {
        this.string(v);
      } else if (v.box) {
        const h = this.boxHandles.get(v);

        if (h !== undefined) {
          this.ref(h);
        } else {
          this.box(v);
        }
      } else if (v instanceof Map) {
        this.hashmap(v);
      } else {
        throw err(`cannot serialize ${typeof v}`);
      }
    }
    hashmap(m) {
      this.u1(TC_OBJECT);
      this.classDesc('java.util.HashMap', HASHMAP_UID, SC_WRITE_METHOD | SC_SERIALIZABLE, [
        ['F', 'loadFactor'],
        ['I', 'threshold'],
      ]);
      this.claim(); // the map's own handle
      const loadFactor = 0.75;
      const capacity = tableSizeFor(m.size, loadFactor);
      this.f4(loadFactor);
      this.i4(Math.trunc(capacity * loadFactor));
      this.u1(TC_BLOCKDATA);
      this.u1(8);
      this.i4(capacity);
      this.i4(m.size);

      for (const [k, val] of m) {
        this.value(k);
        this.value(val);
      }

      this.u1(TC_ENDBLOCKDATA);
    }
  }

  // Mirror HashMap's power-of-two capacity growth for a given entry count.
  function tableSizeFor(size, loadFactor) {
    let capacity = 16;

    while (size > capacity * loadFactor) {
      capacity <<= 1;
    }

    return capacity;
  }

  function dumps(root) {
    const w = new Writer();
    w.u2(STREAM_MAGIC);
    w.u2(STREAM_VERSION);
    w.value(root);
    return Uint8Array.from(w.out);
  }

  return { loads, dumps, box: (t, v) => ({ box: t, value: v }) };
})();
