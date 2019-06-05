'use strict'

const BN = require('bn')

// const OP_BASE = 0x50
const OP_PUSHDATA1 = 0x4c
const OP_PUSHDATA2 = 0x4d
const OP_PUSHDATA4 = 0x4e

const ScriptReader = function ScriptReader (buf) {
  if (!(this instanceof ScriptReader)) {
    return new ScriptReader(buf)
  }

  if (Buffer.isBuffer(buf)) {
    this.set({
      buf: buf
    })
  } else if (typeof buf === 'string') {
    var b = Buffer.from(buf, 'hex')
    if (b.length * 2 !== buf.length) { throw new TypeError('Invalid hex string') }

    this.set({
      buf: b
    })
  } else if (typeof buf === 'object') {
    var obj = buf
    this.set(obj)
  } else {
    throw new TypeError('Unrecognized argument for BufferReader')
  }
}

ScriptReader.prototype.set = function (obj) {
  this.buf = obj.buf || this.buf || undefined
  this.pos = obj.pos || this.pos || 0
  return this
}

ScriptReader.prototype.eof = function () {
  return this.pos >= this.buf.length
}

ScriptReader.prototype.finished = ScriptReader.prototype.eof

ScriptReader.prototype.read = function (len) {
  var buf = this.buf.slice(this.pos, this.pos + len)
  this.pos = this.pos + len
  return buf
}

ScriptReader.prototype.readAll = function () {
  var buf = this.buf.slice(this.pos, this.buf.length)
  this.pos = this.buf.length
  return buf
}

ScriptReader.prototype.readUInt8 = function () {
  var val = this.buf.readUInt8(this.pos)
  this.pos = this.pos + 1
  return val
}

ScriptReader.prototype.readUInt16BE = function () {
  var val = this.buf.readUInt16BE(this.pos)
  this.pos = this.pos + 2
  return val
}

ScriptReader.prototype.readUInt16LE = function () {
  var val = this.buf.readUInt16LE(this.pos)
  this.pos = this.pos + 2
  return val
}

ScriptReader.prototype.readUInt32BE = function () {
  var val = this.buf.readUInt32BE(this.pos)
  this.pos = this.pos + 4
  return val
}

ScriptReader.prototype.readUInt32LE = function () {
  var val = this.buf.readUInt32LE(this.pos)
  this.pos = this.pos + 4
  return val
}

ScriptReader.prototype.readInt32LE = function () {
  var val = this.buf.readInt32LE(this.pos)
  this.pos = this.pos + 4
  return val
}

ScriptReader.prototype.readUInt64BEBN = function () {
  var buf = this.buf.slice(this.pos, this.pos + 8)
  var bn = BN.fromBuffer(buf)
  this.pos = this.pos + 8
  return bn
}

ScriptReader.prototype.readUInt64LEBN = function () {
  var second = this.buf.readUInt32LE(this.pos)
  var first = this.buf.readUInt32LE(this.pos + 4)
  var combined = (first * 0x100000000) + second
  // Instantiating an instance of BN with a number is faster than with an
  // array or string. However, the maximum safe number for a double precision
  // floating point is 2 ^ 52 - 1 (0x1fffffffffffff), thus we can safely use
  // non-floating point numbers less than this amount (52 bits). And in the case
  // that the number is larger, we can instatiate an instance of BN by passing
  // an array from the buffer (slower) and specifying the endianness.
  var bn
  if (combined <= 0x1fffffffffffff) {
    bn = new BN(combined)
  } else {
    var data = Array.prototype.slice.call(this.buf, this.pos, this.pos + 8)
    bn = new BN(data, 10, 'le')
  }
  this.pos = this.pos + 8
  return bn
}

ScriptReader.prototype.readVarintNum = function () {
  var first = this.readUInt8()
  switch (first) {
    case 0xFD:
      return this.readUInt16LE()
    case 0xFE:
      return this.readUInt32LE()
    case 0xFF:
      return this.readUInt64LE()
    default:
      return first
  }
}

/**
 * reads a length prepended buffer
 */
ScriptReader.prototype.readVarLengthBuffer = function () {
  var len = this.readVarintNum()
  var buf = this.read(len)
  return buf
}

ScriptReader.prototype.readVarintBuf = function () {
  var first = this.buf.readUInt8(this.pos)
  switch (first) {
    case 0xFD:
      return this.read(1 + 2)
    case 0xFE:
      return this.read(1 + 4)
    case 0xFF:
      return this.read(1 + 8)
    default:
      return this.read(1)
  }
}

ScriptReader.prototype.readPushData = function () {
  const first = this.readUInt8()
  switch (first) {
    case OP_PUSHDATA1: {
      const len = this.readUInt8()
      const part = this.read(len)
      return part
    }

    case OP_PUSHDATA2: {
      const len = this.readUInt16LE()
      const part = this.read(len)
      return part
    }

    case OP_PUSHDATA4: {
      const len = this.readUInt32LE()
      const part = this.read(len)
      return part
    }

    default: {
      if (first >= 0x01 && first <= 0x4e) {
        const part = this.read(first)
        return part
      } else {
        return first
      }
    }
  }
}

ScriptReader.prototype.decodeParts = function () {
  const r = []

  while (!this.finished()) {
    r.push(this.readPushData())
  }

  return r
}

module.exports = ScriptReader
