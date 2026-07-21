var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/jsonwebtoken/lib/JsonWebTokenError.js
var require_JsonWebTokenError = __commonJS({
  "node_modules/jsonwebtoken/lib/JsonWebTokenError.js"(exports2, module2) {
    var JsonWebTokenError = function(message, error) {
      Error.call(this, message);
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }
      this.name = "JsonWebTokenError";
      this.message = message;
      if (error) this.inner = error;
    };
    JsonWebTokenError.prototype = Object.create(Error.prototype);
    JsonWebTokenError.prototype.constructor = JsonWebTokenError;
    module2.exports = JsonWebTokenError;
  }
});

// node_modules/jsonwebtoken/lib/NotBeforeError.js
var require_NotBeforeError = __commonJS({
  "node_modules/jsonwebtoken/lib/NotBeforeError.js"(exports2, module2) {
    var JsonWebTokenError = require_JsonWebTokenError();
    var NotBeforeError = function(message, date) {
      JsonWebTokenError.call(this, message);
      this.name = "NotBeforeError";
      this.date = date;
    };
    NotBeforeError.prototype = Object.create(JsonWebTokenError.prototype);
    NotBeforeError.prototype.constructor = NotBeforeError;
    module2.exports = NotBeforeError;
  }
});

// node_modules/jsonwebtoken/lib/TokenExpiredError.js
var require_TokenExpiredError = __commonJS({
  "node_modules/jsonwebtoken/lib/TokenExpiredError.js"(exports2, module2) {
    var JsonWebTokenError = require_JsonWebTokenError();
    var TokenExpiredError = function(message, expiredAt) {
      JsonWebTokenError.call(this, message);
      this.name = "TokenExpiredError";
      this.expiredAt = expiredAt;
    };
    TokenExpiredError.prototype = Object.create(JsonWebTokenError.prototype);
    TokenExpiredError.prototype.constructor = TokenExpiredError;
    module2.exports = TokenExpiredError;
  }
});

// node_modules/safe-buffer/index.js
var require_safe_buffer = __commonJS({
  "node_modules/safe-buffer/index.js"(exports2, module2) {
    var buffer = require("buffer");
    var Buffer2 = buffer.Buffer;
    function copyProps(src, dst) {
      for (var key in src) {
        dst[key] = src[key];
      }
    }
    if (Buffer2.from && Buffer2.alloc && Buffer2.allocUnsafe && Buffer2.allocUnsafeSlow) {
      module2.exports = buffer;
    } else {
      copyProps(buffer, exports2);
      exports2.Buffer = SafeBuffer;
    }
    function SafeBuffer(arg, encodingOrOffset, length) {
      return Buffer2(arg, encodingOrOffset, length);
    }
    SafeBuffer.prototype = Object.create(Buffer2.prototype);
    copyProps(Buffer2, SafeBuffer);
    SafeBuffer.from = function(arg, encodingOrOffset, length) {
      if (typeof arg === "number") {
        throw new TypeError("Argument must not be a number");
      }
      return Buffer2(arg, encodingOrOffset, length);
    };
    SafeBuffer.alloc = function(size, fill, encoding) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      var buf = Buffer2(size);
      if (fill !== void 0) {
        if (typeof encoding === "string") {
          buf.fill(fill, encoding);
        } else {
          buf.fill(fill);
        }
      } else {
        buf.fill(0);
      }
      return buf;
    };
    SafeBuffer.allocUnsafe = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return Buffer2(size);
    };
    SafeBuffer.allocUnsafeSlow = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return buffer.SlowBuffer(size);
    };
  }
});

// node_modules/jsonwebtoken/node_modules/jws/lib/data-stream.js
var require_data_stream = __commonJS({
  "node_modules/jsonwebtoken/node_modules/jws/lib/data-stream.js"(exports2, module2) {
    var Buffer2 = require_safe_buffer().Buffer;
    var Stream = require("stream");
    var util = require("util");
    function DataStream(data) {
      this.buffer = null;
      this.writable = true;
      this.readable = true;
      if (!data) {
        this.buffer = Buffer2.alloc(0);
        return this;
      }
      if (typeof data.pipe === "function") {
        this.buffer = Buffer2.alloc(0);
        data.pipe(this);
        return this;
      }
      if (data.length || typeof data === "object") {
        this.buffer = data;
        this.writable = false;
        process.nextTick(function() {
          this.emit("end", data);
          this.readable = false;
          this.emit("close");
        }.bind(this));
        return this;
      }
      throw new TypeError("Unexpected data type (" + typeof data + ")");
    }
    util.inherits(DataStream, Stream);
    DataStream.prototype.write = function write(data) {
      this.buffer = Buffer2.concat([this.buffer, Buffer2.from(data)]);
      this.emit("data", data);
    };
    DataStream.prototype.end = function end(data) {
      if (data)
        this.write(data);
      this.emit("end", data);
      this.emit("close");
      this.writable = false;
      this.readable = false;
    };
    module2.exports = DataStream;
  }
});

// node_modules/ecdsa-sig-formatter/src/param-bytes-for-alg.js
var require_param_bytes_for_alg = __commonJS({
  "node_modules/ecdsa-sig-formatter/src/param-bytes-for-alg.js"(exports2, module2) {
    "use strict";
    function getParamSize(keySize) {
      var result = (keySize / 8 | 0) + (keySize % 8 === 0 ? 0 : 1);
      return result;
    }
    var paramBytesForAlg = {
      ES256: getParamSize(256),
      ES384: getParamSize(384),
      ES512: getParamSize(521)
    };
    function getParamBytesForAlg(alg) {
      var paramBytes = paramBytesForAlg[alg];
      if (paramBytes) {
        return paramBytes;
      }
      throw new Error('Unknown algorithm "' + alg + '"');
    }
    module2.exports = getParamBytesForAlg;
  }
});

// node_modules/ecdsa-sig-formatter/src/ecdsa-sig-formatter.js
var require_ecdsa_sig_formatter = __commonJS({
  "node_modules/ecdsa-sig-formatter/src/ecdsa-sig-formatter.js"(exports2, module2) {
    "use strict";
    var Buffer2 = require_safe_buffer().Buffer;
    var getParamBytesForAlg = require_param_bytes_for_alg();
    var MAX_OCTET = 128;
    var CLASS_UNIVERSAL = 0;
    var PRIMITIVE_BIT = 32;
    var TAG_SEQ = 16;
    var TAG_INT = 2;
    var ENCODED_TAG_SEQ = TAG_SEQ | PRIMITIVE_BIT | CLASS_UNIVERSAL << 6;
    var ENCODED_TAG_INT = TAG_INT | CLASS_UNIVERSAL << 6;
    function base64Url(base64) {
      return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    }
    function signatureAsBuffer(signature) {
      if (Buffer2.isBuffer(signature)) {
        return signature;
      } else if ("string" === typeof signature) {
        return Buffer2.from(signature, "base64");
      }
      throw new TypeError("ECDSA signature must be a Base64 string or a Buffer");
    }
    function derToJose(signature, alg) {
      signature = signatureAsBuffer(signature);
      var paramBytes = getParamBytesForAlg(alg);
      var maxEncodedParamLength = paramBytes + 1;
      var inputLength = signature.length;
      var offset = 0;
      if (signature[offset++] !== ENCODED_TAG_SEQ) {
        throw new Error('Could not find expected "seq"');
      }
      var seqLength = signature[offset++];
      if (seqLength === (MAX_OCTET | 1)) {
        seqLength = signature[offset++];
      }
      if (inputLength - offset < seqLength) {
        throw new Error('"seq" specified length of "' + seqLength + '", only "' + (inputLength - offset) + '" remaining');
      }
      if (signature[offset++] !== ENCODED_TAG_INT) {
        throw new Error('Could not find expected "int" for "r"');
      }
      var rLength = signature[offset++];
      if (inputLength - offset - 2 < rLength) {
        throw new Error('"r" specified length of "' + rLength + '", only "' + (inputLength - offset - 2) + '" available');
      }
      if (maxEncodedParamLength < rLength) {
        throw new Error('"r" specified length of "' + rLength + '", max of "' + maxEncodedParamLength + '" is acceptable');
      }
      var rOffset = offset;
      offset += rLength;
      if (signature[offset++] !== ENCODED_TAG_INT) {
        throw new Error('Could not find expected "int" for "s"');
      }
      var sLength = signature[offset++];
      if (inputLength - offset !== sLength) {
        throw new Error('"s" specified length of "' + sLength + '", expected "' + (inputLength - offset) + '"');
      }
      if (maxEncodedParamLength < sLength) {
        throw new Error('"s" specified length of "' + sLength + '", max of "' + maxEncodedParamLength + '" is acceptable');
      }
      var sOffset = offset;
      offset += sLength;
      if (offset !== inputLength) {
        throw new Error('Expected to consume entire buffer, but "' + (inputLength - offset) + '" bytes remain');
      }
      var rPadding = paramBytes - rLength, sPadding = paramBytes - sLength;
      var dst = Buffer2.allocUnsafe(rPadding + rLength + sPadding + sLength);
      for (offset = 0; offset < rPadding; ++offset) {
        dst[offset] = 0;
      }
      signature.copy(dst, offset, rOffset + Math.max(-rPadding, 0), rOffset + rLength);
      offset = paramBytes;
      for (var o = offset; offset < o + sPadding; ++offset) {
        dst[offset] = 0;
      }
      signature.copy(dst, offset, sOffset + Math.max(-sPadding, 0), sOffset + sLength);
      dst = dst.toString("base64");
      dst = base64Url(dst);
      return dst;
    }
    function countPadding(buf, start, stop) {
      var padding = 0;
      while (start + padding < stop && buf[start + padding] === 0) {
        ++padding;
      }
      var needsSign = buf[start + padding] >= MAX_OCTET;
      if (needsSign) {
        --padding;
      }
      return padding;
    }
    function joseToDer(signature, alg) {
      signature = signatureAsBuffer(signature);
      var paramBytes = getParamBytesForAlg(alg);
      var signatureBytes = signature.length;
      if (signatureBytes !== paramBytes * 2) {
        throw new TypeError('"' + alg + '" signatures must be "' + paramBytes * 2 + '" bytes, saw "' + signatureBytes + '"');
      }
      var rPadding = countPadding(signature, 0, paramBytes);
      var sPadding = countPadding(signature, paramBytes, signature.length);
      var rLength = paramBytes - rPadding;
      var sLength = paramBytes - sPadding;
      var rsBytes = 1 + 1 + rLength + 1 + 1 + sLength;
      var shortLength = rsBytes < MAX_OCTET;
      var dst = Buffer2.allocUnsafe((shortLength ? 2 : 3) + rsBytes);
      var offset = 0;
      dst[offset++] = ENCODED_TAG_SEQ;
      if (shortLength) {
        dst[offset++] = rsBytes;
      } else {
        dst[offset++] = MAX_OCTET | 1;
        dst[offset++] = rsBytes & 255;
      }
      dst[offset++] = ENCODED_TAG_INT;
      dst[offset++] = rLength;
      if (rPadding < 0) {
        dst[offset++] = 0;
        offset += signature.copy(dst, offset, 0, paramBytes);
      } else {
        offset += signature.copy(dst, offset, rPadding, paramBytes);
      }
      dst[offset++] = ENCODED_TAG_INT;
      dst[offset++] = sLength;
      if (sPadding < 0) {
        dst[offset++] = 0;
        signature.copy(dst, offset, paramBytes);
      } else {
        signature.copy(dst, offset, paramBytes + sPadding);
      }
      return dst;
    }
    module2.exports = {
      derToJose,
      joseToDer
    };
  }
});

// node_modules/buffer-equal-constant-time/index.js
var require_buffer_equal_constant_time = __commonJS({
  "node_modules/buffer-equal-constant-time/index.js"(exports2, module2) {
    "use strict";
    var Buffer2 = require("buffer").Buffer;
    var SlowBuffer = require("buffer").SlowBuffer;
    module2.exports = bufferEq;
    function bufferEq(a, b) {
      if (!Buffer2.isBuffer(a) || !Buffer2.isBuffer(b)) {
        return false;
      }
      if (a.length !== b.length) {
        return false;
      }
      var c = 0;
      for (var i = 0; i < a.length; i++) {
        c |= a[i] ^ b[i];
      }
      return c === 0;
    }
    bufferEq.install = function() {
      Buffer2.prototype.equal = SlowBuffer.prototype.equal = function equal(that) {
        return bufferEq(this, that);
      };
    };
    var origBufEqual = Buffer2.prototype.equal;
    var origSlowBufEqual = SlowBuffer.prototype.equal;
    bufferEq.restore = function() {
      Buffer2.prototype.equal = origBufEqual;
      SlowBuffer.prototype.equal = origSlowBufEqual;
    };
  }
});

// node_modules/jsonwebtoken/node_modules/jwa/index.js
var require_jwa = __commonJS({
  "node_modules/jsonwebtoken/node_modules/jwa/index.js"(exports2, module2) {
    var Buffer2 = require_safe_buffer().Buffer;
    var crypto2 = require("crypto");
    var formatEcdsa = require_ecdsa_sig_formatter();
    var util = require("util");
    var MSG_INVALID_ALGORITHM = '"%s" is not a valid algorithm.\n  Supported algorithms are:\n  "HS256", "HS384", "HS512", "RS256", "RS384", "RS512", "PS256", "PS384", "PS512", "ES256", "ES384", "ES512" and "none".';
    var MSG_INVALID_SECRET = "secret must be a string or buffer";
    var MSG_INVALID_VERIFIER_KEY = "key must be a string or a buffer";
    var MSG_INVALID_SIGNER_KEY = "key must be a string, a buffer or an object";
    var supportsKeyObjects = typeof crypto2.createPublicKey === "function";
    if (supportsKeyObjects) {
      MSG_INVALID_VERIFIER_KEY += " or a KeyObject";
      MSG_INVALID_SECRET += "or a KeyObject";
    }
    function checkIsPublicKey(key) {
      if (Buffer2.isBuffer(key)) {
        return;
      }
      if (typeof key === "string") {
        return;
      }
      if (!supportsKeyObjects) {
        throw typeError(MSG_INVALID_VERIFIER_KEY);
      }
      if (typeof key !== "object") {
        throw typeError(MSG_INVALID_VERIFIER_KEY);
      }
      if (typeof key.type !== "string") {
        throw typeError(MSG_INVALID_VERIFIER_KEY);
      }
      if (typeof key.asymmetricKeyType !== "string") {
        throw typeError(MSG_INVALID_VERIFIER_KEY);
      }
      if (typeof key.export !== "function") {
        throw typeError(MSG_INVALID_VERIFIER_KEY);
      }
    }
    function checkIsPrivateKey(key) {
      if (Buffer2.isBuffer(key)) {
        return;
      }
      if (typeof key === "string") {
        return;
      }
      if (typeof key === "object") {
        return;
      }
      throw typeError(MSG_INVALID_SIGNER_KEY);
    }
    function checkIsSecretKey(key) {
      if (Buffer2.isBuffer(key)) {
        return;
      }
      if (typeof key === "string") {
        return key;
      }
      if (!supportsKeyObjects) {
        throw typeError(MSG_INVALID_SECRET);
      }
      if (typeof key !== "object") {
        throw typeError(MSG_INVALID_SECRET);
      }
      if (key.type !== "secret") {
        throw typeError(MSG_INVALID_SECRET);
      }
      if (typeof key.export !== "function") {
        throw typeError(MSG_INVALID_SECRET);
      }
    }
    function fromBase64(base64) {
      return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    }
    function toBase64(base64url) {
      base64url = base64url.toString();
      var padding = 4 - base64url.length % 4;
      if (padding !== 4) {
        for (var i = 0; i < padding; ++i) {
          base64url += "=";
        }
      }
      return base64url.replace(/\-/g, "+").replace(/_/g, "/");
    }
    function typeError(template) {
      var args = [].slice.call(arguments, 1);
      var errMsg = util.format.bind(util, template).apply(null, args);
      return new TypeError(errMsg);
    }
    function bufferOrString(obj) {
      return Buffer2.isBuffer(obj) || typeof obj === "string";
    }
    function normalizeInput(thing) {
      if (!bufferOrString(thing))
        thing = JSON.stringify(thing);
      return thing;
    }
    function createHmacSigner(bits) {
      return function sign(thing, secret) {
        checkIsSecretKey(secret);
        thing = normalizeInput(thing);
        var hmac = crypto2.createHmac("sha" + bits, secret);
        var sig = (hmac.update(thing), hmac.digest("base64"));
        return fromBase64(sig);
      };
    }
    var bufferEqual;
    var timingSafeEqual = "timingSafeEqual" in crypto2 ? function timingSafeEqual2(a, b) {
      if (a.byteLength !== b.byteLength) {
        return false;
      }
      return crypto2.timingSafeEqual(a, b);
    } : function timingSafeEqual2(a, b) {
      if (!bufferEqual) {
        bufferEqual = require_buffer_equal_constant_time();
      }
      return bufferEqual(a, b);
    };
    function createHmacVerifier(bits) {
      return function verify(thing, signature, secret) {
        var computedSig = createHmacSigner(bits)(thing, secret);
        return timingSafeEqual(Buffer2.from(signature), Buffer2.from(computedSig));
      };
    }
    function createKeySigner(bits) {
      return function sign(thing, privateKey) {
        checkIsPrivateKey(privateKey);
        thing = normalizeInput(thing);
        var signer = crypto2.createSign("RSA-SHA" + bits);
        var sig = (signer.update(thing), signer.sign(privateKey, "base64"));
        return fromBase64(sig);
      };
    }
    function createKeyVerifier(bits) {
      return function verify(thing, signature, publicKey) {
        checkIsPublicKey(publicKey);
        thing = normalizeInput(thing);
        signature = toBase64(signature);
        var verifier = crypto2.createVerify("RSA-SHA" + bits);
        verifier.update(thing);
        return verifier.verify(publicKey, signature, "base64");
      };
    }
    function createPSSKeySigner(bits) {
      return function sign(thing, privateKey) {
        checkIsPrivateKey(privateKey);
        thing = normalizeInput(thing);
        var signer = crypto2.createSign("RSA-SHA" + bits);
        var sig = (signer.update(thing), signer.sign({
          key: privateKey,
          padding: crypto2.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: crypto2.constants.RSA_PSS_SALTLEN_DIGEST
        }, "base64"));
        return fromBase64(sig);
      };
    }
    function createPSSKeyVerifier(bits) {
      return function verify(thing, signature, publicKey) {
        checkIsPublicKey(publicKey);
        thing = normalizeInput(thing);
        signature = toBase64(signature);
        var verifier = crypto2.createVerify("RSA-SHA" + bits);
        verifier.update(thing);
        return verifier.verify({
          key: publicKey,
          padding: crypto2.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: crypto2.constants.RSA_PSS_SALTLEN_DIGEST
        }, signature, "base64");
      };
    }
    function createECDSASigner(bits) {
      var inner = createKeySigner(bits);
      return function sign() {
        var signature = inner.apply(null, arguments);
        signature = formatEcdsa.derToJose(signature, "ES" + bits);
        return signature;
      };
    }
    function createECDSAVerifer(bits) {
      var inner = createKeyVerifier(bits);
      return function verify(thing, signature, publicKey) {
        signature = formatEcdsa.joseToDer(signature, "ES" + bits).toString("base64");
        var result = inner(thing, signature, publicKey);
        return result;
      };
    }
    function createNoneSigner() {
      return function sign() {
        return "";
      };
    }
    function createNoneVerifier() {
      return function verify(thing, signature) {
        return signature === "";
      };
    }
    module2.exports = function jwa(algorithm) {
      var signerFactories = {
        hs: createHmacSigner,
        rs: createKeySigner,
        ps: createPSSKeySigner,
        es: createECDSASigner,
        none: createNoneSigner
      };
      var verifierFactories = {
        hs: createHmacVerifier,
        rs: createKeyVerifier,
        ps: createPSSKeyVerifier,
        es: createECDSAVerifer,
        none: createNoneVerifier
      };
      var match = algorithm.match(/^(RS|PS|ES|HS)(256|384|512)$|^(none)$/i);
      if (!match)
        throw typeError(MSG_INVALID_ALGORITHM, algorithm);
      var algo = (match[1] || match[3]).toLowerCase();
      var bits = match[2];
      return {
        sign: signerFactories[algo](bits),
        verify: verifierFactories[algo](bits)
      };
    };
  }
});

// node_modules/jsonwebtoken/node_modules/jws/lib/tostring.js
var require_tostring = __commonJS({
  "node_modules/jsonwebtoken/node_modules/jws/lib/tostring.js"(exports2, module2) {
    var Buffer2 = require("buffer").Buffer;
    module2.exports = function toString(obj) {
      if (typeof obj === "string")
        return obj;
      if (typeof obj === "number" || Buffer2.isBuffer(obj))
        return obj.toString();
      return JSON.stringify(obj);
    };
  }
});

// node_modules/jsonwebtoken/node_modules/jws/lib/sign-stream.js
var require_sign_stream = __commonJS({
  "node_modules/jsonwebtoken/node_modules/jws/lib/sign-stream.js"(exports2, module2) {
    var Buffer2 = require_safe_buffer().Buffer;
    var DataStream = require_data_stream();
    var jwa = require_jwa();
    var Stream = require("stream");
    var toString = require_tostring();
    var util = require("util");
    function base64url(string, encoding) {
      return Buffer2.from(string, encoding).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    }
    function jwsSecuredInput(header, payload, encoding) {
      encoding = encoding || "utf8";
      var encodedHeader = base64url(toString(header), "binary");
      var encodedPayload = base64url(toString(payload), encoding);
      return util.format("%s.%s", encodedHeader, encodedPayload);
    }
    function jwsSign(opts) {
      var header = opts.header;
      var payload = opts.payload;
      var secretOrKey = opts.secret || opts.privateKey;
      var encoding = opts.encoding;
      var algo = jwa(header.alg);
      var securedInput = jwsSecuredInput(header, payload, encoding);
      var signature = algo.sign(securedInput, secretOrKey);
      return util.format("%s.%s", securedInput, signature);
    }
    function SignStream(opts) {
      var secret = opts.secret;
      secret = secret == null ? opts.privateKey : secret;
      secret = secret == null ? opts.key : secret;
      if (/^hs/i.test(opts.header.alg) === true && secret == null) {
        throw new TypeError("secret must be a string or buffer or a KeyObject");
      }
      var secretStream = new DataStream(secret);
      this.readable = true;
      this.header = opts.header;
      this.encoding = opts.encoding;
      this.secret = this.privateKey = this.key = secretStream;
      this.payload = new DataStream(opts.payload);
      this.secret.once("close", function() {
        if (!this.payload.writable && this.readable)
          this.sign();
      }.bind(this));
      this.payload.once("close", function() {
        if (!this.secret.writable && this.readable)
          this.sign();
      }.bind(this));
    }
    util.inherits(SignStream, Stream);
    SignStream.prototype.sign = function sign() {
      try {
        var signature = jwsSign({
          header: this.header,
          payload: this.payload.buffer,
          secret: this.secret.buffer,
          encoding: this.encoding
        });
        this.emit("done", signature);
        this.emit("data", signature);
        this.emit("end");
        this.readable = false;
        return signature;
      } catch (e) {
        this.readable = false;
        this.emit("error", e);
        this.emit("close");
      }
    };
    SignStream.sign = jwsSign;
    module2.exports = SignStream;
  }
});

// node_modules/jsonwebtoken/node_modules/jws/lib/verify-stream.js
var require_verify_stream = __commonJS({
  "node_modules/jsonwebtoken/node_modules/jws/lib/verify-stream.js"(exports2, module2) {
    var Buffer2 = require_safe_buffer().Buffer;
    var DataStream = require_data_stream();
    var jwa = require_jwa();
    var Stream = require("stream");
    var toString = require_tostring();
    var util = require("util");
    var JWS_REGEX = /^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$/;
    function isObject(thing) {
      return Object.prototype.toString.call(thing) === "[object Object]";
    }
    function safeJsonParse(thing) {
      if (isObject(thing))
        return thing;
      try {
        return JSON.parse(thing);
      } catch (e) {
        return void 0;
      }
    }
    function headerFromJWS(jwsSig) {
      var encodedHeader = jwsSig.split(".", 1)[0];
      return safeJsonParse(Buffer2.from(encodedHeader, "base64").toString("binary"));
    }
    function securedInputFromJWS(jwsSig) {
      return jwsSig.split(".", 2).join(".");
    }
    function signatureFromJWS(jwsSig) {
      return jwsSig.split(".")[2];
    }
    function payloadFromJWS(jwsSig, encoding) {
      encoding = encoding || "utf8";
      var payload = jwsSig.split(".")[1];
      return Buffer2.from(payload, "base64").toString(encoding);
    }
    function isValidJws(string) {
      return JWS_REGEX.test(string) && !!headerFromJWS(string);
    }
    function jwsVerify(jwsSig, algorithm, secretOrKey) {
      if (!algorithm) {
        var err = new Error("Missing algorithm parameter for jws.verify");
        err.code = "MISSING_ALGORITHM";
        throw err;
      }
      jwsSig = toString(jwsSig);
      var signature = signatureFromJWS(jwsSig);
      var securedInput = securedInputFromJWS(jwsSig);
      var algo = jwa(algorithm);
      return algo.verify(securedInput, signature, secretOrKey);
    }
    function jwsDecode(jwsSig, opts) {
      opts = opts || {};
      jwsSig = toString(jwsSig);
      if (!isValidJws(jwsSig))
        return null;
      var header = headerFromJWS(jwsSig);
      if (!header)
        return null;
      var payload = payloadFromJWS(jwsSig);
      if (header.typ === "JWT" || opts.json)
        payload = JSON.parse(payload, opts.encoding);
      return {
        header,
        payload,
        signature: signatureFromJWS(jwsSig)
      };
    }
    function VerifyStream(opts) {
      opts = opts || {};
      var secretOrKey = opts.secret;
      secretOrKey = secretOrKey == null ? opts.publicKey : secretOrKey;
      secretOrKey = secretOrKey == null ? opts.key : secretOrKey;
      if (/^hs/i.test(opts.algorithm) === true && secretOrKey == null) {
        throw new TypeError("secret must be a string or buffer or a KeyObject");
      }
      var secretStream = new DataStream(secretOrKey);
      this.readable = true;
      this.algorithm = opts.algorithm;
      this.encoding = opts.encoding;
      this.secret = this.publicKey = this.key = secretStream;
      this.signature = new DataStream(opts.signature);
      this.secret.once("close", function() {
        if (!this.signature.writable && this.readable)
          this.verify();
      }.bind(this));
      this.signature.once("close", function() {
        if (!this.secret.writable && this.readable)
          this.verify();
      }.bind(this));
    }
    util.inherits(VerifyStream, Stream);
    VerifyStream.prototype.verify = function verify() {
      try {
        var valid = jwsVerify(this.signature.buffer, this.algorithm, this.key.buffer);
        var obj = jwsDecode(this.signature.buffer, this.encoding);
        this.emit("done", valid, obj);
        this.emit("data", valid);
        this.emit("end");
        this.readable = false;
        return valid;
      } catch (e) {
        this.readable = false;
        this.emit("error", e);
        this.emit("close");
      }
    };
    VerifyStream.decode = jwsDecode;
    VerifyStream.isValid = isValidJws;
    VerifyStream.verify = jwsVerify;
    module2.exports = VerifyStream;
  }
});

// node_modules/jsonwebtoken/node_modules/jws/index.js
var require_jws = __commonJS({
  "node_modules/jsonwebtoken/node_modules/jws/index.js"(exports2) {
    var SignStream = require_sign_stream();
    var VerifyStream = require_verify_stream();
    var ALGORITHMS = [
      "HS256",
      "HS384",
      "HS512",
      "RS256",
      "RS384",
      "RS512",
      "PS256",
      "PS384",
      "PS512",
      "ES256",
      "ES384",
      "ES512"
    ];
    exports2.ALGORITHMS = ALGORITHMS;
    exports2.sign = SignStream.sign;
    exports2.verify = VerifyStream.verify;
    exports2.decode = VerifyStream.decode;
    exports2.isValid = VerifyStream.isValid;
    exports2.createSign = function createSign(opts) {
      return new SignStream(opts);
    };
    exports2.createVerify = function createVerify(opts) {
      return new VerifyStream(opts);
    };
  }
});

// node_modules/jsonwebtoken/decode.js
var require_decode = __commonJS({
  "node_modules/jsonwebtoken/decode.js"(exports2, module2) {
    var jws = require_jws();
    module2.exports = function(jwt2, options) {
      options = options || {};
      var decoded = jws.decode(jwt2, options);
      if (!decoded) {
        return null;
      }
      var payload = decoded.payload;
      if (typeof payload === "string") {
        try {
          var obj = JSON.parse(payload);
          if (obj !== null && typeof obj === "object") {
            payload = obj;
          }
        } catch (e) {
        }
      }
      if (options.complete === true) {
        return {
          header: decoded.header,
          payload,
          signature: decoded.signature
        };
      }
      return payload;
    };
  }
});

// node_modules/ms/index.js
var require_ms = __commonJS({
  "node_modules/ms/index.js"(exports2, module2) {
    var s = 1e3;
    var m = s * 60;
    var h = m * 60;
    var d = h * 24;
    var w = d * 7;
    var y = d * 365.25;
    module2.exports = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === "string" && val.length > 0) {
        return parse(val);
      } else if (type === "number" && isFinite(val)) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
      );
    };
    function parse(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || "ms").toLowerCase();
      switch (type) {
        case "years":
        case "year":
        case "yrs":
        case "yr":
        case "y":
          return n * y;
        case "weeks":
        case "week":
        case "w":
          return n * w;
        case "days":
        case "day":
        case "d":
          return n * d;
        case "hours":
        case "hour":
        case "hrs":
        case "hr":
        case "h":
          return n * h;
        case "minutes":
        case "minute":
        case "mins":
        case "min":
        case "m":
          return n * m;
        case "seconds":
        case "second":
        case "secs":
        case "sec":
        case "s":
          return n * s;
        case "milliseconds":
        case "millisecond":
        case "msecs":
        case "msec":
        case "ms":
          return n;
        default:
          return void 0;
      }
    }
    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return Math.round(ms / d) + "d";
      }
      if (msAbs >= h) {
        return Math.round(ms / h) + "h";
      }
      if (msAbs >= m) {
        return Math.round(ms / m) + "m";
      }
      if (msAbs >= s) {
        return Math.round(ms / s) + "s";
      }
      return ms + "ms";
    }
    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return plural(ms, msAbs, d, "day");
      }
      if (msAbs >= h) {
        return plural(ms, msAbs, h, "hour");
      }
      if (msAbs >= m) {
        return plural(ms, msAbs, m, "minute");
      }
      if (msAbs >= s) {
        return plural(ms, msAbs, s, "second");
      }
      return ms + " ms";
    }
    function plural(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5;
      return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
    }
  }
});

// node_modules/jsonwebtoken/lib/timespan.js
var require_timespan = __commonJS({
  "node_modules/jsonwebtoken/lib/timespan.js"(exports2, module2) {
    var ms = require_ms();
    module2.exports = function(time, iat) {
      var timestamp = iat || Math.floor(Date.now() / 1e3);
      if (typeof time === "string") {
        var milliseconds = ms(time);
        if (typeof milliseconds === "undefined") {
          return;
        }
        return Math.floor(timestamp + milliseconds / 1e3);
      } else if (typeof time === "number") {
        return timestamp + time;
      } else {
        return;
      }
    };
  }
});

// node_modules/semver/internal/constants.js
var require_constants = __commonJS({
  "node_modules/semver/internal/constants.js"(exports2, module2) {
    "use strict";
    var SEMVER_SPEC_VERSION = "2.0.0";
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
    9007199254740991;
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
    var RELEASE_TYPES = [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease"
    ];
    module2.exports = {
      MAX_LENGTH,
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_SAFE_INTEGER,
      RELEASE_TYPES,
      SEMVER_SPEC_VERSION,
      FLAG_INCLUDE_PRERELEASE: 1,
      FLAG_LOOSE: 2
    };
  }
});

// node_modules/semver/internal/debug.js
var require_debug = __commonJS({
  "node_modules/semver/internal/debug.js"(exports2, module2) {
    "use strict";
    var debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
    };
    module2.exports = debug;
  }
});

// node_modules/semver/internal/re.js
var require_re = __commonJS({
  "node_modules/semver/internal/re.js"(exports2, module2) {
    "use strict";
    var {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = require_constants();
    var debug = require_debug();
    exports2 = module2.exports = {};
    var re = exports2.re = [];
    var safeRe = exports2.safeRe = [];
    var src = exports2.src = [];
    var safeSrc = exports2.safeSrc = [];
    var t = exports2.t = {};
    var R = 0;
    var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    var safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    var makeSafeRegex = (value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      }
      return value;
    };
    var createToken = (name, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug(name, index, value);
      t[name] = index;
      src[index] = value;
      safeSrc[index] = safe;
      re[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("COERCERTLFULL", src[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports2.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports2.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports2.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  }
});

// node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJS({
  "node_modules/semver/internal/parse-options.js"(exports2, module2) {
    "use strict";
    var looseOption = Object.freeze({ loose: true });
    var emptyOpts = Object.freeze({});
    var parseOptions = (options) => {
      if (!options) {
        return emptyOpts;
      }
      if (typeof options !== "object") {
        return looseOption;
      }
      return options;
    };
    module2.exports = parseOptions;
  }
});

// node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS({
  "node_modules/semver/internal/identifiers.js"(exports2, module2) {
    "use strict";
    var numeric = /^[0-9]+$/;
    var compareIdentifiers = (a, b) => {
      if (typeof a === "number" && typeof b === "number") {
        return a === b ? 0 : a < b ? -1 : 1;
      }
      const anum = numeric.test(a);
      const bnum = numeric.test(b);
      if (anum && bnum) {
        a = +a;
        b = +b;
      }
      return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    };
    var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
    module2.exports = {
      compareIdentifiers,
      rcompareIdentifiers
    };
  }
});

// node_modules/semver/classes/semver.js
var require_semver = __commonJS({
  "node_modules/semver/classes/semver.js"(exports2, module2) {
    "use strict";
    var debug = require_debug();
    var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
    var { safeRe: re, t } = require_re();
    var parseOptions = require_parse_options();
    var { compareIdentifiers } = require_identifiers();
    var SemVer = class _SemVer {
      constructor(version, options) {
        options = parseOptions(options);
        if (version instanceof _SemVer) {
          if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
            return version;
          } else {
            version = version.version;
          }
        } else if (typeof version !== "string") {
          throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
        }
        if (version.length > MAX_LENGTH) {
          throw new TypeError(
            `version is longer than ${MAX_LENGTH} characters`
          );
        }
        debug("SemVer", version, options);
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
        if (!m) {
          throw new TypeError(`Invalid Version: ${version}`);
        }
        this.raw = version;
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
          throw new TypeError("Invalid major version");
        }
        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
          throw new TypeError("Invalid minor version");
        }
        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
          throw new TypeError("Invalid patch version");
        }
        if (!m[4]) {
          this.prerelease = [];
        } else {
          this.prerelease = m[4].split(".").map((id) => {
            if (/^[0-9]+$/.test(id)) {
              const num = +id;
              if (num >= 0 && num < MAX_SAFE_INTEGER) {
                return num;
              }
            }
            return id;
          });
        }
        this.build = m[5] ? m[5].split(".") : [];
        this.format();
      }
      format() {
        this.version = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease.length) {
          this.version += `-${this.prerelease.join(".")}`;
        }
        return this.version;
      }
      toString() {
        return this.version;
      }
      compare(other) {
        debug("SemVer.compare", this.version, this.options, other);
        if (!(other instanceof _SemVer)) {
          if (typeof other === "string" && other === this.version) {
            return 0;
          }
          other = new _SemVer(other, this.options);
        }
        if (other.version === this.version) {
          return 0;
        }
        return this.compareMain(other) || this.comparePre(other);
      }
      compareMain(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.major < other.major) {
          return -1;
        }
        if (this.major > other.major) {
          return 1;
        }
        if (this.minor < other.minor) {
          return -1;
        }
        if (this.minor > other.minor) {
          return 1;
        }
        if (this.patch < other.patch) {
          return -1;
        }
        if (this.patch > other.patch) {
          return 1;
        }
        return 0;
      }
      comparePre(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.prerelease.length && !other.prerelease.length) {
          return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
          return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
          return 0;
        }
        let i = 0;
        do {
          const a = this.prerelease[i];
          const b = other.prerelease[i];
          debug("prerelease compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      compareBuild(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        let i = 0;
        do {
          const a = this.build[i];
          const b = other.build[i];
          debug("build compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      // preminor will bump the version up to the next minor release, and immediately
      // down to pre-release. premajor and prepatch work the same way.
      inc(release, identifier, identifierBase) {
        if (release.startsWith("pre")) {
          if (!identifier && identifierBase === false) {
            throw new Error("invalid increment argument: identifier is empty");
          }
          if (identifier) {
            const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
            if (!match || match[1] !== identifier) {
              throw new Error(`invalid identifier: ${identifier}`);
            }
          }
        }
        switch (release) {
          case "premajor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor = 0;
            this.major++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "preminor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "prepatch":
            this.prerelease.length = 0;
            this.inc("patch", identifier, identifierBase);
            this.inc("pre", identifier, identifierBase);
            break;
          // If the input is a non-prerelease version, this acts the same as
          // prepatch.
          case "prerelease":
            if (this.prerelease.length === 0) {
              this.inc("patch", identifier, identifierBase);
            }
            this.inc("pre", identifier, identifierBase);
            break;
          case "release":
            if (this.prerelease.length === 0) {
              throw new Error(`version ${this.raw} is not a prerelease`);
            }
            this.prerelease.length = 0;
            break;
          case "major":
            if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
              this.major++;
            }
            this.minor = 0;
            this.patch = 0;
            this.prerelease = [];
            break;
          case "minor":
            if (this.patch !== 0 || this.prerelease.length === 0) {
              this.minor++;
            }
            this.patch = 0;
            this.prerelease = [];
            break;
          case "patch":
            if (this.prerelease.length === 0) {
              this.patch++;
            }
            this.prerelease = [];
            break;
          // This probably shouldn't be used publicly.
          // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
          case "pre": {
            const base = Number(identifierBase) ? 1 : 0;
            if (this.prerelease.length === 0) {
              this.prerelease = [base];
            } else {
              let i = this.prerelease.length;
              while (--i >= 0) {
                if (typeof this.prerelease[i] === "number") {
                  this.prerelease[i]++;
                  i = -2;
                }
              }
              if (i === -1) {
                if (identifier === this.prerelease.join(".") && identifierBase === false) {
                  throw new Error("invalid increment argument: identifier already exists");
                }
                this.prerelease.push(base);
              }
            }
            if (identifier) {
              let prerelease = [identifier, base];
              if (identifierBase === false) {
                prerelease = [identifier];
              }
              if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
                if (isNaN(this.prerelease[1])) {
                  this.prerelease = prerelease;
                }
              } else {
                this.prerelease = prerelease;
              }
            }
            break;
          }
          default:
            throw new Error(`invalid increment argument: ${release}`);
        }
        this.raw = this.format();
        if (this.build.length) {
          this.raw += `+${this.build.join(".")}`;
        }
        return this;
      }
    };
    module2.exports = SemVer;
  }
});

// node_modules/semver/functions/parse.js
var require_parse = __commonJS({
  "node_modules/semver/functions/parse.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var parse = (version, options, throwErrors = false) => {
      if (version instanceof SemVer) {
        return version;
      }
      try {
        return new SemVer(version, options);
      } catch (er) {
        if (!throwErrors) {
          return null;
        }
        throw er;
      }
    };
    module2.exports = parse;
  }
});

// node_modules/semver/functions/valid.js
var require_valid = __commonJS({
  "node_modules/semver/functions/valid.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var valid = (version, options) => {
      const v = parse(version, options);
      return v ? v.version : null;
    };
    module2.exports = valid;
  }
});

// node_modules/semver/functions/clean.js
var require_clean = __commonJS({
  "node_modules/semver/functions/clean.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var clean = (version, options) => {
      const s = parse(version.trim().replace(/^[=v]+/, ""), options);
      return s ? s.version : null;
    };
    module2.exports = clean;
  }
});

// node_modules/semver/functions/inc.js
var require_inc = __commonJS({
  "node_modules/semver/functions/inc.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var inc = (version, release, options, identifier, identifierBase) => {
      if (typeof options === "string") {
        identifierBase = identifier;
        identifier = options;
        options = void 0;
      }
      try {
        return new SemVer(
          version instanceof SemVer ? version.version : version,
          options
        ).inc(release, identifier, identifierBase).version;
      } catch (er) {
        return null;
      }
    };
    module2.exports = inc;
  }
});

// node_modules/semver/functions/diff.js
var require_diff = __commonJS({
  "node_modules/semver/functions/diff.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var diff = (version1, version2) => {
      const v1 = parse(version1, null, true);
      const v2 = parse(version2, null, true);
      const comparison = v1.compare(v2);
      if (comparison === 0) {
        return null;
      }
      const v1Higher = comparison > 0;
      const highVersion = v1Higher ? v1 : v2;
      const lowVersion = v1Higher ? v2 : v1;
      const highHasPre = !!highVersion.prerelease.length;
      const lowHasPre = !!lowVersion.prerelease.length;
      if (lowHasPre && !highHasPre) {
        if (!lowVersion.patch && !lowVersion.minor) {
          return "major";
        }
        if (lowVersion.compareMain(highVersion) === 0) {
          if (lowVersion.minor && !lowVersion.patch) {
            return "minor";
          }
          return "patch";
        }
      }
      const prefix = highHasPre ? "pre" : "";
      if (v1.major !== v2.major) {
        return prefix + "major";
      }
      if (v1.minor !== v2.minor) {
        return prefix + "minor";
      }
      if (v1.patch !== v2.patch) {
        return prefix + "patch";
      }
      return "prerelease";
    };
    module2.exports = diff;
  }
});

// node_modules/semver/functions/major.js
var require_major = __commonJS({
  "node_modules/semver/functions/major.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var major = (a, loose) => new SemVer(a, loose).major;
    module2.exports = major;
  }
});

// node_modules/semver/functions/minor.js
var require_minor = __commonJS({
  "node_modules/semver/functions/minor.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var minor = (a, loose) => new SemVer(a, loose).minor;
    module2.exports = minor;
  }
});

// node_modules/semver/functions/patch.js
var require_patch = __commonJS({
  "node_modules/semver/functions/patch.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var patch = (a, loose) => new SemVer(a, loose).patch;
    module2.exports = patch;
  }
});

// node_modules/semver/functions/prerelease.js
var require_prerelease = __commonJS({
  "node_modules/semver/functions/prerelease.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var prerelease = (version, options) => {
      const parsed = parse(version, options);
      return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    };
    module2.exports = prerelease;
  }
});

// node_modules/semver/functions/compare.js
var require_compare = __commonJS({
  "node_modules/semver/functions/compare.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var compare2 = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
    module2.exports = compare2;
  }
});

// node_modules/semver/functions/rcompare.js
var require_rcompare = __commonJS({
  "node_modules/semver/functions/rcompare.js"(exports2, module2) {
    "use strict";
    var compare2 = require_compare();
    var rcompare = (a, b, loose) => compare2(b, a, loose);
    module2.exports = rcompare;
  }
});

// node_modules/semver/functions/compare-loose.js
var require_compare_loose = __commonJS({
  "node_modules/semver/functions/compare-loose.js"(exports2, module2) {
    "use strict";
    var compare2 = require_compare();
    var compareLoose = (a, b) => compare2(a, b, true);
    module2.exports = compareLoose;
  }
});

// node_modules/semver/functions/compare-build.js
var require_compare_build = __commonJS({
  "node_modules/semver/functions/compare-build.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var compareBuild = (a, b, loose) => {
      const versionA = new SemVer(a, loose);
      const versionB = new SemVer(b, loose);
      return versionA.compare(versionB) || versionA.compareBuild(versionB);
    };
    module2.exports = compareBuild;
  }
});

// node_modules/semver/functions/sort.js
var require_sort = __commonJS({
  "node_modules/semver/functions/sort.js"(exports2, module2) {
    "use strict";
    var compareBuild = require_compare_build();
    var sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
    module2.exports = sort;
  }
});

// node_modules/semver/functions/rsort.js
var require_rsort = __commonJS({
  "node_modules/semver/functions/rsort.js"(exports2, module2) {
    "use strict";
    var compareBuild = require_compare_build();
    var rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
    module2.exports = rsort;
  }
});

// node_modules/semver/functions/gt.js
var require_gt = __commonJS({
  "node_modules/semver/functions/gt.js"(exports2, module2) {
    "use strict";
    var compare2 = require_compare();
    var gt = (a, b, loose) => compare2(a, b, loose) > 0;
    module2.exports = gt;
  }
});

// node_modules/semver/functions/lt.js
var require_lt = __commonJS({
  "node_modules/semver/functions/lt.js"(exports2, module2) {
    "use strict";
    var compare2 = require_compare();
    var lt = (a, b, loose) => compare2(a, b, loose) < 0;
    module2.exports = lt;
  }
});

// node_modules/semver/functions/eq.js
var require_eq = __commonJS({
  "node_modules/semver/functions/eq.js"(exports2, module2) {
    "use strict";
    var compare2 = require_compare();
    var eq = (a, b, loose) => compare2(a, b, loose) === 0;
    module2.exports = eq;
  }
});

// node_modules/semver/functions/neq.js
var require_neq = __commonJS({
  "node_modules/semver/functions/neq.js"(exports2, module2) {
    "use strict";
    var compare2 = require_compare();
    var neq = (a, b, loose) => compare2(a, b, loose) !== 0;
    module2.exports = neq;
  }
});

// node_modules/semver/functions/gte.js
var require_gte = __commonJS({
  "node_modules/semver/functions/gte.js"(exports2, module2) {
    "use strict";
    var compare2 = require_compare();
    var gte = (a, b, loose) => compare2(a, b, loose) >= 0;
    module2.exports = gte;
  }
});

// node_modules/semver/functions/lte.js
var require_lte = __commonJS({
  "node_modules/semver/functions/lte.js"(exports2, module2) {
    "use strict";
    var compare2 = require_compare();
    var lte = (a, b, loose) => compare2(a, b, loose) <= 0;
    module2.exports = lte;
  }
});

// node_modules/semver/functions/cmp.js
var require_cmp = __commonJS({
  "node_modules/semver/functions/cmp.js"(exports2, module2) {
    "use strict";
    var eq = require_eq();
    var neq = require_neq();
    var gt = require_gt();
    var gte = require_gte();
    var lt = require_lt();
    var lte = require_lte();
    var cmp = (a, op, b, loose) => {
      switch (op) {
        case "===":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a === b;
        case "!==":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a !== b;
        case "":
        case "=":
        case "==":
          return eq(a, b, loose);
        case "!=":
          return neq(a, b, loose);
        case ">":
          return gt(a, b, loose);
        case ">=":
          return gte(a, b, loose);
        case "<":
          return lt(a, b, loose);
        case "<=":
          return lte(a, b, loose);
        default:
          throw new TypeError(`Invalid operator: ${op}`);
      }
    };
    module2.exports = cmp;
  }
});

// node_modules/semver/functions/coerce.js
var require_coerce = __commonJS({
  "node_modules/semver/functions/coerce.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var parse = require_parse();
    var { safeRe: re, t } = require_re();
    var coerce = (version, options) => {
      if (version instanceof SemVer) {
        return version;
      }
      if (typeof version === "number") {
        version = String(version);
      }
      if (typeof version !== "string") {
        return null;
      }
      options = options || {};
      let match = null;
      if (!options.rtl) {
        match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
      } else {
        const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
        let next;
        while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
          if (!match || next.index + next[0].length !== match.index + match[0].length) {
            match = next;
          }
          coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
        }
        coerceRtlRegex.lastIndex = -1;
      }
      if (match === null) {
        return null;
      }
      const major = match[2];
      const minor = match[3] || "0";
      const patch = match[4] || "0";
      const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
      const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
      return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options);
    };
    module2.exports = coerce;
  }
});

// node_modules/semver/internal/lrucache.js
var require_lrucache = __commonJS({
  "node_modules/semver/internal/lrucache.js"(exports2, module2) {
    "use strict";
    var LRUCache = class {
      constructor() {
        this.max = 1e3;
        this.map = /* @__PURE__ */ new Map();
      }
      get(key) {
        const value = this.map.get(key);
        if (value === void 0) {
          return void 0;
        } else {
          this.map.delete(key);
          this.map.set(key, value);
          return value;
        }
      }
      delete(key) {
        return this.map.delete(key);
      }
      set(key, value) {
        const deleted = this.delete(key);
        if (!deleted && value !== void 0) {
          if (this.map.size >= this.max) {
            const firstKey = this.map.keys().next().value;
            this.delete(firstKey);
          }
          this.map.set(key, value);
        }
        return this;
      }
    };
    module2.exports = LRUCache;
  }
});

// node_modules/semver/classes/range.js
var require_range = __commonJS({
  "node_modules/semver/classes/range.js"(exports2, module2) {
    "use strict";
    var SPACE_CHARACTERS = /\s+/g;
    var Range = class _Range {
      constructor(range, options) {
        options = parseOptions(options);
        if (range instanceof _Range) {
          if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) {
            return range;
          } else {
            return new _Range(range.raw, options);
          }
        }
        if (range instanceof Comparator) {
          this.raw = range.value;
          this.set = [[range]];
          this.formatted = void 0;
          return this;
        }
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
        this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
        if (!this.set.length) {
          throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
        }
        if (this.set.length > 1) {
          const first = this.set[0];
          this.set = this.set.filter((c) => !isNullSet(c[0]));
          if (this.set.length === 0) {
            this.set = [first];
          } else if (this.set.length > 1) {
            for (const c of this.set) {
              if (c.length === 1 && isAny(c[0])) {
                this.set = [c];
                break;
              }
            }
          }
        }
        this.formatted = void 0;
      }
      get range() {
        if (this.formatted === void 0) {
          this.formatted = "";
          for (let i = 0; i < this.set.length; i++) {
            if (i > 0) {
              this.formatted += "||";
            }
            const comps = this.set[i];
            for (let k = 0; k < comps.length; k++) {
              if (k > 0) {
                this.formatted += " ";
              }
              this.formatted += comps[k].toString().trim();
            }
          }
        }
        return this.formatted;
      }
      format() {
        return this.range;
      }
      toString() {
        return this.range;
      }
      parseRange(range) {
        const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
        const memoKey = memoOpts + ":" + range;
        const cached = cache.get(memoKey);
        if (cached) {
          return cached;
        }
        const loose = this.options.loose;
        const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
        range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
        debug("hyphen replace", range);
        range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
        debug("comparator trim", range);
        range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
        debug("tilde trim", range);
        range = range.replace(re[t.CARETTRIM], caretTrimReplace);
        debug("caret trim", range);
        let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
        if (loose) {
          rangeList = rangeList.filter((comp) => {
            debug("loose invalid filter", comp, this.options);
            return !!comp.match(re[t.COMPARATORLOOSE]);
          });
        }
        debug("range list", rangeList);
        const rangeMap = /* @__PURE__ */ new Map();
        const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
        for (const comp of comparators) {
          if (isNullSet(comp)) {
            return [comp];
          }
          rangeMap.set(comp.value, comp);
        }
        if (rangeMap.size > 1 && rangeMap.has("")) {
          rangeMap.delete("");
        }
        const result = [...rangeMap.values()];
        cache.set(memoKey, result);
        return result;
      }
      intersects(range, options) {
        if (!(range instanceof _Range)) {
          throw new TypeError("a Range is required");
        }
        return this.set.some((thisComparators) => {
          return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
            return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
              return rangeComparators.every((rangeComparator) => {
                return thisComparator.intersects(rangeComparator, options);
              });
            });
          });
        });
      }
      // if ANY of the sets match ALL of its comparators, then pass
      test(version) {
        if (!version) {
          return false;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        for (let i = 0; i < this.set.length; i++) {
          if (testSet(this.set[i], version, this.options)) {
            return true;
          }
        }
        return false;
      }
    };
    module2.exports = Range;
    var LRU = require_lrucache();
    var cache = new LRU();
    var parseOptions = require_parse_options();
    var Comparator = require_comparator();
    var debug = require_debug();
    var SemVer = require_semver();
    var {
      safeRe: re,
      t,
      comparatorTrimReplace,
      tildeTrimReplace,
      caretTrimReplace
    } = require_re();
    var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
    var isNullSet = (c) => c.value === "<0.0.0-0";
    var isAny = (c) => c.value === "";
    var isSatisfiable = (comparators, options) => {
      let result = true;
      const remainingComparators = comparators.slice();
      let testComparator = remainingComparators.pop();
      while (result && remainingComparators.length) {
        result = remainingComparators.every((otherComparator) => {
          return testComparator.intersects(otherComparator, options);
        });
        testComparator = remainingComparators.pop();
      }
      return result;
    };
    var parseComparator = (comp, options) => {
      comp = comp.replace(re[t.BUILD], "");
      debug("comp", comp, options);
      comp = replaceCarets(comp, options);
      debug("caret", comp);
      comp = replaceTildes(comp, options);
      debug("tildes", comp);
      comp = replaceXRanges(comp, options);
      debug("xrange", comp);
      comp = replaceStars(comp, options);
      debug("stars", comp);
      return comp;
    };
    var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
    var replaceTildes = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
    };
    var replaceTilde = (comp, options) => {
      const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("tilde", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0 <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0`;
        } else if (pr) {
          debug("replaceTilde pr", pr);
          ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
        }
        debug("tilde return", ret);
        return ret;
      });
    };
    var replaceCarets = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
    };
    var replaceCaret = (comp, options) => {
      debug("caret", comp, options);
      const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
      const z = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("caret", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          if (M === "0") {
            ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
          } else {
            ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
          }
        } else if (pr) {
          debug("replaceCaret pr", pr);
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
          }
        } else {
          debug("no pr");
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}${z} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}${z} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
          }
        }
        debug("caret return", ret);
        return ret;
      });
    };
    var replaceXRanges = (comp, options) => {
      debug("replaceXRanges", comp, options);
      return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
    };
    var replaceXRange = (comp, options) => {
      comp = comp.trim();
      const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
      return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
        debug("xRange", comp, ret, gtlt, M, m, p, pr);
        const xM = isX(M);
        const xm = xM || isX(m);
        const xp = xm || isX(p);
        const anyX = xp;
        if (gtlt === "=" && anyX) {
          gtlt = "";
        }
        pr = options.includePrerelease ? "-0" : "";
        if (xM) {
          if (gtlt === ">" || gtlt === "<") {
            ret = "<0.0.0-0";
          } else {
            ret = "*";
          }
        } else if (gtlt && anyX) {
          if (xm) {
            m = 0;
          }
          p = 0;
          if (gtlt === ">") {
            gtlt = ">=";
            if (xm) {
              M = +M + 1;
              m = 0;
              p = 0;
            } else {
              m = +m + 1;
              p = 0;
            }
          } else if (gtlt === "<=") {
            gtlt = "<";
            if (xm) {
              M = +M + 1;
            } else {
              m = +m + 1;
            }
          }
          if (gtlt === "<") {
            pr = "-0";
          }
          ret = `${gtlt + M}.${m}.${p}${pr}`;
        } else if (xm) {
          ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
        } else if (xp) {
          ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
        }
        debug("xRange return", ret);
        return ret;
      });
    };
    var replaceStars = (comp, options) => {
      debug("replaceStars", comp, options);
      return comp.trim().replace(re[t.STAR], "");
    };
    var replaceGTE0 = (comp, options) => {
      debug("replaceGTE0", comp, options);
      return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
    };
    var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
      if (isX(fM)) {
        from = "";
      } else if (isX(fm)) {
        from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
      } else if (isX(fp)) {
        from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
      } else if (fpr) {
        from = `>=${from}`;
      } else {
        from = `>=${from}${incPr ? "-0" : ""}`;
      }
      if (isX(tM)) {
        to = "";
      } else if (isX(tm)) {
        to = `<${+tM + 1}.0.0-0`;
      } else if (isX(tp)) {
        to = `<${tM}.${+tm + 1}.0-0`;
      } else if (tpr) {
        to = `<=${tM}.${tm}.${tp}-${tpr}`;
      } else if (incPr) {
        to = `<${tM}.${tm}.${+tp + 1}-0`;
      } else {
        to = `<=${to}`;
      }
      return `${from} ${to}`.trim();
    };
    var testSet = (set, version, options) => {
      for (let i = 0; i < set.length; i++) {
        if (!set[i].test(version)) {
          return false;
        }
      }
      if (version.prerelease.length && !options.includePrerelease) {
        for (let i = 0; i < set.length; i++) {
          debug(set[i].semver);
          if (set[i].semver === Comparator.ANY) {
            continue;
          }
          if (set[i].semver.prerelease.length > 0) {
            const allowed = set[i].semver;
            if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
              return true;
            }
          }
        }
        return false;
      }
      return true;
    };
  }
});

// node_modules/semver/classes/comparator.js
var require_comparator = __commonJS({
  "node_modules/semver/classes/comparator.js"(exports2, module2) {
    "use strict";
    var ANY = /* @__PURE__ */ Symbol("SemVer ANY");
    var Comparator = class _Comparator {
      static get ANY() {
        return ANY;
      }
      constructor(comp, options) {
        options = parseOptions(options);
        if (comp instanceof _Comparator) {
          if (comp.loose === !!options.loose) {
            return comp;
          } else {
            comp = comp.value;
          }
        }
        comp = comp.trim().split(/\s+/).join(" ");
        debug("comparator", comp, options);
        this.options = options;
        this.loose = !!options.loose;
        this.parse(comp);
        if (this.semver === ANY) {
          this.value = "";
        } else {
          this.value = this.operator + this.semver.version;
        }
        debug("comp", this);
      }
      parse(comp) {
        const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
        const m = comp.match(r);
        if (!m) {
          throw new TypeError(`Invalid comparator: ${comp}`);
        }
        this.operator = m[1] !== void 0 ? m[1] : "";
        if (this.operator === "=") {
          this.operator = "";
        }
        if (!m[2]) {
          this.semver = ANY;
        } else {
          this.semver = new SemVer(m[2], this.options.loose);
        }
      }
      toString() {
        return this.value;
      }
      test(version) {
        debug("Comparator.test", version, this.options.loose);
        if (this.semver === ANY || version === ANY) {
          return true;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        return cmp(version, this.operator, this.semver, this.options);
      }
      intersects(comp, options) {
        if (!(comp instanceof _Comparator)) {
          throw new TypeError("a Comparator is required");
        }
        if (this.operator === "") {
          if (this.value === "") {
            return true;
          }
          return new Range(comp.value, options).test(this.value);
        } else if (comp.operator === "") {
          if (comp.value === "") {
            return true;
          }
          return new Range(this.value, options).test(comp.semver);
        }
        options = parseOptions(options);
        if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
          return false;
        }
        if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
          return false;
        }
        if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
          return true;
        }
        if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
          return true;
        }
        if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
          return true;
        }
        if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
          return true;
        }
        if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
          return true;
        }
        return false;
      }
    };
    module2.exports = Comparator;
    var parseOptions = require_parse_options();
    var { safeRe: re, t } = require_re();
    var cmp = require_cmp();
    var debug = require_debug();
    var SemVer = require_semver();
    var Range = require_range();
  }
});

// node_modules/semver/functions/satisfies.js
var require_satisfies = __commonJS({
  "node_modules/semver/functions/satisfies.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var satisfies = (version, range, options) => {
      try {
        range = new Range(range, options);
      } catch (er) {
        return false;
      }
      return range.test(version);
    };
    module2.exports = satisfies;
  }
});

// node_modules/semver/ranges/to-comparators.js
var require_to_comparators = __commonJS({
  "node_modules/semver/ranges/to-comparators.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var toComparators = (range, options) => new Range(range, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
    module2.exports = toComparators;
  }
});

// node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = __commonJS({
  "node_modules/semver/ranges/max-satisfying.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var maxSatisfying = (versions, range, options) => {
      let max = null;
      let maxSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!max || maxSV.compare(v) === -1) {
            max = v;
            maxSV = new SemVer(max, options);
          }
        }
      });
      return max;
    };
    module2.exports = maxSatisfying;
  }
});

// node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = __commonJS({
  "node_modules/semver/ranges/min-satisfying.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var minSatisfying = (versions, range, options) => {
      let min = null;
      let minSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!min || minSV.compare(v) === 1) {
            min = v;
            minSV = new SemVer(min, options);
          }
        }
      });
      return min;
    };
    module2.exports = minSatisfying;
  }
});

// node_modules/semver/ranges/min-version.js
var require_min_version = __commonJS({
  "node_modules/semver/ranges/min-version.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var gt = require_gt();
    var minVersion = (range, loose) => {
      range = new Range(range, loose);
      let minver = new SemVer("0.0.0");
      if (range.test(minver)) {
        return minver;
      }
      minver = new SemVer("0.0.0-0");
      if (range.test(minver)) {
        return minver;
      }
      minver = null;
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let setMin = null;
        comparators.forEach((comparator) => {
          const compver = new SemVer(comparator.semver.version);
          switch (comparator.operator) {
            case ">":
              if (compver.prerelease.length === 0) {
                compver.patch++;
              } else {
                compver.prerelease.push(0);
              }
              compver.raw = compver.format();
            /* fallthrough */
            case "":
            case ">=":
              if (!setMin || gt(compver, setMin)) {
                setMin = compver;
              }
              break;
            case "<":
            case "<=":
              break;
            /* istanbul ignore next */
            default:
              throw new Error(`Unexpected operation: ${comparator.operator}`);
          }
        });
        if (setMin && (!minver || gt(minver, setMin))) {
          minver = setMin;
        }
      }
      if (minver && range.test(minver)) {
        return minver;
      }
      return null;
    };
    module2.exports = minVersion;
  }
});

// node_modules/semver/ranges/valid.js
var require_valid2 = __commonJS({
  "node_modules/semver/ranges/valid.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var validRange = (range, options) => {
      try {
        return new Range(range, options).range || "*";
      } catch (er) {
        return null;
      }
    };
    module2.exports = validRange;
  }
});

// node_modules/semver/ranges/outside.js
var require_outside = __commonJS({
  "node_modules/semver/ranges/outside.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var Range = require_range();
    var satisfies = require_satisfies();
    var gt = require_gt();
    var lt = require_lt();
    var lte = require_lte();
    var gte = require_gte();
    var outside = (version, range, hilo, options) => {
      version = new SemVer(version, options);
      range = new Range(range, options);
      let gtfn, ltefn, ltfn, comp, ecomp;
      switch (hilo) {
        case ">":
          gtfn = gt;
          ltefn = lte;
          ltfn = lt;
          comp = ">";
          ecomp = ">=";
          break;
        case "<":
          gtfn = lt;
          ltefn = gte;
          ltfn = gt;
          comp = "<";
          ecomp = "<=";
          break;
        default:
          throw new TypeError('Must provide a hilo val of "<" or ">"');
      }
      if (satisfies(version, range, options)) {
        return false;
      }
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let high = null;
        let low = null;
        comparators.forEach((comparator) => {
          if (comparator.semver === ANY) {
            comparator = new Comparator(">=0.0.0");
          }
          high = high || comparator;
          low = low || comparator;
          if (gtfn(comparator.semver, high.semver, options)) {
            high = comparator;
          } else if (ltfn(comparator.semver, low.semver, options)) {
            low = comparator;
          }
        });
        if (high.operator === comp || high.operator === ecomp) {
          return false;
        }
        if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
          return false;
        } else if (low.operator === ecomp && ltfn(version, low.semver)) {
          return false;
        }
      }
      return true;
    };
    module2.exports = outside;
  }
});

// node_modules/semver/ranges/gtr.js
var require_gtr = __commonJS({
  "node_modules/semver/ranges/gtr.js"(exports2, module2) {
    "use strict";
    var outside = require_outside();
    var gtr = (version, range, options) => outside(version, range, ">", options);
    module2.exports = gtr;
  }
});

// node_modules/semver/ranges/ltr.js
var require_ltr = __commonJS({
  "node_modules/semver/ranges/ltr.js"(exports2, module2) {
    "use strict";
    var outside = require_outside();
    var ltr = (version, range, options) => outside(version, range, "<", options);
    module2.exports = ltr;
  }
});

// node_modules/semver/ranges/intersects.js
var require_intersects = __commonJS({
  "node_modules/semver/ranges/intersects.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var intersects = (r1, r2, options) => {
      r1 = new Range(r1, options);
      r2 = new Range(r2, options);
      return r1.intersects(r2, options);
    };
    module2.exports = intersects;
  }
});

// node_modules/semver/ranges/simplify.js
var require_simplify = __commonJS({
  "node_modules/semver/ranges/simplify.js"(exports2, module2) {
    "use strict";
    var satisfies = require_satisfies();
    var compare2 = require_compare();
    module2.exports = (versions, range, options) => {
      const set = [];
      let first = null;
      let prev = null;
      const v = versions.sort((a, b) => compare2(a, b, options));
      for (const version of v) {
        const included = satisfies(version, range, options);
        if (included) {
          prev = version;
          if (!first) {
            first = version;
          }
        } else {
          if (prev) {
            set.push([first, prev]);
          }
          prev = null;
          first = null;
        }
      }
      if (first) {
        set.push([first, null]);
      }
      const ranges = [];
      for (const [min, max] of set) {
        if (min === max) {
          ranges.push(min);
        } else if (!max && min === v[0]) {
          ranges.push("*");
        } else if (!max) {
          ranges.push(`>=${min}`);
        } else if (min === v[0]) {
          ranges.push(`<=${max}`);
        } else {
          ranges.push(`${min} - ${max}`);
        }
      }
      const simplified = ranges.join(" || ");
      const original = typeof range.raw === "string" ? range.raw : String(range);
      return simplified.length < original.length ? simplified : range;
    };
  }
});

// node_modules/semver/ranges/subset.js
var require_subset = __commonJS({
  "node_modules/semver/ranges/subset.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var satisfies = require_satisfies();
    var compare2 = require_compare();
    var subset = (sub, dom, options = {}) => {
      if (sub === dom) {
        return true;
      }
      sub = new Range(sub, options);
      dom = new Range(dom, options);
      let sawNonNull = false;
      OUTER: for (const simpleSub of sub.set) {
        for (const simpleDom of dom.set) {
          const isSub = simpleSubset(simpleSub, simpleDom, options);
          sawNonNull = sawNonNull || isSub !== null;
          if (isSub) {
            continue OUTER;
          }
        }
        if (sawNonNull) {
          return false;
        }
      }
      return true;
    };
    var minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
    var minimumVersion = [new Comparator(">=0.0.0")];
    var simpleSubset = (sub, dom, options) => {
      if (sub === dom) {
        return true;
      }
      if (sub.length === 1 && sub[0].semver === ANY) {
        if (dom.length === 1 && dom[0].semver === ANY) {
          return true;
        } else if (options.includePrerelease) {
          sub = minimumVersionWithPreRelease;
        } else {
          sub = minimumVersion;
        }
      }
      if (dom.length === 1 && dom[0].semver === ANY) {
        if (options.includePrerelease) {
          return true;
        } else {
          dom = minimumVersion;
        }
      }
      const eqSet = /* @__PURE__ */ new Set();
      let gt, lt;
      for (const c of sub) {
        if (c.operator === ">" || c.operator === ">=") {
          gt = higherGT(gt, c, options);
        } else if (c.operator === "<" || c.operator === "<=") {
          lt = lowerLT(lt, c, options);
        } else {
          eqSet.add(c.semver);
        }
      }
      if (eqSet.size > 1) {
        return null;
      }
      let gtltComp;
      if (gt && lt) {
        gtltComp = compare2(gt.semver, lt.semver, options);
        if (gtltComp > 0) {
          return null;
        } else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) {
          return null;
        }
      }
      for (const eq of eqSet) {
        if (gt && !satisfies(eq, String(gt), options)) {
          return null;
        }
        if (lt && !satisfies(eq, String(lt), options)) {
          return null;
        }
        for (const c of dom) {
          if (!satisfies(eq, String(c), options)) {
            return false;
          }
        }
        return true;
      }
      let higher, lower;
      let hasDomLT, hasDomGT;
      let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
      let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
      if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0) {
        needDomLTPre = false;
      }
      for (const c of dom) {
        hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
        hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
        if (gt) {
          if (needDomGTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
              needDomGTPre = false;
            }
          }
          if (c.operator === ">" || c.operator === ">=") {
            higher = higherGT(gt, c, options);
            if (higher === c && higher !== gt) {
              return false;
            }
          } else if (gt.operator === ">=" && !satisfies(gt.semver, String(c), options)) {
            return false;
          }
        }
        if (lt) {
          if (needDomLTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
              needDomLTPre = false;
            }
          }
          if (c.operator === "<" || c.operator === "<=") {
            lower = lowerLT(lt, c, options);
            if (lower === c && lower !== lt) {
              return false;
            }
          } else if (lt.operator === "<=" && !satisfies(lt.semver, String(c), options)) {
            return false;
          }
        }
        if (!c.operator && (lt || gt) && gtltComp !== 0) {
          return false;
        }
      }
      if (gt && hasDomLT && !lt && gtltComp !== 0) {
        return false;
      }
      if (lt && hasDomGT && !gt && gtltComp !== 0) {
        return false;
      }
      if (needDomGTPre || needDomLTPre) {
        return false;
      }
      return true;
    };
    var higherGT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare2(a.semver, b.semver, options);
      return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
    };
    var lowerLT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare2(a.semver, b.semver, options);
      return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
    };
    module2.exports = subset;
  }
});

// node_modules/semver/index.js
var require_semver2 = __commonJS({
  "node_modules/semver/index.js"(exports2, module2) {
    "use strict";
    var internalRe = require_re();
    var constants = require_constants();
    var SemVer = require_semver();
    var identifiers = require_identifiers();
    var parse = require_parse();
    var valid = require_valid();
    var clean = require_clean();
    var inc = require_inc();
    var diff = require_diff();
    var major = require_major();
    var minor = require_minor();
    var patch = require_patch();
    var prerelease = require_prerelease();
    var compare2 = require_compare();
    var rcompare = require_rcompare();
    var compareLoose = require_compare_loose();
    var compareBuild = require_compare_build();
    var sort = require_sort();
    var rsort = require_rsort();
    var gt = require_gt();
    var lt = require_lt();
    var eq = require_eq();
    var neq = require_neq();
    var gte = require_gte();
    var lte = require_lte();
    var cmp = require_cmp();
    var coerce = require_coerce();
    var Comparator = require_comparator();
    var Range = require_range();
    var satisfies = require_satisfies();
    var toComparators = require_to_comparators();
    var maxSatisfying = require_max_satisfying();
    var minSatisfying = require_min_satisfying();
    var minVersion = require_min_version();
    var validRange = require_valid2();
    var outside = require_outside();
    var gtr = require_gtr();
    var ltr = require_ltr();
    var intersects = require_intersects();
    var simplifyRange = require_simplify();
    var subset = require_subset();
    module2.exports = {
      parse,
      valid,
      clean,
      inc,
      diff,
      major,
      minor,
      patch,
      prerelease,
      compare: compare2,
      rcompare,
      compareLoose,
      compareBuild,
      sort,
      rsort,
      gt,
      lt,
      eq,
      neq,
      gte,
      lte,
      cmp,
      coerce,
      Comparator,
      Range,
      satisfies,
      toComparators,
      maxSatisfying,
      minSatisfying,
      minVersion,
      validRange,
      outside,
      gtr,
      ltr,
      intersects,
      simplifyRange,
      subset,
      SemVer,
      re: internalRe.re,
      src: internalRe.src,
      tokens: internalRe.t,
      SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
      RELEASE_TYPES: constants.RELEASE_TYPES,
      compareIdentifiers: identifiers.compareIdentifiers,
      rcompareIdentifiers: identifiers.rcompareIdentifiers
    };
  }
});

// node_modules/jsonwebtoken/lib/asymmetricKeyDetailsSupported.js
var require_asymmetricKeyDetailsSupported = __commonJS({
  "node_modules/jsonwebtoken/lib/asymmetricKeyDetailsSupported.js"(exports2, module2) {
    var semver = require_semver2();
    module2.exports = semver.satisfies(process.version, ">=15.7.0");
  }
});

// node_modules/jsonwebtoken/lib/rsaPssKeyDetailsSupported.js
var require_rsaPssKeyDetailsSupported = __commonJS({
  "node_modules/jsonwebtoken/lib/rsaPssKeyDetailsSupported.js"(exports2, module2) {
    var semver = require_semver2();
    module2.exports = semver.satisfies(process.version, ">=16.9.0");
  }
});

// node_modules/jsonwebtoken/lib/validateAsymmetricKey.js
var require_validateAsymmetricKey = __commonJS({
  "node_modules/jsonwebtoken/lib/validateAsymmetricKey.js"(exports2, module2) {
    var ASYMMETRIC_KEY_DETAILS_SUPPORTED = require_asymmetricKeyDetailsSupported();
    var RSA_PSS_KEY_DETAILS_SUPPORTED = require_rsaPssKeyDetailsSupported();
    var allowedAlgorithmsForKeys = {
      "ec": ["ES256", "ES384", "ES512"],
      "rsa": ["RS256", "PS256", "RS384", "PS384", "RS512", "PS512"],
      "rsa-pss": ["PS256", "PS384", "PS512"]
    };
    var allowedCurves = {
      ES256: "prime256v1",
      ES384: "secp384r1",
      ES512: "secp521r1"
    };
    module2.exports = function(algorithm, key) {
      if (!algorithm || !key) return;
      const keyType = key.asymmetricKeyType;
      if (!keyType) return;
      const allowedAlgorithms = allowedAlgorithmsForKeys[keyType];
      if (!allowedAlgorithms) {
        throw new Error(`Unknown key type "${keyType}".`);
      }
      if (!allowedAlgorithms.includes(algorithm)) {
        throw new Error(`"alg" parameter for "${keyType}" key type must be one of: ${allowedAlgorithms.join(", ")}.`);
      }
      if (ASYMMETRIC_KEY_DETAILS_SUPPORTED) {
        switch (keyType) {
          case "ec":
            const keyCurve = key.asymmetricKeyDetails.namedCurve;
            const allowedCurve = allowedCurves[algorithm];
            if (keyCurve !== allowedCurve) {
              throw new Error(`"alg" parameter "${algorithm}" requires curve "${allowedCurve}".`);
            }
            break;
          case "rsa-pss":
            if (RSA_PSS_KEY_DETAILS_SUPPORTED) {
              const length = parseInt(algorithm.slice(-3), 10);
              const { hashAlgorithm, mgf1HashAlgorithm, saltLength } = key.asymmetricKeyDetails;
              if (hashAlgorithm !== `sha${length}` || mgf1HashAlgorithm !== hashAlgorithm) {
                throw new Error(`Invalid key for this operation, its RSA-PSS parameters do not meet the requirements of "alg" ${algorithm}.`);
              }
              if (saltLength !== void 0 && saltLength > length >> 3) {
                throw new Error(`Invalid key for this operation, its RSA-PSS parameter saltLength does not meet the requirements of "alg" ${algorithm}.`);
              }
            }
            break;
        }
      }
    };
  }
});

// node_modules/jsonwebtoken/lib/psSupported.js
var require_psSupported = __commonJS({
  "node_modules/jsonwebtoken/lib/psSupported.js"(exports2, module2) {
    var semver = require_semver2();
    module2.exports = semver.satisfies(process.version, "^6.12.0 || >=8.0.0");
  }
});

// node_modules/jsonwebtoken/verify.js
var require_verify = __commonJS({
  "node_modules/jsonwebtoken/verify.js"(exports2, module2) {
    var JsonWebTokenError = require_JsonWebTokenError();
    var NotBeforeError = require_NotBeforeError();
    var TokenExpiredError = require_TokenExpiredError();
    var decode = require_decode();
    var timespan = require_timespan();
    var validateAsymmetricKey = require_validateAsymmetricKey();
    var PS_SUPPORTED = require_psSupported();
    var jws = require_jws();
    var { KeyObject, createSecretKey, createPublicKey } = require("crypto");
    var PUB_KEY_ALGS = ["RS256", "RS384", "RS512"];
    var EC_KEY_ALGS = ["ES256", "ES384", "ES512"];
    var RSA_KEY_ALGS = ["RS256", "RS384", "RS512"];
    var HS_ALGS = ["HS256", "HS384", "HS512"];
    if (PS_SUPPORTED) {
      PUB_KEY_ALGS.splice(PUB_KEY_ALGS.length, 0, "PS256", "PS384", "PS512");
      RSA_KEY_ALGS.splice(RSA_KEY_ALGS.length, 0, "PS256", "PS384", "PS512");
    }
    module2.exports = function(jwtString, secretOrPublicKey, options, callback) {
      if (typeof options === "function" && !callback) {
        callback = options;
        options = {};
      }
      if (!options) {
        options = {};
      }
      options = Object.assign({}, options);
      let done;
      if (callback) {
        done = callback;
      } else {
        done = function(err, data) {
          if (err) throw err;
          return data;
        };
      }
      if (options.clockTimestamp && typeof options.clockTimestamp !== "number") {
        return done(new JsonWebTokenError("clockTimestamp must be a number"));
      }
      if (options.nonce !== void 0 && (typeof options.nonce !== "string" || options.nonce.trim() === "")) {
        return done(new JsonWebTokenError("nonce must be a non-empty string"));
      }
      if (options.allowInvalidAsymmetricKeyTypes !== void 0 && typeof options.allowInvalidAsymmetricKeyTypes !== "boolean") {
        return done(new JsonWebTokenError("allowInvalidAsymmetricKeyTypes must be a boolean"));
      }
      const clockTimestamp = options.clockTimestamp || Math.floor(Date.now() / 1e3);
      if (!jwtString) {
        return done(new JsonWebTokenError("jwt must be provided"));
      }
      if (typeof jwtString !== "string") {
        return done(new JsonWebTokenError("jwt must be a string"));
      }
      const parts = jwtString.split(".");
      if (parts.length !== 3) {
        return done(new JsonWebTokenError("jwt malformed"));
      }
      let decodedToken;
      try {
        decodedToken = decode(jwtString, { complete: true });
      } catch (err) {
        return done(err);
      }
      if (!decodedToken) {
        return done(new JsonWebTokenError("invalid token"));
      }
      const header = decodedToken.header;
      let getSecret;
      if (typeof secretOrPublicKey === "function") {
        if (!callback) {
          return done(new JsonWebTokenError("verify must be called asynchronous if secret or public key is provided as a callback"));
        }
        getSecret = secretOrPublicKey;
      } else {
        getSecret = function(header2, secretCallback) {
          return secretCallback(null, secretOrPublicKey);
        };
      }
      return getSecret(header, function(err, secretOrPublicKey2) {
        if (err) {
          return done(new JsonWebTokenError("error in secret or public key callback: " + err.message));
        }
        const hasSignature = parts[2].trim() !== "";
        if (!hasSignature && secretOrPublicKey2) {
          return done(new JsonWebTokenError("jwt signature is required"));
        }
        if (hasSignature && !secretOrPublicKey2) {
          return done(new JsonWebTokenError("secret or public key must be provided"));
        }
        if (!hasSignature && !options.algorithms) {
          return done(new JsonWebTokenError('please specify "none" in "algorithms" to verify unsigned tokens'));
        }
        if (secretOrPublicKey2 != null && !(secretOrPublicKey2 instanceof KeyObject)) {
          try {
            secretOrPublicKey2 = createPublicKey(secretOrPublicKey2);
          } catch (_) {
            try {
              secretOrPublicKey2 = createSecretKey(typeof secretOrPublicKey2 === "string" ? Buffer.from(secretOrPublicKey2) : secretOrPublicKey2);
            } catch (_2) {
              return done(new JsonWebTokenError("secretOrPublicKey is not valid key material"));
            }
          }
        }
        if (!options.algorithms) {
          if (secretOrPublicKey2.type === "secret") {
            options.algorithms = HS_ALGS;
          } else if (["rsa", "rsa-pss"].includes(secretOrPublicKey2.asymmetricKeyType)) {
            options.algorithms = RSA_KEY_ALGS;
          } else if (secretOrPublicKey2.asymmetricKeyType === "ec") {
            options.algorithms = EC_KEY_ALGS;
          } else {
            options.algorithms = PUB_KEY_ALGS;
          }
        }
        if (options.algorithms.indexOf(decodedToken.header.alg) === -1) {
          return done(new JsonWebTokenError("invalid algorithm"));
        }
        if (header.alg.startsWith("HS") && secretOrPublicKey2.type !== "secret") {
          return done(new JsonWebTokenError(`secretOrPublicKey must be a symmetric key when using ${header.alg}`));
        } else if (/^(?:RS|PS|ES)/.test(header.alg) && secretOrPublicKey2.type !== "public") {
          return done(new JsonWebTokenError(`secretOrPublicKey must be an asymmetric key when using ${header.alg}`));
        }
        if (!options.allowInvalidAsymmetricKeyTypes) {
          try {
            validateAsymmetricKey(header.alg, secretOrPublicKey2);
          } catch (e) {
            return done(e);
          }
        }
        let valid;
        try {
          valid = jws.verify(jwtString, decodedToken.header.alg, secretOrPublicKey2);
        } catch (e) {
          return done(e);
        }
        if (!valid) {
          return done(new JsonWebTokenError("invalid signature"));
        }
        const payload = decodedToken.payload;
        if (typeof payload.nbf !== "undefined" && !options.ignoreNotBefore) {
          if (typeof payload.nbf !== "number") {
            return done(new JsonWebTokenError("invalid nbf value"));
          }
          if (payload.nbf > clockTimestamp + (options.clockTolerance || 0)) {
            return done(new NotBeforeError("jwt not active", new Date(payload.nbf * 1e3)));
          }
        }
        if (typeof payload.exp !== "undefined" && !options.ignoreExpiration) {
          if (typeof payload.exp !== "number") {
            return done(new JsonWebTokenError("invalid exp value"));
          }
          if (clockTimestamp >= payload.exp + (options.clockTolerance || 0)) {
            return done(new TokenExpiredError("jwt expired", new Date(payload.exp * 1e3)));
          }
        }
        if (options.audience) {
          const audiences = Array.isArray(options.audience) ? options.audience : [options.audience];
          const target = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
          const match = target.some(function(targetAudience) {
            return audiences.some(function(audience) {
              return audience instanceof RegExp ? audience.test(targetAudience) : audience === targetAudience;
            });
          });
          if (!match) {
            return done(new JsonWebTokenError("jwt audience invalid. expected: " + audiences.join(" or ")));
          }
        }
        if (options.issuer) {
          const invalid_issuer = typeof options.issuer === "string" && payload.iss !== options.issuer || Array.isArray(options.issuer) && options.issuer.indexOf(payload.iss) === -1;
          if (invalid_issuer) {
            return done(new JsonWebTokenError("jwt issuer invalid. expected: " + options.issuer));
          }
        }
        if (options.subject) {
          if (payload.sub !== options.subject) {
            return done(new JsonWebTokenError("jwt subject invalid. expected: " + options.subject));
          }
        }
        if (options.jwtid) {
          if (payload.jti !== options.jwtid) {
            return done(new JsonWebTokenError("jwt jwtid invalid. expected: " + options.jwtid));
          }
        }
        if (options.nonce) {
          if (payload.nonce !== options.nonce) {
            return done(new JsonWebTokenError("jwt nonce invalid. expected: " + options.nonce));
          }
        }
        if (options.maxAge) {
          if (typeof payload.iat !== "number") {
            return done(new JsonWebTokenError("iat required when maxAge is specified"));
          }
          const maxAgeTimestamp = timespan(options.maxAge, payload.iat);
          if (typeof maxAgeTimestamp === "undefined") {
            return done(new JsonWebTokenError('"maxAge" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60'));
          }
          if (clockTimestamp >= maxAgeTimestamp + (options.clockTolerance || 0)) {
            return done(new TokenExpiredError("maxAge exceeded", new Date(maxAgeTimestamp * 1e3)));
          }
        }
        if (options.complete === true) {
          const signature = decodedToken.signature;
          return done(null, {
            header,
            payload,
            signature
          });
        }
        return done(null, payload);
      });
    };
  }
});

// node_modules/lodash/lodash.js
var require_lodash = __commonJS({
  "node_modules/lodash/lodash.js"(exports2, module2) {
    (function() {
      var undefined2;
      var VERSION = "4.17.23";
      var LARGE_ARRAY_SIZE = 200;
      var CORE_ERROR_TEXT = "Unsupported core-js use. Try https://npms.io/search?q=ponyfill.", FUNC_ERROR_TEXT = "Expected a function", INVALID_TEMPL_VAR_ERROR_TEXT = "Invalid `variable` option passed into `_.template`";
      var HASH_UNDEFINED = "__lodash_hash_undefined__";
      var MAX_MEMOIZE_SIZE = 500;
      var PLACEHOLDER = "__lodash_placeholder__";
      var CLONE_DEEP_FLAG = 1, CLONE_FLAT_FLAG = 2, CLONE_SYMBOLS_FLAG = 4;
      var COMPARE_PARTIAL_FLAG = 1, COMPARE_UNORDERED_FLAG = 2;
      var WRAP_BIND_FLAG = 1, WRAP_BIND_KEY_FLAG = 2, WRAP_CURRY_BOUND_FLAG = 4, WRAP_CURRY_FLAG = 8, WRAP_CURRY_RIGHT_FLAG = 16, WRAP_PARTIAL_FLAG = 32, WRAP_PARTIAL_RIGHT_FLAG = 64, WRAP_ARY_FLAG = 128, WRAP_REARG_FLAG = 256, WRAP_FLIP_FLAG = 512;
      var DEFAULT_TRUNC_LENGTH = 30, DEFAULT_TRUNC_OMISSION = "...";
      var HOT_COUNT = 800, HOT_SPAN = 16;
      var LAZY_FILTER_FLAG = 1, LAZY_MAP_FLAG = 2, LAZY_WHILE_FLAG = 3;
      var INFINITY = 1 / 0, MAX_SAFE_INTEGER = 9007199254740991, MAX_INTEGER = 17976931348623157e292, NAN = 0 / 0;
      var MAX_ARRAY_LENGTH = 4294967295, MAX_ARRAY_INDEX = MAX_ARRAY_LENGTH - 1, HALF_MAX_ARRAY_LENGTH = MAX_ARRAY_LENGTH >>> 1;
      var wrapFlags = [
        ["ary", WRAP_ARY_FLAG],
        ["bind", WRAP_BIND_FLAG],
        ["bindKey", WRAP_BIND_KEY_FLAG],
        ["curry", WRAP_CURRY_FLAG],
        ["curryRight", WRAP_CURRY_RIGHT_FLAG],
        ["flip", WRAP_FLIP_FLAG],
        ["partial", WRAP_PARTIAL_FLAG],
        ["partialRight", WRAP_PARTIAL_RIGHT_FLAG],
        ["rearg", WRAP_REARG_FLAG]
      ];
      var argsTag = "[object Arguments]", arrayTag = "[object Array]", asyncTag = "[object AsyncFunction]", boolTag = "[object Boolean]", dateTag = "[object Date]", domExcTag = "[object DOMException]", errorTag = "[object Error]", funcTag = "[object Function]", genTag = "[object GeneratorFunction]", mapTag = "[object Map]", numberTag = "[object Number]", nullTag = "[object Null]", objectTag = "[object Object]", promiseTag = "[object Promise]", proxyTag = "[object Proxy]", regexpTag = "[object RegExp]", setTag = "[object Set]", stringTag = "[object String]", symbolTag = "[object Symbol]", undefinedTag = "[object Undefined]", weakMapTag = "[object WeakMap]", weakSetTag = "[object WeakSet]";
      var arrayBufferTag = "[object ArrayBuffer]", dataViewTag = "[object DataView]", float32Tag = "[object Float32Array]", float64Tag = "[object Float64Array]", int8Tag = "[object Int8Array]", int16Tag = "[object Int16Array]", int32Tag = "[object Int32Array]", uint8Tag = "[object Uint8Array]", uint8ClampedTag = "[object Uint8ClampedArray]", uint16Tag = "[object Uint16Array]", uint32Tag = "[object Uint32Array]";
      var reEmptyStringLeading = /\b__p \+= '';/g, reEmptyStringMiddle = /\b(__p \+=) '' \+/g, reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;
      var reEscapedHtml = /&(?:amp|lt|gt|quot|#39);/g, reUnescapedHtml = /[&<>"']/g, reHasEscapedHtml = RegExp(reEscapedHtml.source), reHasUnescapedHtml = RegExp(reUnescapedHtml.source);
      var reEscape = /<%-([\s\S]+?)%>/g, reEvaluate = /<%([\s\S]+?)%>/g, reInterpolate = /<%=([\s\S]+?)%>/g;
      var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, reIsPlainProp = /^\w*$/, rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
      var reRegExpChar = /[\\^$.*+?()[\]{}|]/g, reHasRegExpChar = RegExp(reRegExpChar.source);
      var reTrimStart = /^\s+/;
      var reWhitespace = /\s/;
      var reWrapComment = /\{(?:\n\/\* \[wrapped with .+\] \*\/)?\n?/, reWrapDetails = /\{\n\/\* \[wrapped with (.+)\] \*/, reSplitDetails = /,? & /;
      var reAsciiWord = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g;
      var reForbiddenIdentifierChars = /[()=,{}\[\]\/\s]/;
      var reEscapeChar = /\\(\\)?/g;
      var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;
      var reFlags = /\w*$/;
      var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
      var reIsBinary = /^0b[01]+$/i;
      var reIsHostCtor = /^\[object .+?Constructor\]$/;
      var reIsOctal = /^0o[0-7]+$/i;
      var reIsUint = /^(?:0|[1-9]\d*)$/;
      var reLatin = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;
      var reNoMatch = /($^)/;
      var reUnescapedString = /['\n\r\u2028\u2029\\]/g;
      var rsAstralRange = "\\ud800-\\udfff", rsComboMarksRange = "\\u0300-\\u036f", reComboHalfMarksRange = "\\ufe20-\\ufe2f", rsComboSymbolsRange = "\\u20d0-\\u20ff", rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange, rsDingbatRange = "\\u2700-\\u27bf", rsLowerRange = "a-z\\xdf-\\xf6\\xf8-\\xff", rsMathOpRange = "\\xac\\xb1\\xd7\\xf7", rsNonCharRange = "\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf", rsPunctuationRange = "\\u2000-\\u206f", rsSpaceRange = " \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000", rsUpperRange = "A-Z\\xc0-\\xd6\\xd8-\\xde", rsVarRange = "\\ufe0e\\ufe0f", rsBreakRange = rsMathOpRange + rsNonCharRange + rsPunctuationRange + rsSpaceRange;
      var rsApos = "['\u2019]", rsAstral = "[" + rsAstralRange + "]", rsBreak = "[" + rsBreakRange + "]", rsCombo = "[" + rsComboRange + "]", rsDigits = "\\d+", rsDingbat = "[" + rsDingbatRange + "]", rsLower = "[" + rsLowerRange + "]", rsMisc = "[^" + rsAstralRange + rsBreakRange + rsDigits + rsDingbatRange + rsLowerRange + rsUpperRange + "]", rsFitz = "\\ud83c[\\udffb-\\udfff]", rsModifier = "(?:" + rsCombo + "|" + rsFitz + ")", rsNonAstral = "[^" + rsAstralRange + "]", rsRegional = "(?:\\ud83c[\\udde6-\\uddff]){2}", rsSurrPair = "[\\ud800-\\udbff][\\udc00-\\udfff]", rsUpper = "[" + rsUpperRange + "]", rsZWJ = "\\u200d";
      var rsMiscLower = "(?:" + rsLower + "|" + rsMisc + ")", rsMiscUpper = "(?:" + rsUpper + "|" + rsMisc + ")", rsOptContrLower = "(?:" + rsApos + "(?:d|ll|m|re|s|t|ve))?", rsOptContrUpper = "(?:" + rsApos + "(?:D|LL|M|RE|S|T|VE))?", reOptMod = rsModifier + "?", rsOptVar = "[" + rsVarRange + "]?", rsOptJoin = "(?:" + rsZWJ + "(?:" + [rsNonAstral, rsRegional, rsSurrPair].join("|") + ")" + rsOptVar + reOptMod + ")*", rsOrdLower = "\\d*(?:1st|2nd|3rd|(?![123])\\dth)(?=\\b|[A-Z_])", rsOrdUpper = "\\d*(?:1ST|2ND|3RD|(?![123])\\dTH)(?=\\b|[a-z_])", rsSeq = rsOptVar + reOptMod + rsOptJoin, rsEmoji = "(?:" + [rsDingbat, rsRegional, rsSurrPair].join("|") + ")" + rsSeq, rsSymbol = "(?:" + [rsNonAstral + rsCombo + "?", rsCombo, rsRegional, rsSurrPair, rsAstral].join("|") + ")";
      var reApos = RegExp(rsApos, "g");
      var reComboMark = RegExp(rsCombo, "g");
      var reUnicode = RegExp(rsFitz + "(?=" + rsFitz + ")|" + rsSymbol + rsSeq, "g");
      var reUnicodeWord = RegExp([
        rsUpper + "?" + rsLower + "+" + rsOptContrLower + "(?=" + [rsBreak, rsUpper, "$"].join("|") + ")",
        rsMiscUpper + "+" + rsOptContrUpper + "(?=" + [rsBreak, rsUpper + rsMiscLower, "$"].join("|") + ")",
        rsUpper + "?" + rsMiscLower + "+" + rsOptContrLower,
        rsUpper + "+" + rsOptContrUpper,
        rsOrdUpper,
        rsOrdLower,
        rsDigits,
        rsEmoji
      ].join("|"), "g");
      var reHasUnicode = RegExp("[" + rsZWJ + rsAstralRange + rsComboRange + rsVarRange + "]");
      var reHasUnicodeWord = /[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;
      var contextProps = [
        "Array",
        "Buffer",
        "DataView",
        "Date",
        "Error",
        "Float32Array",
        "Float64Array",
        "Function",
        "Int8Array",
        "Int16Array",
        "Int32Array",
        "Map",
        "Math",
        "Object",
        "Promise",
        "RegExp",
        "Set",
        "String",
        "Symbol",
        "TypeError",
        "Uint8Array",
        "Uint8ClampedArray",
        "Uint16Array",
        "Uint32Array",
        "WeakMap",
        "_",
        "clearTimeout",
        "isFinite",
        "parseInt",
        "setTimeout"
      ];
      var templateCounter = -1;
      var typedArrayTags = {};
      typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
      typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
      var cloneableTags = {};
      cloneableTags[argsTag] = cloneableTags[arrayTag] = cloneableTags[arrayBufferTag] = cloneableTags[dataViewTag] = cloneableTags[boolTag] = cloneableTags[dateTag] = cloneableTags[float32Tag] = cloneableTags[float64Tag] = cloneableTags[int8Tag] = cloneableTags[int16Tag] = cloneableTags[int32Tag] = cloneableTags[mapTag] = cloneableTags[numberTag] = cloneableTags[objectTag] = cloneableTags[regexpTag] = cloneableTags[setTag] = cloneableTags[stringTag] = cloneableTags[symbolTag] = cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] = cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
      cloneableTags[errorTag] = cloneableTags[funcTag] = cloneableTags[weakMapTag] = false;
      var deburredLetters = {
        // Latin-1 Supplement block.
        "\xC0": "A",
        "\xC1": "A",
        "\xC2": "A",
        "\xC3": "A",
        "\xC4": "A",
        "\xC5": "A",
        "\xE0": "a",
        "\xE1": "a",
        "\xE2": "a",
        "\xE3": "a",
        "\xE4": "a",
        "\xE5": "a",
        "\xC7": "C",
        "\xE7": "c",
        "\xD0": "D",
        "\xF0": "d",
        "\xC8": "E",
        "\xC9": "E",
        "\xCA": "E",
        "\xCB": "E",
        "\xE8": "e",
        "\xE9": "e",
        "\xEA": "e",
        "\xEB": "e",
        "\xCC": "I",
        "\xCD": "I",
        "\xCE": "I",
        "\xCF": "I",
        "\xEC": "i",
        "\xED": "i",
        "\xEE": "i",
        "\xEF": "i",
        "\xD1": "N",
        "\xF1": "n",
        "\xD2": "O",
        "\xD3": "O",
        "\xD4": "O",
        "\xD5": "O",
        "\xD6": "O",
        "\xD8": "O",
        "\xF2": "o",
        "\xF3": "o",
        "\xF4": "o",
        "\xF5": "o",
        "\xF6": "o",
        "\xF8": "o",
        "\xD9": "U",
        "\xDA": "U",
        "\xDB": "U",
        "\xDC": "U",
        "\xF9": "u",
        "\xFA": "u",
        "\xFB": "u",
        "\xFC": "u",
        "\xDD": "Y",
        "\xFD": "y",
        "\xFF": "y",
        "\xC6": "Ae",
        "\xE6": "ae",
        "\xDE": "Th",
        "\xFE": "th",
        "\xDF": "ss",
        // Latin Extended-A block.
        "\u0100": "A",
        "\u0102": "A",
        "\u0104": "A",
        "\u0101": "a",
        "\u0103": "a",
        "\u0105": "a",
        "\u0106": "C",
        "\u0108": "C",
        "\u010A": "C",
        "\u010C": "C",
        "\u0107": "c",
        "\u0109": "c",
        "\u010B": "c",
        "\u010D": "c",
        "\u010E": "D",
        "\u0110": "D",
        "\u010F": "d",
        "\u0111": "d",
        "\u0112": "E",
        "\u0114": "E",
        "\u0116": "E",
        "\u0118": "E",
        "\u011A": "E",
        "\u0113": "e",
        "\u0115": "e",
        "\u0117": "e",
        "\u0119": "e",
        "\u011B": "e",
        "\u011C": "G",
        "\u011E": "G",
        "\u0120": "G",
        "\u0122": "G",
        "\u011D": "g",
        "\u011F": "g",
        "\u0121": "g",
        "\u0123": "g",
        "\u0124": "H",
        "\u0126": "H",
        "\u0125": "h",
        "\u0127": "h",
        "\u0128": "I",
        "\u012A": "I",
        "\u012C": "I",
        "\u012E": "I",
        "\u0130": "I",
        "\u0129": "i",
        "\u012B": "i",
        "\u012D": "i",
        "\u012F": "i",
        "\u0131": "i",
        "\u0134": "J",
        "\u0135": "j",
        "\u0136": "K",
        "\u0137": "k",
        "\u0138": "k",
        "\u0139": "L",
        "\u013B": "L",
        "\u013D": "L",
        "\u013F": "L",
        "\u0141": "L",
        "\u013A": "l",
        "\u013C": "l",
        "\u013E": "l",
        "\u0140": "l",
        "\u0142": "l",
        "\u0143": "N",
        "\u0145": "N",
        "\u0147": "N",
        "\u014A": "N",
        "\u0144": "n",
        "\u0146": "n",
        "\u0148": "n",
        "\u014B": "n",
        "\u014C": "O",
        "\u014E": "O",
        "\u0150": "O",
        "\u014D": "o",
        "\u014F": "o",
        "\u0151": "o",
        "\u0154": "R",
        "\u0156": "R",
        "\u0158": "R",
        "\u0155": "r",
        "\u0157": "r",
        "\u0159": "r",
        "\u015A": "S",
        "\u015C": "S",
        "\u015E": "S",
        "\u0160": "S",
        "\u015B": "s",
        "\u015D": "s",
        "\u015F": "s",
        "\u0161": "s",
        "\u0162": "T",
        "\u0164": "T",
        "\u0166": "T",
        "\u0163": "t",
        "\u0165": "t",
        "\u0167": "t",
        "\u0168": "U",
        "\u016A": "U",
        "\u016C": "U",
        "\u016E": "U",
        "\u0170": "U",
        "\u0172": "U",
        "\u0169": "u",
        "\u016B": "u",
        "\u016D": "u",
        "\u016F": "u",
        "\u0171": "u",
        "\u0173": "u",
        "\u0174": "W",
        "\u0175": "w",
        "\u0176": "Y",
        "\u0177": "y",
        "\u0178": "Y",
        "\u0179": "Z",
        "\u017B": "Z",
        "\u017D": "Z",
        "\u017A": "z",
        "\u017C": "z",
        "\u017E": "z",
        "\u0132": "IJ",
        "\u0133": "ij",
        "\u0152": "Oe",
        "\u0153": "oe",
        "\u0149": "'n",
        "\u017F": "s"
      };
      var htmlEscapes = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };
      var htmlUnescapes = {
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&#39;": "'"
      };
      var stringEscapes = {
        "\\": "\\",
        "'": "'",
        "\n": "n",
        "\r": "r",
        "\u2028": "u2028",
        "\u2029": "u2029"
      };
      var freeParseFloat = parseFloat, freeParseInt = parseInt;
      var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
      var freeSelf = typeof self == "object" && self && self.Object === Object && self;
      var root = freeGlobal || freeSelf || Function("return this")();
      var freeExports = typeof exports2 == "object" && exports2 && !exports2.nodeType && exports2;
      var freeModule = freeExports && typeof module2 == "object" && module2 && !module2.nodeType && module2;
      var moduleExports = freeModule && freeModule.exports === freeExports;
      var freeProcess = moduleExports && freeGlobal.process;
      var nodeUtil = (function() {
        try {
          var types = freeModule && freeModule.require && freeModule.require("util").types;
          if (types) {
            return types;
          }
          return freeProcess && freeProcess.binding && freeProcess.binding("util");
        } catch (e) {
        }
      })();
      var nodeIsArrayBuffer = nodeUtil && nodeUtil.isArrayBuffer, nodeIsDate = nodeUtil && nodeUtil.isDate, nodeIsMap = nodeUtil && nodeUtil.isMap, nodeIsRegExp = nodeUtil && nodeUtil.isRegExp, nodeIsSet = nodeUtil && nodeUtil.isSet, nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
      function apply(func, thisArg, args) {
        switch (args.length) {
          case 0:
            return func.call(thisArg);
          case 1:
            return func.call(thisArg, args[0]);
          case 2:
            return func.call(thisArg, args[0], args[1]);
          case 3:
            return func.call(thisArg, args[0], args[1], args[2]);
        }
        return func.apply(thisArg, args);
      }
      function arrayAggregator(array, setter, iteratee, accumulator) {
        var index = -1, length = array == null ? 0 : array.length;
        while (++index < length) {
          var value = array[index];
          setter(accumulator, value, iteratee(value), array);
        }
        return accumulator;
      }
      function arrayEach(array, iteratee) {
        var index = -1, length = array == null ? 0 : array.length;
        while (++index < length) {
          if (iteratee(array[index], index, array) === false) {
            break;
          }
        }
        return array;
      }
      function arrayEachRight(array, iteratee) {
        var length = array == null ? 0 : array.length;
        while (length--) {
          if (iteratee(array[length], length, array) === false) {
            break;
          }
        }
        return array;
      }
      function arrayEvery(array, predicate) {
        var index = -1, length = array == null ? 0 : array.length;
        while (++index < length) {
          if (!predicate(array[index], index, array)) {
            return false;
          }
        }
        return true;
      }
      function arrayFilter(array, predicate) {
        var index = -1, length = array == null ? 0 : array.length, resIndex = 0, result = [];
        while (++index < length) {
          var value = array[index];
          if (predicate(value, index, array)) {
            result[resIndex++] = value;
          }
        }
        return result;
      }
      function arrayIncludes(array, value) {
        var length = array == null ? 0 : array.length;
        return !!length && baseIndexOf(array, value, 0) > -1;
      }
      function arrayIncludesWith(array, value, comparator) {
        var index = -1, length = array == null ? 0 : array.length;
        while (++index < length) {
          if (comparator(value, array[index])) {
            return true;
          }
        }
        return false;
      }
      function arrayMap(array, iteratee) {
        var index = -1, length = array == null ? 0 : array.length, result = Array(length);
        while (++index < length) {
          result[index] = iteratee(array[index], index, array);
        }
        return result;
      }
      function arrayPush(array, values) {
        var index = -1, length = values.length, offset = array.length;
        while (++index < length) {
          array[offset + index] = values[index];
        }
        return array;
      }
      function arrayReduce(array, iteratee, accumulator, initAccum) {
        var index = -1, length = array == null ? 0 : array.length;
        if (initAccum && length) {
          accumulator = array[++index];
        }
        while (++index < length) {
          accumulator = iteratee(accumulator, array[index], index, array);
        }
        return accumulator;
      }
      function arrayReduceRight(array, iteratee, accumulator, initAccum) {
        var length = array == null ? 0 : array.length;
        if (initAccum && length) {
          accumulator = array[--length];
        }
        while (length--) {
          accumulator = iteratee(accumulator, array[length], length, array);
        }
        return accumulator;
      }
      function arraySome(array, predicate) {
        var index = -1, length = array == null ? 0 : array.length;
        while (++index < length) {
          if (predicate(array[index], index, array)) {
            return true;
          }
        }
        return false;
      }
      var asciiSize = baseProperty("length");
      function asciiToArray(string) {
        return string.split("");
      }
      function asciiWords(string) {
        return string.match(reAsciiWord) || [];
      }
      function baseFindKey(collection, predicate, eachFunc) {
        var result;
        eachFunc(collection, function(value, key, collection2) {
          if (predicate(value, key, collection2)) {
            result = key;
            return false;
          }
        });
        return result;
      }
      function baseFindIndex(array, predicate, fromIndex, fromRight) {
        var length = array.length, index = fromIndex + (fromRight ? 1 : -1);
        while (fromRight ? index-- : ++index < length) {
          if (predicate(array[index], index, array)) {
            return index;
          }
        }
        return -1;
      }
      function baseIndexOf(array, value, fromIndex) {
        return value === value ? strictIndexOf(array, value, fromIndex) : baseFindIndex(array, baseIsNaN, fromIndex);
      }
      function baseIndexOfWith(array, value, fromIndex, comparator) {
        var index = fromIndex - 1, length = array.length;
        while (++index < length) {
          if (comparator(array[index], value)) {
            return index;
          }
        }
        return -1;
      }
      function baseIsNaN(value) {
        return value !== value;
      }
      function baseMean(array, iteratee) {
        var length = array == null ? 0 : array.length;
        return length ? baseSum(array, iteratee) / length : NAN;
      }
      function baseProperty(key) {
        return function(object) {
          return object == null ? undefined2 : object[key];
        };
      }
      function basePropertyOf(object) {
        return function(key) {
          return object == null ? undefined2 : object[key];
        };
      }
      function baseReduce(collection, iteratee, accumulator, initAccum, eachFunc) {
        eachFunc(collection, function(value, index, collection2) {
          accumulator = initAccum ? (initAccum = false, value) : iteratee(accumulator, value, index, collection2);
        });
        return accumulator;
      }
      function baseSortBy(array, comparer) {
        var length = array.length;
        array.sort(comparer);
        while (length--) {
          array[length] = array[length].value;
        }
        return array;
      }
      function baseSum(array, iteratee) {
        var result, index = -1, length = array.length;
        while (++index < length) {
          var current = iteratee(array[index]);
          if (current !== undefined2) {
            result = result === undefined2 ? current : result + current;
          }
        }
        return result;
      }
      function baseTimes(n, iteratee) {
        var index = -1, result = Array(n);
        while (++index < n) {
          result[index] = iteratee(index);
        }
        return result;
      }
      function baseToPairs(object, props) {
        return arrayMap(props, function(key) {
          return [key, object[key]];
        });
      }
      function baseTrim(string) {
        return string ? string.slice(0, trimmedEndIndex(string) + 1).replace(reTrimStart, "") : string;
      }
      function baseUnary(func) {
        return function(value) {
          return func(value);
        };
      }
      function baseValues(object, props) {
        return arrayMap(props, function(key) {
          return object[key];
        });
      }
      function cacheHas(cache, key) {
        return cache.has(key);
      }
      function charsStartIndex(strSymbols, chrSymbols) {
        var index = -1, length = strSymbols.length;
        while (++index < length && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {
        }
        return index;
      }
      function charsEndIndex(strSymbols, chrSymbols) {
        var index = strSymbols.length;
        while (index-- && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {
        }
        return index;
      }
      function countHolders(array, placeholder) {
        var length = array.length, result = 0;
        while (length--) {
          if (array[length] === placeholder) {
            ++result;
          }
        }
        return result;
      }
      var deburrLetter = basePropertyOf(deburredLetters);
      var escapeHtmlChar = basePropertyOf(htmlEscapes);
      function escapeStringChar(chr) {
        return "\\" + stringEscapes[chr];
      }
      function getValue(object, key) {
        return object == null ? undefined2 : object[key];
      }
      function hasUnicode(string) {
        return reHasUnicode.test(string);
      }
      function hasUnicodeWord(string) {
        return reHasUnicodeWord.test(string);
      }
      function iteratorToArray(iterator) {
        var data, result = [];
        while (!(data = iterator.next()).done) {
          result.push(data.value);
        }
        return result;
      }
      function mapToArray(map) {
        var index = -1, result = Array(map.size);
        map.forEach(function(value, key) {
          result[++index] = [key, value];
        });
        return result;
      }
      function overArg(func, transform) {
        return function(arg) {
          return func(transform(arg));
        };
      }
      function replaceHolders(array, placeholder) {
        var index = -1, length = array.length, resIndex = 0, result = [];
        while (++index < length) {
          var value = array[index];
          if (value === placeholder || value === PLACEHOLDER) {
            array[index] = PLACEHOLDER;
            result[resIndex++] = index;
          }
        }
        return result;
      }
      function setToArray(set) {
        var index = -1, result = Array(set.size);
        set.forEach(function(value) {
          result[++index] = value;
        });
        return result;
      }
      function setToPairs(set) {
        var index = -1, result = Array(set.size);
        set.forEach(function(value) {
          result[++index] = [value, value];
        });
        return result;
      }
      function strictIndexOf(array, value, fromIndex) {
        var index = fromIndex - 1, length = array.length;
        while (++index < length) {
          if (array[index] === value) {
            return index;
          }
        }
        return -1;
      }
      function strictLastIndexOf(array, value, fromIndex) {
        var index = fromIndex + 1;
        while (index--) {
          if (array[index] === value) {
            return index;
          }
        }
        return index;
      }
      function stringSize(string) {
        return hasUnicode(string) ? unicodeSize(string) : asciiSize(string);
      }
      function stringToArray(string) {
        return hasUnicode(string) ? unicodeToArray(string) : asciiToArray(string);
      }
      function trimmedEndIndex(string) {
        var index = string.length;
        while (index-- && reWhitespace.test(string.charAt(index))) {
        }
        return index;
      }
      var unescapeHtmlChar = basePropertyOf(htmlUnescapes);
      function unicodeSize(string) {
        var result = reUnicode.lastIndex = 0;
        while (reUnicode.test(string)) {
          ++result;
        }
        return result;
      }
      function unicodeToArray(string) {
        return string.match(reUnicode) || [];
      }
      function unicodeWords(string) {
        return string.match(reUnicodeWord) || [];
      }
      var runInContext = (function runInContext2(context) {
        context = context == null ? root : _.defaults(root.Object(), context, _.pick(root, contextProps));
        var Array2 = context.Array, Date2 = context.Date, Error2 = context.Error, Function2 = context.Function, Math2 = context.Math, Object2 = context.Object, RegExp2 = context.RegExp, String2 = context.String, TypeError2 = context.TypeError;
        var arrayProto = Array2.prototype, funcProto = Function2.prototype, objectProto = Object2.prototype;
        var coreJsData = context["__core-js_shared__"];
        var funcToString = funcProto.toString;
        var hasOwnProperty = objectProto.hasOwnProperty;
        var idCounter = 0;
        var maskSrcKey = (function() {
          var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
          return uid ? "Symbol(src)_1." + uid : "";
        })();
        var nativeObjectToString = objectProto.toString;
        var objectCtorString = funcToString.call(Object2);
        var oldDash = root._;
        var reIsNative = RegExp2(
          "^" + funcToString.call(hasOwnProperty).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
        );
        var Buffer2 = moduleExports ? context.Buffer : undefined2, Symbol2 = context.Symbol, Uint8Array2 = context.Uint8Array, allocUnsafe = Buffer2 ? Buffer2.allocUnsafe : undefined2, getPrototype = overArg(Object2.getPrototypeOf, Object2), objectCreate = Object2.create, propertyIsEnumerable = objectProto.propertyIsEnumerable, splice = arrayProto.splice, spreadableSymbol = Symbol2 ? Symbol2.isConcatSpreadable : undefined2, symIterator = Symbol2 ? Symbol2.iterator : undefined2, symToStringTag = Symbol2 ? Symbol2.toStringTag : undefined2;
        var defineProperty = (function() {
          try {
            var func = getNative(Object2, "defineProperty");
            func({}, "", {});
            return func;
          } catch (e) {
          }
        })();
        var ctxClearTimeout = context.clearTimeout !== root.clearTimeout && context.clearTimeout, ctxNow = Date2 && Date2.now !== root.Date.now && Date2.now, ctxSetTimeout = context.setTimeout !== root.setTimeout && context.setTimeout;
        var nativeCeil = Math2.ceil, nativeFloor = Math2.floor, nativeGetSymbols = Object2.getOwnPropertySymbols, nativeIsBuffer = Buffer2 ? Buffer2.isBuffer : undefined2, nativeIsFinite = context.isFinite, nativeJoin = arrayProto.join, nativeKeys = overArg(Object2.keys, Object2), nativeMax = Math2.max, nativeMin = Math2.min, nativeNow = Date2.now, nativeParseInt = context.parseInt, nativeRandom = Math2.random, nativeReverse = arrayProto.reverse;
        var DataView = getNative(context, "DataView"), Map2 = getNative(context, "Map"), Promise2 = getNative(context, "Promise"), Set2 = getNative(context, "Set"), WeakMap = getNative(context, "WeakMap"), nativeCreate = getNative(Object2, "create");
        var metaMap = WeakMap && new WeakMap();
        var realNames = {};
        var dataViewCtorString = toSource(DataView), mapCtorString = toSource(Map2), promiseCtorString = toSource(Promise2), setCtorString = toSource(Set2), weakMapCtorString = toSource(WeakMap);
        var symbolProto = Symbol2 ? Symbol2.prototype : undefined2, symbolValueOf = symbolProto ? symbolProto.valueOf : undefined2, symbolToString = symbolProto ? symbolProto.toString : undefined2;
        function lodash(value) {
          if (isObjectLike(value) && !isArray(value) && !(value instanceof LazyWrapper)) {
            if (value instanceof LodashWrapper) {
              return value;
            }
            if (hasOwnProperty.call(value, "__wrapped__")) {
              return wrapperClone(value);
            }
          }
          return new LodashWrapper(value);
        }
        var baseCreate = /* @__PURE__ */ (function() {
          function object() {
          }
          return function(proto) {
            if (!isObject(proto)) {
              return {};
            }
            if (objectCreate) {
              return objectCreate(proto);
            }
            object.prototype = proto;
            var result2 = new object();
            object.prototype = undefined2;
            return result2;
          };
        })();
        function baseLodash() {
        }
        function LodashWrapper(value, chainAll) {
          this.__wrapped__ = value;
          this.__actions__ = [];
          this.__chain__ = !!chainAll;
          this.__index__ = 0;
          this.__values__ = undefined2;
        }
        lodash.templateSettings = {
          /**
           * Used to detect `data` property values to be HTML-escaped.
           *
           * @memberOf _.templateSettings
           * @type {RegExp}
           */
          "escape": reEscape,
          /**
           * Used to detect code to be evaluated.
           *
           * @memberOf _.templateSettings
           * @type {RegExp}
           */
          "evaluate": reEvaluate,
          /**
           * Used to detect `data` property values to inject.
           *
           * @memberOf _.templateSettings
           * @type {RegExp}
           */
          "interpolate": reInterpolate,
          /**
           * Used to reference the data object in the template text.
           *
           * @memberOf _.templateSettings
           * @type {string}
           */
          "variable": "",
          /**
           * Used to import variables into the compiled template.
           *
           * @memberOf _.templateSettings
           * @type {Object}
           */
          "imports": {
            /**
             * A reference to the `lodash` function.
             *
             * @memberOf _.templateSettings.imports
             * @type {Function}
             */
            "_": lodash
          }
        };
        lodash.prototype = baseLodash.prototype;
        lodash.prototype.constructor = lodash;
        LodashWrapper.prototype = baseCreate(baseLodash.prototype);
        LodashWrapper.prototype.constructor = LodashWrapper;
        function LazyWrapper(value) {
          this.__wrapped__ = value;
          this.__actions__ = [];
          this.__dir__ = 1;
          this.__filtered__ = false;
          this.__iteratees__ = [];
          this.__takeCount__ = MAX_ARRAY_LENGTH;
          this.__views__ = [];
        }
        function lazyClone() {
          var result2 = new LazyWrapper(this.__wrapped__);
          result2.__actions__ = copyArray(this.__actions__);
          result2.__dir__ = this.__dir__;
          result2.__filtered__ = this.__filtered__;
          result2.__iteratees__ = copyArray(this.__iteratees__);
          result2.__takeCount__ = this.__takeCount__;
          result2.__views__ = copyArray(this.__views__);
          return result2;
        }
        function lazyReverse() {
          if (this.__filtered__) {
            var result2 = new LazyWrapper(this);
            result2.__dir__ = -1;
            result2.__filtered__ = true;
          } else {
            result2 = this.clone();
            result2.__dir__ *= -1;
          }
          return result2;
        }
        function lazyValue() {
          var array = this.__wrapped__.value(), dir = this.__dir__, isArr = isArray(array), isRight = dir < 0, arrLength = isArr ? array.length : 0, view = getView(0, arrLength, this.__views__), start = view.start, end = view.end, length = end - start, index = isRight ? end : start - 1, iteratees = this.__iteratees__, iterLength = iteratees.length, resIndex = 0, takeCount = nativeMin(length, this.__takeCount__);
          if (!isArr || !isRight && arrLength == length && takeCount == length) {
            return baseWrapperValue(array, this.__actions__);
          }
          var result2 = [];
          outer:
            while (length-- && resIndex < takeCount) {
              index += dir;
              var iterIndex = -1, value = array[index];
              while (++iterIndex < iterLength) {
                var data = iteratees[iterIndex], iteratee2 = data.iteratee, type = data.type, computed = iteratee2(value);
                if (type == LAZY_MAP_FLAG) {
                  value = computed;
                } else if (!computed) {
                  if (type == LAZY_FILTER_FLAG) {
                    continue outer;
                  } else {
                    break outer;
                  }
                }
              }
              result2[resIndex++] = value;
            }
          return result2;
        }
        LazyWrapper.prototype = baseCreate(baseLodash.prototype);
        LazyWrapper.prototype.constructor = LazyWrapper;
        function Hash(entries) {
          var index = -1, length = entries == null ? 0 : entries.length;
          this.clear();
          while (++index < length) {
            var entry = entries[index];
            this.set(entry[0], entry[1]);
          }
        }
        function hashClear() {
          this.__data__ = nativeCreate ? nativeCreate(null) : {};
          this.size = 0;
        }
        function hashDelete(key) {
          var result2 = this.has(key) && delete this.__data__[key];
          this.size -= result2 ? 1 : 0;
          return result2;
        }
        function hashGet(key) {
          var data = this.__data__;
          if (nativeCreate) {
            var result2 = data[key];
            return result2 === HASH_UNDEFINED ? undefined2 : result2;
          }
          return hasOwnProperty.call(data, key) ? data[key] : undefined2;
        }
        function hashHas(key) {
          var data = this.__data__;
          return nativeCreate ? data[key] !== undefined2 : hasOwnProperty.call(data, key);
        }
        function hashSet(key, value) {
          var data = this.__data__;
          this.size += this.has(key) ? 0 : 1;
          data[key] = nativeCreate && value === undefined2 ? HASH_UNDEFINED : value;
          return this;
        }
        Hash.prototype.clear = hashClear;
        Hash.prototype["delete"] = hashDelete;
        Hash.prototype.get = hashGet;
        Hash.prototype.has = hashHas;
        Hash.prototype.set = hashSet;
        function ListCache(entries) {
          var index = -1, length = entries == null ? 0 : entries.length;
          this.clear();
          while (++index < length) {
            var entry = entries[index];
            this.set(entry[0], entry[1]);
          }
        }
        function listCacheClear() {
          this.__data__ = [];
          this.size = 0;
        }
        function listCacheDelete(key) {
          var data = this.__data__, index = assocIndexOf(data, key);
          if (index < 0) {
            return false;
          }
          var lastIndex = data.length - 1;
          if (index == lastIndex) {
            data.pop();
          } else {
            splice.call(data, index, 1);
          }
          --this.size;
          return true;
        }
        function listCacheGet(key) {
          var data = this.__data__, index = assocIndexOf(data, key);
          return index < 0 ? undefined2 : data[index][1];
        }
        function listCacheHas(key) {
          return assocIndexOf(this.__data__, key) > -1;
        }
        function listCacheSet(key, value) {
          var data = this.__data__, index = assocIndexOf(data, key);
          if (index < 0) {
            ++this.size;
            data.push([key, value]);
          } else {
            data[index][1] = value;
          }
          return this;
        }
        ListCache.prototype.clear = listCacheClear;
        ListCache.prototype["delete"] = listCacheDelete;
        ListCache.prototype.get = listCacheGet;
        ListCache.prototype.has = listCacheHas;
        ListCache.prototype.set = listCacheSet;
        function MapCache(entries) {
          var index = -1, length = entries == null ? 0 : entries.length;
          this.clear();
          while (++index < length) {
            var entry = entries[index];
            this.set(entry[0], entry[1]);
          }
        }
        function mapCacheClear() {
          this.size = 0;
          this.__data__ = {
            "hash": new Hash(),
            "map": new (Map2 || ListCache)(),
            "string": new Hash()
          };
        }
        function mapCacheDelete(key) {
          var result2 = getMapData(this, key)["delete"](key);
          this.size -= result2 ? 1 : 0;
          return result2;
        }
        function mapCacheGet(key) {
          return getMapData(this, key).get(key);
        }
        function mapCacheHas(key) {
          return getMapData(this, key).has(key);
        }
        function mapCacheSet(key, value) {
          var data = getMapData(this, key), size2 = data.size;
          data.set(key, value);
          this.size += data.size == size2 ? 0 : 1;
          return this;
        }
        MapCache.prototype.clear = mapCacheClear;
        MapCache.prototype["delete"] = mapCacheDelete;
        MapCache.prototype.get = mapCacheGet;
        MapCache.prototype.has = mapCacheHas;
        MapCache.prototype.set = mapCacheSet;
        function SetCache(values2) {
          var index = -1, length = values2 == null ? 0 : values2.length;
          this.__data__ = new MapCache();
          while (++index < length) {
            this.add(values2[index]);
          }
        }
        function setCacheAdd(value) {
          this.__data__.set(value, HASH_UNDEFINED);
          return this;
        }
        function setCacheHas(value) {
          return this.__data__.has(value);
        }
        SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
        SetCache.prototype.has = setCacheHas;
        function Stack(entries) {
          var data = this.__data__ = new ListCache(entries);
          this.size = data.size;
        }
        function stackClear() {
          this.__data__ = new ListCache();
          this.size = 0;
        }
        function stackDelete(key) {
          var data = this.__data__, result2 = data["delete"](key);
          this.size = data.size;
          return result2;
        }
        function stackGet(key) {
          return this.__data__.get(key);
        }
        function stackHas(key) {
          return this.__data__.has(key);
        }
        function stackSet(key, value) {
          var data = this.__data__;
          if (data instanceof ListCache) {
            var pairs = data.__data__;
            if (!Map2 || pairs.length < LARGE_ARRAY_SIZE - 1) {
              pairs.push([key, value]);
              this.size = ++data.size;
              return this;
            }
            data = this.__data__ = new MapCache(pairs);
          }
          data.set(key, value);
          this.size = data.size;
          return this;
        }
        Stack.prototype.clear = stackClear;
        Stack.prototype["delete"] = stackDelete;
        Stack.prototype.get = stackGet;
        Stack.prototype.has = stackHas;
        Stack.prototype.set = stackSet;
        function arrayLikeKeys(value, inherited) {
          var isArr = isArray(value), isArg = !isArr && isArguments(value), isBuff = !isArr && !isArg && isBuffer(value), isType = !isArr && !isArg && !isBuff && isTypedArray(value), skipIndexes = isArr || isArg || isBuff || isType, result2 = skipIndexes ? baseTimes(value.length, String2) : [], length = result2.length;
          for (var key in value) {
            if ((inherited || hasOwnProperty.call(value, key)) && !(skipIndexes && // Safari 9 has enumerable `arguments.length` in strict mode.
            (key == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
            isBuff && (key == "offset" || key == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
            isType && (key == "buffer" || key == "byteLength" || key == "byteOffset") || // Skip index properties.
            isIndex(key, length)))) {
              result2.push(key);
            }
          }
          return result2;
        }
        function arraySample(array) {
          var length = array.length;
          return length ? array[baseRandom(0, length - 1)] : undefined2;
        }
        function arraySampleSize(array, n) {
          return shuffleSelf(copyArray(array), baseClamp(n, 0, array.length));
        }
        function arrayShuffle(array) {
          return shuffleSelf(copyArray(array));
        }
        function assignMergeValue(object, key, value) {
          if (value !== undefined2 && !eq(object[key], value) || value === undefined2 && !(key in object)) {
            baseAssignValue(object, key, value);
          }
        }
        function assignValue(object, key, value) {
          var objValue = object[key];
          if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) || value === undefined2 && !(key in object)) {
            baseAssignValue(object, key, value);
          }
        }
        function assocIndexOf(array, key) {
          var length = array.length;
          while (length--) {
            if (eq(array[length][0], key)) {
              return length;
            }
          }
          return -1;
        }
        function baseAggregator(collection, setter, iteratee2, accumulator) {
          baseEach(collection, function(value, key, collection2) {
            setter(accumulator, value, iteratee2(value), collection2);
          });
          return accumulator;
        }
        function baseAssign(object, source) {
          return object && copyObject(source, keys(source), object);
        }
        function baseAssignIn(object, source) {
          return object && copyObject(source, keysIn(source), object);
        }
        function baseAssignValue(object, key, value) {
          if (key == "__proto__" && defineProperty) {
            defineProperty(object, key, {
              "configurable": true,
              "enumerable": true,
              "value": value,
              "writable": true
            });
          } else {
            object[key] = value;
          }
        }
        function baseAt(object, paths) {
          var index = -1, length = paths.length, result2 = Array2(length), skip = object == null;
          while (++index < length) {
            result2[index] = skip ? undefined2 : get(object, paths[index]);
          }
          return result2;
        }
        function baseClamp(number, lower, upper) {
          if (number === number) {
            if (upper !== undefined2) {
              number = number <= upper ? number : upper;
            }
            if (lower !== undefined2) {
              number = number >= lower ? number : lower;
            }
          }
          return number;
        }
        function baseClone(value, bitmask, customizer, key, object, stack) {
          var result2, isDeep = bitmask & CLONE_DEEP_FLAG, isFlat = bitmask & CLONE_FLAT_FLAG, isFull = bitmask & CLONE_SYMBOLS_FLAG;
          if (customizer) {
            result2 = object ? customizer(value, key, object, stack) : customizer(value);
          }
          if (result2 !== undefined2) {
            return result2;
          }
          if (!isObject(value)) {
            return value;
          }
          var isArr = isArray(value);
          if (isArr) {
            result2 = initCloneArray(value);
            if (!isDeep) {
              return copyArray(value, result2);
            }
          } else {
            var tag = getTag(value), isFunc = tag == funcTag || tag == genTag;
            if (isBuffer(value)) {
              return cloneBuffer(value, isDeep);
            }
            if (tag == objectTag || tag == argsTag || isFunc && !object) {
              result2 = isFlat || isFunc ? {} : initCloneObject(value);
              if (!isDeep) {
                return isFlat ? copySymbolsIn(value, baseAssignIn(result2, value)) : copySymbols(value, baseAssign(result2, value));
              }
            } else {
              if (!cloneableTags[tag]) {
                return object ? value : {};
              }
              result2 = initCloneByTag(value, tag, isDeep);
            }
          }
          stack || (stack = new Stack());
          var stacked = stack.get(value);
          if (stacked) {
            return stacked;
          }
          stack.set(value, result2);
          if (isSet(value)) {
            value.forEach(function(subValue) {
              result2.add(baseClone(subValue, bitmask, customizer, subValue, value, stack));
            });
          } else if (isMap(value)) {
            value.forEach(function(subValue, key2) {
              result2.set(key2, baseClone(subValue, bitmask, customizer, key2, value, stack));
            });
          }
          var keysFunc = isFull ? isFlat ? getAllKeysIn : getAllKeys : isFlat ? keysIn : keys;
          var props = isArr ? undefined2 : keysFunc(value);
          arrayEach(props || value, function(subValue, key2) {
            if (props) {
              key2 = subValue;
              subValue = value[key2];
            }
            assignValue(result2, key2, baseClone(subValue, bitmask, customizer, key2, value, stack));
          });
          return result2;
        }
        function baseConforms(source) {
          var props = keys(source);
          return function(object) {
            return baseConformsTo(object, source, props);
          };
        }
        function baseConformsTo(object, source, props) {
          var length = props.length;
          if (object == null) {
            return !length;
          }
          object = Object2(object);
          while (length--) {
            var key = props[length], predicate = source[key], value = object[key];
            if (value === undefined2 && !(key in object) || !predicate(value)) {
              return false;
            }
          }
          return true;
        }
        function baseDelay(func, wait, args) {
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          return setTimeout2(function() {
            func.apply(undefined2, args);
          }, wait);
        }
        function baseDifference(array, values2, iteratee2, comparator) {
          var index = -1, includes2 = arrayIncludes, isCommon = true, length = array.length, result2 = [], valuesLength = values2.length;
          if (!length) {
            return result2;
          }
          if (iteratee2) {
            values2 = arrayMap(values2, baseUnary(iteratee2));
          }
          if (comparator) {
            includes2 = arrayIncludesWith;
            isCommon = false;
          } else if (values2.length >= LARGE_ARRAY_SIZE) {
            includes2 = cacheHas;
            isCommon = false;
            values2 = new SetCache(values2);
          }
          outer:
            while (++index < length) {
              var value = array[index], computed = iteratee2 == null ? value : iteratee2(value);
              value = comparator || value !== 0 ? value : 0;
              if (isCommon && computed === computed) {
                var valuesIndex = valuesLength;
                while (valuesIndex--) {
                  if (values2[valuesIndex] === computed) {
                    continue outer;
                  }
                }
                result2.push(value);
              } else if (!includes2(values2, computed, comparator)) {
                result2.push(value);
              }
            }
          return result2;
        }
        var baseEach = createBaseEach(baseForOwn);
        var baseEachRight = createBaseEach(baseForOwnRight, true);
        function baseEvery(collection, predicate) {
          var result2 = true;
          baseEach(collection, function(value, index, collection2) {
            result2 = !!predicate(value, index, collection2);
            return result2;
          });
          return result2;
        }
        function baseExtremum(array, iteratee2, comparator) {
          var index = -1, length = array.length;
          while (++index < length) {
            var value = array[index], current = iteratee2(value);
            if (current != null && (computed === undefined2 ? current === current && !isSymbol(current) : comparator(current, computed))) {
              var computed = current, result2 = value;
            }
          }
          return result2;
        }
        function baseFill(array, value, start, end) {
          var length = array.length;
          start = toInteger(start);
          if (start < 0) {
            start = -start > length ? 0 : length + start;
          }
          end = end === undefined2 || end > length ? length : toInteger(end);
          if (end < 0) {
            end += length;
          }
          end = start > end ? 0 : toLength(end);
          while (start < end) {
            array[start++] = value;
          }
          return array;
        }
        function baseFilter(collection, predicate) {
          var result2 = [];
          baseEach(collection, function(value, index, collection2) {
            if (predicate(value, index, collection2)) {
              result2.push(value);
            }
          });
          return result2;
        }
        function baseFlatten(array, depth, predicate, isStrict, result2) {
          var index = -1, length = array.length;
          predicate || (predicate = isFlattenable);
          result2 || (result2 = []);
          while (++index < length) {
            var value = array[index];
            if (depth > 0 && predicate(value)) {
              if (depth > 1) {
                baseFlatten(value, depth - 1, predicate, isStrict, result2);
              } else {
                arrayPush(result2, value);
              }
            } else if (!isStrict) {
              result2[result2.length] = value;
            }
          }
          return result2;
        }
        var baseFor = createBaseFor();
        var baseForRight = createBaseFor(true);
        function baseForOwn(object, iteratee2) {
          return object && baseFor(object, iteratee2, keys);
        }
        function baseForOwnRight(object, iteratee2) {
          return object && baseForRight(object, iteratee2, keys);
        }
        function baseFunctions(object, props) {
          return arrayFilter(props, function(key) {
            return isFunction(object[key]);
          });
        }
        function baseGet(object, path) {
          path = castPath(path, object);
          var index = 0, length = path.length;
          while (object != null && index < length) {
            object = object[toKey(path[index++])];
          }
          return index && index == length ? object : undefined2;
        }
        function baseGetAllKeys(object, keysFunc, symbolsFunc) {
          var result2 = keysFunc(object);
          return isArray(object) ? result2 : arrayPush(result2, symbolsFunc(object));
        }
        function baseGetTag(value) {
          if (value == null) {
            return value === undefined2 ? undefinedTag : nullTag;
          }
          return symToStringTag && symToStringTag in Object2(value) ? getRawTag(value) : objectToString(value);
        }
        function baseGt(value, other) {
          return value > other;
        }
        function baseHas(object, key) {
          return object != null && hasOwnProperty.call(object, key);
        }
        function baseHasIn(object, key) {
          return object != null && key in Object2(object);
        }
        function baseInRange(number, start, end) {
          return number >= nativeMin(start, end) && number < nativeMax(start, end);
        }
        function baseIntersection(arrays, iteratee2, comparator) {
          var includes2 = comparator ? arrayIncludesWith : arrayIncludes, length = arrays[0].length, othLength = arrays.length, othIndex = othLength, caches = Array2(othLength), maxLength = Infinity, result2 = [];
          while (othIndex--) {
            var array = arrays[othIndex];
            if (othIndex && iteratee2) {
              array = arrayMap(array, baseUnary(iteratee2));
            }
            maxLength = nativeMin(array.length, maxLength);
            caches[othIndex] = !comparator && (iteratee2 || length >= 120 && array.length >= 120) ? new SetCache(othIndex && array) : undefined2;
          }
          array = arrays[0];
          var index = -1, seen = caches[0];
          outer:
            while (++index < length && result2.length < maxLength) {
              var value = array[index], computed = iteratee2 ? iteratee2(value) : value;
              value = comparator || value !== 0 ? value : 0;
              if (!(seen ? cacheHas(seen, computed) : includes2(result2, computed, comparator))) {
                othIndex = othLength;
                while (--othIndex) {
                  var cache = caches[othIndex];
                  if (!(cache ? cacheHas(cache, computed) : includes2(arrays[othIndex], computed, comparator))) {
                    continue outer;
                  }
                }
                if (seen) {
                  seen.push(computed);
                }
                result2.push(value);
              }
            }
          return result2;
        }
        function baseInverter(object, setter, iteratee2, accumulator) {
          baseForOwn(object, function(value, key, object2) {
            setter(accumulator, iteratee2(value), key, object2);
          });
          return accumulator;
        }
        function baseInvoke(object, path, args) {
          path = castPath(path, object);
          object = parent(object, path);
          var func = object == null ? object : object[toKey(last(path))];
          return func == null ? undefined2 : apply(func, object, args);
        }
        function baseIsArguments(value) {
          return isObjectLike(value) && baseGetTag(value) == argsTag;
        }
        function baseIsArrayBuffer(value) {
          return isObjectLike(value) && baseGetTag(value) == arrayBufferTag;
        }
        function baseIsDate(value) {
          return isObjectLike(value) && baseGetTag(value) == dateTag;
        }
        function baseIsEqual(value, other, bitmask, customizer, stack) {
          if (value === other) {
            return true;
          }
          if (value == null || other == null || !isObjectLike(value) && !isObjectLike(other)) {
            return value !== value && other !== other;
          }
          return baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
        }
        function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack) {
          var objIsArr = isArray(object), othIsArr = isArray(other), objTag = objIsArr ? arrayTag : getTag(object), othTag = othIsArr ? arrayTag : getTag(other);
          objTag = objTag == argsTag ? objectTag : objTag;
          othTag = othTag == argsTag ? objectTag : othTag;
          var objIsObj = objTag == objectTag, othIsObj = othTag == objectTag, isSameTag = objTag == othTag;
          if (isSameTag && isBuffer(object)) {
            if (!isBuffer(other)) {
              return false;
            }
            objIsArr = true;
            objIsObj = false;
          }
          if (isSameTag && !objIsObj) {
            stack || (stack = new Stack());
            return objIsArr || isTypedArray(object) ? equalArrays(object, other, bitmask, customizer, equalFunc, stack) : equalByTag(object, other, objTag, bitmask, customizer, equalFunc, stack);
          }
          if (!(bitmask & COMPARE_PARTIAL_FLAG)) {
            var objIsWrapped = objIsObj && hasOwnProperty.call(object, "__wrapped__"), othIsWrapped = othIsObj && hasOwnProperty.call(other, "__wrapped__");
            if (objIsWrapped || othIsWrapped) {
              var objUnwrapped = objIsWrapped ? object.value() : object, othUnwrapped = othIsWrapped ? other.value() : other;
              stack || (stack = new Stack());
              return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
            }
          }
          if (!isSameTag) {
            return false;
          }
          stack || (stack = new Stack());
          return equalObjects(object, other, bitmask, customizer, equalFunc, stack);
        }
        function baseIsMap(value) {
          return isObjectLike(value) && getTag(value) == mapTag;
        }
        function baseIsMatch(object, source, matchData, customizer) {
          var index = matchData.length, length = index, noCustomizer = !customizer;
          if (object == null) {
            return !length;
          }
          object = Object2(object);
          while (index--) {
            var data = matchData[index];
            if (noCustomizer && data[2] ? data[1] !== object[data[0]] : !(data[0] in object)) {
              return false;
            }
          }
          while (++index < length) {
            data = matchData[index];
            var key = data[0], objValue = object[key], srcValue = data[1];
            if (noCustomizer && data[2]) {
              if (objValue === undefined2 && !(key in object)) {
                return false;
              }
            } else {
              var stack = new Stack();
              if (customizer) {
                var result2 = customizer(objValue, srcValue, key, object, source, stack);
              }
              if (!(result2 === undefined2 ? baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG, customizer, stack) : result2)) {
                return false;
              }
            }
          }
          return true;
        }
        function baseIsNative(value) {
          if (!isObject(value) || isMasked(value)) {
            return false;
          }
          var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
          return pattern.test(toSource(value));
        }
        function baseIsRegExp(value) {
          return isObjectLike(value) && baseGetTag(value) == regexpTag;
        }
        function baseIsSet(value) {
          return isObjectLike(value) && getTag(value) == setTag;
        }
        function baseIsTypedArray(value) {
          return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
        }
        function baseIteratee(value) {
          if (typeof value == "function") {
            return value;
          }
          if (value == null) {
            return identity;
          }
          if (typeof value == "object") {
            return isArray(value) ? baseMatchesProperty(value[0], value[1]) : baseMatches(value);
          }
          return property(value);
        }
        function baseKeys(object) {
          if (!isPrototype(object)) {
            return nativeKeys(object);
          }
          var result2 = [];
          for (var key in Object2(object)) {
            if (hasOwnProperty.call(object, key) && key != "constructor") {
              result2.push(key);
            }
          }
          return result2;
        }
        function baseKeysIn(object) {
          if (!isObject(object)) {
            return nativeKeysIn(object);
          }
          var isProto = isPrototype(object), result2 = [];
          for (var key in object) {
            if (!(key == "constructor" && (isProto || !hasOwnProperty.call(object, key)))) {
              result2.push(key);
            }
          }
          return result2;
        }
        function baseLt(value, other) {
          return value < other;
        }
        function baseMap(collection, iteratee2) {
          var index = -1, result2 = isArrayLike(collection) ? Array2(collection.length) : [];
          baseEach(collection, function(value, key, collection2) {
            result2[++index] = iteratee2(value, key, collection2);
          });
          return result2;
        }
        function baseMatches(source) {
          var matchData = getMatchData(source);
          if (matchData.length == 1 && matchData[0][2]) {
            return matchesStrictComparable(matchData[0][0], matchData[0][1]);
          }
          return function(object) {
            return object === source || baseIsMatch(object, source, matchData);
          };
        }
        function baseMatchesProperty(path, srcValue) {
          if (isKey(path) && isStrictComparable(srcValue)) {
            return matchesStrictComparable(toKey(path), srcValue);
          }
          return function(object) {
            var objValue = get(object, path);
            return objValue === undefined2 && objValue === srcValue ? hasIn(object, path) : baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG);
          };
        }
        function baseMerge(object, source, srcIndex, customizer, stack) {
          if (object === source) {
            return;
          }
          baseFor(source, function(srcValue, key) {
            stack || (stack = new Stack());
            if (isObject(srcValue)) {
              baseMergeDeep(object, source, key, srcIndex, baseMerge, customizer, stack);
            } else {
              var newValue = customizer ? customizer(safeGet(object, key), srcValue, key + "", object, source, stack) : undefined2;
              if (newValue === undefined2) {
                newValue = srcValue;
              }
              assignMergeValue(object, key, newValue);
            }
          }, keysIn);
        }
        function baseMergeDeep(object, source, key, srcIndex, mergeFunc, customizer, stack) {
          var objValue = safeGet(object, key), srcValue = safeGet(source, key), stacked = stack.get(srcValue);
          if (stacked) {
            assignMergeValue(object, key, stacked);
            return;
          }
          var newValue = customizer ? customizer(objValue, srcValue, key + "", object, source, stack) : undefined2;
          var isCommon = newValue === undefined2;
          if (isCommon) {
            var isArr = isArray(srcValue), isBuff = !isArr && isBuffer(srcValue), isTyped = !isArr && !isBuff && isTypedArray(srcValue);
            newValue = srcValue;
            if (isArr || isBuff || isTyped) {
              if (isArray(objValue)) {
                newValue = objValue;
              } else if (isArrayLikeObject(objValue)) {
                newValue = copyArray(objValue);
              } else if (isBuff) {
                isCommon = false;
                newValue = cloneBuffer(srcValue, true);
              } else if (isTyped) {
                isCommon = false;
                newValue = cloneTypedArray(srcValue, true);
              } else {
                newValue = [];
              }
            } else if (isPlainObject(srcValue) || isArguments(srcValue)) {
              newValue = objValue;
              if (isArguments(objValue)) {
                newValue = toPlainObject(objValue);
              } else if (!isObject(objValue) || isFunction(objValue)) {
                newValue = initCloneObject(srcValue);
              }
            } else {
              isCommon = false;
            }
          }
          if (isCommon) {
            stack.set(srcValue, newValue);
            mergeFunc(newValue, srcValue, srcIndex, customizer, stack);
            stack["delete"](srcValue);
          }
          assignMergeValue(object, key, newValue);
        }
        function baseNth(array, n) {
          var length = array.length;
          if (!length) {
            return;
          }
          n += n < 0 ? length : 0;
          return isIndex(n, length) ? array[n] : undefined2;
        }
        function baseOrderBy(collection, iteratees, orders) {
          if (iteratees.length) {
            iteratees = arrayMap(iteratees, function(iteratee2) {
              if (isArray(iteratee2)) {
                return function(value) {
                  return baseGet(value, iteratee2.length === 1 ? iteratee2[0] : iteratee2);
                };
              }
              return iteratee2;
            });
          } else {
            iteratees = [identity];
          }
          var index = -1;
          iteratees = arrayMap(iteratees, baseUnary(getIteratee()));
          var result2 = baseMap(collection, function(value, key, collection2) {
            var criteria = arrayMap(iteratees, function(iteratee2) {
              return iteratee2(value);
            });
            return { "criteria": criteria, "index": ++index, "value": value };
          });
          return baseSortBy(result2, function(object, other) {
            return compareMultiple(object, other, orders);
          });
        }
        function basePick(object, paths) {
          return basePickBy(object, paths, function(value, path) {
            return hasIn(object, path);
          });
        }
        function basePickBy(object, paths, predicate) {
          var index = -1, length = paths.length, result2 = {};
          while (++index < length) {
            var path = paths[index], value = baseGet(object, path);
            if (predicate(value, path)) {
              baseSet(result2, castPath(path, object), value);
            }
          }
          return result2;
        }
        function basePropertyDeep(path) {
          return function(object) {
            return baseGet(object, path);
          };
        }
        function basePullAll(array, values2, iteratee2, comparator) {
          var indexOf2 = comparator ? baseIndexOfWith : baseIndexOf, index = -1, length = values2.length, seen = array;
          if (array === values2) {
            values2 = copyArray(values2);
          }
          if (iteratee2) {
            seen = arrayMap(array, baseUnary(iteratee2));
          }
          while (++index < length) {
            var fromIndex = 0, value = values2[index], computed = iteratee2 ? iteratee2(value) : value;
            while ((fromIndex = indexOf2(seen, computed, fromIndex, comparator)) > -1) {
              if (seen !== array) {
                splice.call(seen, fromIndex, 1);
              }
              splice.call(array, fromIndex, 1);
            }
          }
          return array;
        }
        function basePullAt(array, indexes) {
          var length = array ? indexes.length : 0, lastIndex = length - 1;
          while (length--) {
            var index = indexes[length];
            if (length == lastIndex || index !== previous) {
              var previous = index;
              if (isIndex(index)) {
                splice.call(array, index, 1);
              } else {
                baseUnset(array, index);
              }
            }
          }
          return array;
        }
        function baseRandom(lower, upper) {
          return lower + nativeFloor(nativeRandom() * (upper - lower + 1));
        }
        function baseRange(start, end, step, fromRight) {
          var index = -1, length = nativeMax(nativeCeil((end - start) / (step || 1)), 0), result2 = Array2(length);
          while (length--) {
            result2[fromRight ? length : ++index] = start;
            start += step;
          }
          return result2;
        }
        function baseRepeat(string, n) {
          var result2 = "";
          if (!string || n < 1 || n > MAX_SAFE_INTEGER) {
            return result2;
          }
          do {
            if (n % 2) {
              result2 += string;
            }
            n = nativeFloor(n / 2);
            if (n) {
              string += string;
            }
          } while (n);
          return result2;
        }
        function baseRest(func, start) {
          return setToString(overRest(func, start, identity), func + "");
        }
        function baseSample(collection) {
          return arraySample(values(collection));
        }
        function baseSampleSize(collection, n) {
          var array = values(collection);
          return shuffleSelf(array, baseClamp(n, 0, array.length));
        }
        function baseSet(object, path, value, customizer) {
          if (!isObject(object)) {
            return object;
          }
          path = castPath(path, object);
          var index = -1, length = path.length, lastIndex = length - 1, nested = object;
          while (nested != null && ++index < length) {
            var key = toKey(path[index]), newValue = value;
            if (key === "__proto__" || key === "constructor" || key === "prototype") {
              return object;
            }
            if (index != lastIndex) {
              var objValue = nested[key];
              newValue = customizer ? customizer(objValue, key, nested) : undefined2;
              if (newValue === undefined2) {
                newValue = isObject(objValue) ? objValue : isIndex(path[index + 1]) ? [] : {};
              }
            }
            assignValue(nested, key, newValue);
            nested = nested[key];
          }
          return object;
        }
        var baseSetData = !metaMap ? identity : function(func, data) {
          metaMap.set(func, data);
          return func;
        };
        var baseSetToString = !defineProperty ? identity : function(func, string) {
          return defineProperty(func, "toString", {
            "configurable": true,
            "enumerable": false,
            "value": constant(string),
            "writable": true
          });
        };
        function baseShuffle(collection) {
          return shuffleSelf(values(collection));
        }
        function baseSlice(array, start, end) {
          var index = -1, length = array.length;
          if (start < 0) {
            start = -start > length ? 0 : length + start;
          }
          end = end > length ? length : end;
          if (end < 0) {
            end += length;
          }
          length = start > end ? 0 : end - start >>> 0;
          start >>>= 0;
          var result2 = Array2(length);
          while (++index < length) {
            result2[index] = array[index + start];
          }
          return result2;
        }
        function baseSome(collection, predicate) {
          var result2;
          baseEach(collection, function(value, index, collection2) {
            result2 = predicate(value, index, collection2);
            return !result2;
          });
          return !!result2;
        }
        function baseSortedIndex(array, value, retHighest) {
          var low = 0, high = array == null ? low : array.length;
          if (typeof value == "number" && value === value && high <= HALF_MAX_ARRAY_LENGTH) {
            while (low < high) {
              var mid = low + high >>> 1, computed = array[mid];
              if (computed !== null && !isSymbol(computed) && (retHighest ? computed <= value : computed < value)) {
                low = mid + 1;
              } else {
                high = mid;
              }
            }
            return high;
          }
          return baseSortedIndexBy(array, value, identity, retHighest);
        }
        function baseSortedIndexBy(array, value, iteratee2, retHighest) {
          var low = 0, high = array == null ? 0 : array.length;
          if (high === 0) {
            return 0;
          }
          value = iteratee2(value);
          var valIsNaN = value !== value, valIsNull = value === null, valIsSymbol = isSymbol(value), valIsUndefined = value === undefined2;
          while (low < high) {
            var mid = nativeFloor((low + high) / 2), computed = iteratee2(array[mid]), othIsDefined = computed !== undefined2, othIsNull = computed === null, othIsReflexive = computed === computed, othIsSymbol = isSymbol(computed);
            if (valIsNaN) {
              var setLow = retHighest || othIsReflexive;
            } else if (valIsUndefined) {
              setLow = othIsReflexive && (retHighest || othIsDefined);
            } else if (valIsNull) {
              setLow = othIsReflexive && othIsDefined && (retHighest || !othIsNull);
            } else if (valIsSymbol) {
              setLow = othIsReflexive && othIsDefined && !othIsNull && (retHighest || !othIsSymbol);
            } else if (othIsNull || othIsSymbol) {
              setLow = false;
            } else {
              setLow = retHighest ? computed <= value : computed < value;
            }
            if (setLow) {
              low = mid + 1;
            } else {
              high = mid;
            }
          }
          return nativeMin(high, MAX_ARRAY_INDEX);
        }
        function baseSortedUniq(array, iteratee2) {
          var index = -1, length = array.length, resIndex = 0, result2 = [];
          while (++index < length) {
            var value = array[index], computed = iteratee2 ? iteratee2(value) : value;
            if (!index || !eq(computed, seen)) {
              var seen = computed;
              result2[resIndex++] = value === 0 ? 0 : value;
            }
          }
          return result2;
        }
        function baseToNumber(value) {
          if (typeof value == "number") {
            return value;
          }
          if (isSymbol(value)) {
            return NAN;
          }
          return +value;
        }
        function baseToString(value) {
          if (typeof value == "string") {
            return value;
          }
          if (isArray(value)) {
            return arrayMap(value, baseToString) + "";
          }
          if (isSymbol(value)) {
            return symbolToString ? symbolToString.call(value) : "";
          }
          var result2 = value + "";
          return result2 == "0" && 1 / value == -INFINITY ? "-0" : result2;
        }
        function baseUniq(array, iteratee2, comparator) {
          var index = -1, includes2 = arrayIncludes, length = array.length, isCommon = true, result2 = [], seen = result2;
          if (comparator) {
            isCommon = false;
            includes2 = arrayIncludesWith;
          } else if (length >= LARGE_ARRAY_SIZE) {
            var set2 = iteratee2 ? null : createSet(array);
            if (set2) {
              return setToArray(set2);
            }
            isCommon = false;
            includes2 = cacheHas;
            seen = new SetCache();
          } else {
            seen = iteratee2 ? [] : result2;
          }
          outer:
            while (++index < length) {
              var value = array[index], computed = iteratee2 ? iteratee2(value) : value;
              value = comparator || value !== 0 ? value : 0;
              if (isCommon && computed === computed) {
                var seenIndex = seen.length;
                while (seenIndex--) {
                  if (seen[seenIndex] === computed) {
                    continue outer;
                  }
                }
                if (iteratee2) {
                  seen.push(computed);
                }
                result2.push(value);
              } else if (!includes2(seen, computed, comparator)) {
                if (seen !== result2) {
                  seen.push(computed);
                }
                result2.push(value);
              }
            }
          return result2;
        }
        function baseUnset(object, path) {
          path = castPath(path, object);
          var index = -1, length = path.length;
          if (!length) {
            return true;
          }
          var isRootPrimitive = object == null || typeof object !== "object" && typeof object !== "function";
          while (++index < length) {
            var key = path[index];
            if (typeof key !== "string") {
              continue;
            }
            if (key === "__proto__" && !hasOwnProperty.call(object, "__proto__")) {
              return false;
            }
            if (key === "constructor" && index + 1 < length && typeof path[index + 1] === "string" && path[index + 1] === "prototype") {
              if (isRootPrimitive && index === 0) {
                continue;
              }
              return false;
            }
          }
          var obj = parent(object, path);
          return obj == null || delete obj[toKey(last(path))];
        }
        function baseUpdate(object, path, updater, customizer) {
          return baseSet(object, path, updater(baseGet(object, path)), customizer);
        }
        function baseWhile(array, predicate, isDrop, fromRight) {
          var length = array.length, index = fromRight ? length : -1;
          while ((fromRight ? index-- : ++index < length) && predicate(array[index], index, array)) {
          }
          return isDrop ? baseSlice(array, fromRight ? 0 : index, fromRight ? index + 1 : length) : baseSlice(array, fromRight ? index + 1 : 0, fromRight ? length : index);
        }
        function baseWrapperValue(value, actions) {
          var result2 = value;
          if (result2 instanceof LazyWrapper) {
            result2 = result2.value();
          }
          return arrayReduce(actions, function(result3, action) {
            return action.func.apply(action.thisArg, arrayPush([result3], action.args));
          }, result2);
        }
        function baseXor(arrays, iteratee2, comparator) {
          var length = arrays.length;
          if (length < 2) {
            return length ? baseUniq(arrays[0]) : [];
          }
          var index = -1, result2 = Array2(length);
          while (++index < length) {
            var array = arrays[index], othIndex = -1;
            while (++othIndex < length) {
              if (othIndex != index) {
                result2[index] = baseDifference(result2[index] || array, arrays[othIndex], iteratee2, comparator);
              }
            }
          }
          return baseUniq(baseFlatten(result2, 1), iteratee2, comparator);
        }
        function baseZipObject(props, values2, assignFunc) {
          var index = -1, length = props.length, valsLength = values2.length, result2 = {};
          while (++index < length) {
            var value = index < valsLength ? values2[index] : undefined2;
            assignFunc(result2, props[index], value);
          }
          return result2;
        }
        function castArrayLikeObject(value) {
          return isArrayLikeObject(value) ? value : [];
        }
        function castFunction(value) {
          return typeof value == "function" ? value : identity;
        }
        function castPath(value, object) {
          if (isArray(value)) {
            return value;
          }
          return isKey(value, object) ? [value] : stringToPath(toString(value));
        }
        var castRest = baseRest;
        function castSlice(array, start, end) {
          var length = array.length;
          end = end === undefined2 ? length : end;
          return !start && end >= length ? array : baseSlice(array, start, end);
        }
        var clearTimeout = ctxClearTimeout || function(id) {
          return root.clearTimeout(id);
        };
        function cloneBuffer(buffer, isDeep) {
          if (isDeep) {
            return buffer.slice();
          }
          var length = buffer.length, result2 = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);
          buffer.copy(result2);
          return result2;
        }
        function cloneArrayBuffer(arrayBuffer) {
          var result2 = new arrayBuffer.constructor(arrayBuffer.byteLength);
          new Uint8Array2(result2).set(new Uint8Array2(arrayBuffer));
          return result2;
        }
        function cloneDataView(dataView, isDeep) {
          var buffer = isDeep ? cloneArrayBuffer(dataView.buffer) : dataView.buffer;
          return new dataView.constructor(buffer, dataView.byteOffset, dataView.byteLength);
        }
        function cloneRegExp(regexp) {
          var result2 = new regexp.constructor(regexp.source, reFlags.exec(regexp));
          result2.lastIndex = regexp.lastIndex;
          return result2;
        }
        function cloneSymbol(symbol) {
          return symbolValueOf ? Object2(symbolValueOf.call(symbol)) : {};
        }
        function cloneTypedArray(typedArray, isDeep) {
          var buffer = isDeep ? cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
          return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
        }
        function compareAscending(value, other) {
          if (value !== other) {
            var valIsDefined = value !== undefined2, valIsNull = value === null, valIsReflexive = value === value, valIsSymbol = isSymbol(value);
            var othIsDefined = other !== undefined2, othIsNull = other === null, othIsReflexive = other === other, othIsSymbol = isSymbol(other);
            if (!othIsNull && !othIsSymbol && !valIsSymbol && value > other || valIsSymbol && othIsDefined && othIsReflexive && !othIsNull && !othIsSymbol || valIsNull && othIsDefined && othIsReflexive || !valIsDefined && othIsReflexive || !valIsReflexive) {
              return 1;
            }
            if (!valIsNull && !valIsSymbol && !othIsSymbol && value < other || othIsSymbol && valIsDefined && valIsReflexive && !valIsNull && !valIsSymbol || othIsNull && valIsDefined && valIsReflexive || !othIsDefined && valIsReflexive || !othIsReflexive) {
              return -1;
            }
          }
          return 0;
        }
        function compareMultiple(object, other, orders) {
          var index = -1, objCriteria = object.criteria, othCriteria = other.criteria, length = objCriteria.length, ordersLength = orders.length;
          while (++index < length) {
            var result2 = compareAscending(objCriteria[index], othCriteria[index]);
            if (result2) {
              if (index >= ordersLength) {
                return result2;
              }
              var order = orders[index];
              return result2 * (order == "desc" ? -1 : 1);
            }
          }
          return object.index - other.index;
        }
        function composeArgs(args, partials, holders, isCurried) {
          var argsIndex = -1, argsLength = args.length, holdersLength = holders.length, leftIndex = -1, leftLength = partials.length, rangeLength = nativeMax(argsLength - holdersLength, 0), result2 = Array2(leftLength + rangeLength), isUncurried = !isCurried;
          while (++leftIndex < leftLength) {
            result2[leftIndex] = partials[leftIndex];
          }
          while (++argsIndex < holdersLength) {
            if (isUncurried || argsIndex < argsLength) {
              result2[holders[argsIndex]] = args[argsIndex];
            }
          }
          while (rangeLength--) {
            result2[leftIndex++] = args[argsIndex++];
          }
          return result2;
        }
        function composeArgsRight(args, partials, holders, isCurried) {
          var argsIndex = -1, argsLength = args.length, holdersIndex = -1, holdersLength = holders.length, rightIndex = -1, rightLength = partials.length, rangeLength = nativeMax(argsLength - holdersLength, 0), result2 = Array2(rangeLength + rightLength), isUncurried = !isCurried;
          while (++argsIndex < rangeLength) {
            result2[argsIndex] = args[argsIndex];
          }
          var offset = argsIndex;
          while (++rightIndex < rightLength) {
            result2[offset + rightIndex] = partials[rightIndex];
          }
          while (++holdersIndex < holdersLength) {
            if (isUncurried || argsIndex < argsLength) {
              result2[offset + holders[holdersIndex]] = args[argsIndex++];
            }
          }
          return result2;
        }
        function copyArray(source, array) {
          var index = -1, length = source.length;
          array || (array = Array2(length));
          while (++index < length) {
            array[index] = source[index];
          }
          return array;
        }
        function copyObject(source, props, object, customizer) {
          var isNew = !object;
          object || (object = {});
          var index = -1, length = props.length;
          while (++index < length) {
            var key = props[index];
            var newValue = customizer ? customizer(object[key], source[key], key, object, source) : undefined2;
            if (newValue === undefined2) {
              newValue = source[key];
            }
            if (isNew) {
              baseAssignValue(object, key, newValue);
            } else {
              assignValue(object, key, newValue);
            }
          }
          return object;
        }
        function copySymbols(source, object) {
          return copyObject(source, getSymbols(source), object);
        }
        function copySymbolsIn(source, object) {
          return copyObject(source, getSymbolsIn(source), object);
        }
        function createAggregator(setter, initializer) {
          return function(collection, iteratee2) {
            var func = isArray(collection) ? arrayAggregator : baseAggregator, accumulator = initializer ? initializer() : {};
            return func(collection, setter, getIteratee(iteratee2, 2), accumulator);
          };
        }
        function createAssigner(assigner) {
          return baseRest(function(object, sources) {
            var index = -1, length = sources.length, customizer = length > 1 ? sources[length - 1] : undefined2, guard = length > 2 ? sources[2] : undefined2;
            customizer = assigner.length > 3 && typeof customizer == "function" ? (length--, customizer) : undefined2;
            if (guard && isIterateeCall(sources[0], sources[1], guard)) {
              customizer = length < 3 ? undefined2 : customizer;
              length = 1;
            }
            object = Object2(object);
            while (++index < length) {
              var source = sources[index];
              if (source) {
                assigner(object, source, index, customizer);
              }
            }
            return object;
          });
        }
        function createBaseEach(eachFunc, fromRight) {
          return function(collection, iteratee2) {
            if (collection == null) {
              return collection;
            }
            if (!isArrayLike(collection)) {
              return eachFunc(collection, iteratee2);
            }
            var length = collection.length, index = fromRight ? length : -1, iterable = Object2(collection);
            while (fromRight ? index-- : ++index < length) {
              if (iteratee2(iterable[index], index, iterable) === false) {
                break;
              }
            }
            return collection;
          };
        }
        function createBaseFor(fromRight) {
          return function(object, iteratee2, keysFunc) {
            var index = -1, iterable = Object2(object), props = keysFunc(object), length = props.length;
            while (length--) {
              var key = props[fromRight ? length : ++index];
              if (iteratee2(iterable[key], key, iterable) === false) {
                break;
              }
            }
            return object;
          };
        }
        function createBind(func, bitmask, thisArg) {
          var isBind = bitmask & WRAP_BIND_FLAG, Ctor = createCtor(func);
          function wrapper() {
            var fn = this && this !== root && this instanceof wrapper ? Ctor : func;
            return fn.apply(isBind ? thisArg : this, arguments);
          }
          return wrapper;
        }
        function createCaseFirst(methodName) {
          return function(string) {
            string = toString(string);
            var strSymbols = hasUnicode(string) ? stringToArray(string) : undefined2;
            var chr = strSymbols ? strSymbols[0] : string.charAt(0);
            var trailing = strSymbols ? castSlice(strSymbols, 1).join("") : string.slice(1);
            return chr[methodName]() + trailing;
          };
        }
        function createCompounder(callback) {
          return function(string) {
            return arrayReduce(words(deburr(string).replace(reApos, "")), callback, "");
          };
        }
        function createCtor(Ctor) {
          return function() {
            var args = arguments;
            switch (args.length) {
              case 0:
                return new Ctor();
              case 1:
                return new Ctor(args[0]);
              case 2:
                return new Ctor(args[0], args[1]);
              case 3:
                return new Ctor(args[0], args[1], args[2]);
              case 4:
                return new Ctor(args[0], args[1], args[2], args[3]);
              case 5:
                return new Ctor(args[0], args[1], args[2], args[3], args[4]);
              case 6:
                return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5]);
              case 7:
                return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
            }
            var thisBinding = baseCreate(Ctor.prototype), result2 = Ctor.apply(thisBinding, args);
            return isObject(result2) ? result2 : thisBinding;
          };
        }
        function createCurry(func, bitmask, arity) {
          var Ctor = createCtor(func);
          function wrapper() {
            var length = arguments.length, args = Array2(length), index = length, placeholder = getHolder(wrapper);
            while (index--) {
              args[index] = arguments[index];
            }
            var holders = length < 3 && args[0] !== placeholder && args[length - 1] !== placeholder ? [] : replaceHolders(args, placeholder);
            length -= holders.length;
            if (length < arity) {
              return createRecurry(
                func,
                bitmask,
                createHybrid,
                wrapper.placeholder,
                undefined2,
                args,
                holders,
                undefined2,
                undefined2,
                arity - length
              );
            }
            var fn = this && this !== root && this instanceof wrapper ? Ctor : func;
            return apply(fn, this, args);
          }
          return wrapper;
        }
        function createFind(findIndexFunc) {
          return function(collection, predicate, fromIndex) {
            var iterable = Object2(collection);
            if (!isArrayLike(collection)) {
              var iteratee2 = getIteratee(predicate, 3);
              collection = keys(collection);
              predicate = function(key) {
                return iteratee2(iterable[key], key, iterable);
              };
            }
            var index = findIndexFunc(collection, predicate, fromIndex);
            return index > -1 ? iterable[iteratee2 ? collection[index] : index] : undefined2;
          };
        }
        function createFlow(fromRight) {
          return flatRest(function(funcs) {
            var length = funcs.length, index = length, prereq = LodashWrapper.prototype.thru;
            if (fromRight) {
              funcs.reverse();
            }
            while (index--) {
              var func = funcs[index];
              if (typeof func != "function") {
                throw new TypeError2(FUNC_ERROR_TEXT);
              }
              if (prereq && !wrapper && getFuncName(func) == "wrapper") {
                var wrapper = new LodashWrapper([], true);
              }
            }
            index = wrapper ? index : length;
            while (++index < length) {
              func = funcs[index];
              var funcName = getFuncName(func), data = funcName == "wrapper" ? getData(func) : undefined2;
              if (data && isLaziable(data[0]) && data[1] == (WRAP_ARY_FLAG | WRAP_CURRY_FLAG | WRAP_PARTIAL_FLAG | WRAP_REARG_FLAG) && !data[4].length && data[9] == 1) {
                wrapper = wrapper[getFuncName(data[0])].apply(wrapper, data[3]);
              } else {
                wrapper = func.length == 1 && isLaziable(func) ? wrapper[funcName]() : wrapper.thru(func);
              }
            }
            return function() {
              var args = arguments, value = args[0];
              if (wrapper && args.length == 1 && isArray(value)) {
                return wrapper.plant(value).value();
              }
              var index2 = 0, result2 = length ? funcs[index2].apply(this, args) : value;
              while (++index2 < length) {
                result2 = funcs[index2].call(this, result2);
              }
              return result2;
            };
          });
        }
        function createHybrid(func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary2, arity) {
          var isAry = bitmask & WRAP_ARY_FLAG, isBind = bitmask & WRAP_BIND_FLAG, isBindKey = bitmask & WRAP_BIND_KEY_FLAG, isCurried = bitmask & (WRAP_CURRY_FLAG | WRAP_CURRY_RIGHT_FLAG), isFlip = bitmask & WRAP_FLIP_FLAG, Ctor = isBindKey ? undefined2 : createCtor(func);
          function wrapper() {
            var length = arguments.length, args = Array2(length), index = length;
            while (index--) {
              args[index] = arguments[index];
            }
            if (isCurried) {
              var placeholder = getHolder(wrapper), holdersCount = countHolders(args, placeholder);
            }
            if (partials) {
              args = composeArgs(args, partials, holders, isCurried);
            }
            if (partialsRight) {
              args = composeArgsRight(args, partialsRight, holdersRight, isCurried);
            }
            length -= holdersCount;
            if (isCurried && length < arity) {
              var newHolders = replaceHolders(args, placeholder);
              return createRecurry(
                func,
                bitmask,
                createHybrid,
                wrapper.placeholder,
                thisArg,
                args,
                newHolders,
                argPos,
                ary2,
                arity - length
              );
            }
            var thisBinding = isBind ? thisArg : this, fn = isBindKey ? thisBinding[func] : func;
            length = args.length;
            if (argPos) {
              args = reorder(args, argPos);
            } else if (isFlip && length > 1) {
              args.reverse();
            }
            if (isAry && ary2 < length) {
              args.length = ary2;
            }
            if (this && this !== root && this instanceof wrapper) {
              fn = Ctor || createCtor(fn);
            }
            return fn.apply(thisBinding, args);
          }
          return wrapper;
        }
        function createInverter(setter, toIteratee) {
          return function(object, iteratee2) {
            return baseInverter(object, setter, toIteratee(iteratee2), {});
          };
        }
        function createMathOperation(operator, defaultValue) {
          return function(value, other) {
            var result2;
            if (value === undefined2 && other === undefined2) {
              return defaultValue;
            }
            if (value !== undefined2) {
              result2 = value;
            }
            if (other !== undefined2) {
              if (result2 === undefined2) {
                return other;
              }
              if (typeof value == "string" || typeof other == "string") {
                value = baseToString(value);
                other = baseToString(other);
              } else {
                value = baseToNumber(value);
                other = baseToNumber(other);
              }
              result2 = operator(value, other);
            }
            return result2;
          };
        }
        function createOver(arrayFunc) {
          return flatRest(function(iteratees) {
            iteratees = arrayMap(iteratees, baseUnary(getIteratee()));
            return baseRest(function(args) {
              var thisArg = this;
              return arrayFunc(iteratees, function(iteratee2) {
                return apply(iteratee2, thisArg, args);
              });
            });
          });
        }
        function createPadding(length, chars) {
          chars = chars === undefined2 ? " " : baseToString(chars);
          var charsLength = chars.length;
          if (charsLength < 2) {
            return charsLength ? baseRepeat(chars, length) : chars;
          }
          var result2 = baseRepeat(chars, nativeCeil(length / stringSize(chars)));
          return hasUnicode(chars) ? castSlice(stringToArray(result2), 0, length).join("") : result2.slice(0, length);
        }
        function createPartial(func, bitmask, thisArg, partials) {
          var isBind = bitmask & WRAP_BIND_FLAG, Ctor = createCtor(func);
          function wrapper() {
            var argsIndex = -1, argsLength = arguments.length, leftIndex = -1, leftLength = partials.length, args = Array2(leftLength + argsLength), fn = this && this !== root && this instanceof wrapper ? Ctor : func;
            while (++leftIndex < leftLength) {
              args[leftIndex] = partials[leftIndex];
            }
            while (argsLength--) {
              args[leftIndex++] = arguments[++argsIndex];
            }
            return apply(fn, isBind ? thisArg : this, args);
          }
          return wrapper;
        }
        function createRange(fromRight) {
          return function(start, end, step) {
            if (step && typeof step != "number" && isIterateeCall(start, end, step)) {
              end = step = undefined2;
            }
            start = toFinite(start);
            if (end === undefined2) {
              end = start;
              start = 0;
            } else {
              end = toFinite(end);
            }
            step = step === undefined2 ? start < end ? 1 : -1 : toFinite(step);
            return baseRange(start, end, step, fromRight);
          };
        }
        function createRelationalOperation(operator) {
          return function(value, other) {
            if (!(typeof value == "string" && typeof other == "string")) {
              value = toNumber(value);
              other = toNumber(other);
            }
            return operator(value, other);
          };
        }
        function createRecurry(func, bitmask, wrapFunc, placeholder, thisArg, partials, holders, argPos, ary2, arity) {
          var isCurry = bitmask & WRAP_CURRY_FLAG, newHolders = isCurry ? holders : undefined2, newHoldersRight = isCurry ? undefined2 : holders, newPartials = isCurry ? partials : undefined2, newPartialsRight = isCurry ? undefined2 : partials;
          bitmask |= isCurry ? WRAP_PARTIAL_FLAG : WRAP_PARTIAL_RIGHT_FLAG;
          bitmask &= ~(isCurry ? WRAP_PARTIAL_RIGHT_FLAG : WRAP_PARTIAL_FLAG);
          if (!(bitmask & WRAP_CURRY_BOUND_FLAG)) {
            bitmask &= ~(WRAP_BIND_FLAG | WRAP_BIND_KEY_FLAG);
          }
          var newData = [
            func,
            bitmask,
            thisArg,
            newPartials,
            newHolders,
            newPartialsRight,
            newHoldersRight,
            argPos,
            ary2,
            arity
          ];
          var result2 = wrapFunc.apply(undefined2, newData);
          if (isLaziable(func)) {
            setData(result2, newData);
          }
          result2.placeholder = placeholder;
          return setWrapToString(result2, func, bitmask);
        }
        function createRound(methodName) {
          var func = Math2[methodName];
          return function(number, precision) {
            number = toNumber(number);
            precision = precision == null ? 0 : nativeMin(toInteger(precision), 292);
            if (precision && nativeIsFinite(number)) {
              var pair = (toString(number) + "e").split("e"), value = func(pair[0] + "e" + (+pair[1] + precision));
              pair = (toString(value) + "e").split("e");
              return +(pair[0] + "e" + (+pair[1] - precision));
            }
            return func(number);
          };
        }
        var createSet = !(Set2 && 1 / setToArray(new Set2([, -0]))[1] == INFINITY) ? noop : function(values2) {
          return new Set2(values2);
        };
        function createToPairs(keysFunc) {
          return function(object) {
            var tag = getTag(object);
            if (tag == mapTag) {
              return mapToArray(object);
            }
            if (tag == setTag) {
              return setToPairs(object);
            }
            return baseToPairs(object, keysFunc(object));
          };
        }
        function createWrap(func, bitmask, thisArg, partials, holders, argPos, ary2, arity) {
          var isBindKey = bitmask & WRAP_BIND_KEY_FLAG;
          if (!isBindKey && typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          var length = partials ? partials.length : 0;
          if (!length) {
            bitmask &= ~(WRAP_PARTIAL_FLAG | WRAP_PARTIAL_RIGHT_FLAG);
            partials = holders = undefined2;
          }
          ary2 = ary2 === undefined2 ? ary2 : nativeMax(toInteger(ary2), 0);
          arity = arity === undefined2 ? arity : toInteger(arity);
          length -= holders ? holders.length : 0;
          if (bitmask & WRAP_PARTIAL_RIGHT_FLAG) {
            var partialsRight = partials, holdersRight = holders;
            partials = holders = undefined2;
          }
          var data = isBindKey ? undefined2 : getData(func);
          var newData = [
            func,
            bitmask,
            thisArg,
            partials,
            holders,
            partialsRight,
            holdersRight,
            argPos,
            ary2,
            arity
          ];
          if (data) {
            mergeData(newData, data);
          }
          func = newData[0];
          bitmask = newData[1];
          thisArg = newData[2];
          partials = newData[3];
          holders = newData[4];
          arity = newData[9] = newData[9] === undefined2 ? isBindKey ? 0 : func.length : nativeMax(newData[9] - length, 0);
          if (!arity && bitmask & (WRAP_CURRY_FLAG | WRAP_CURRY_RIGHT_FLAG)) {
            bitmask &= ~(WRAP_CURRY_FLAG | WRAP_CURRY_RIGHT_FLAG);
          }
          if (!bitmask || bitmask == WRAP_BIND_FLAG) {
            var result2 = createBind(func, bitmask, thisArg);
          } else if (bitmask == WRAP_CURRY_FLAG || bitmask == WRAP_CURRY_RIGHT_FLAG) {
            result2 = createCurry(func, bitmask, arity);
          } else if ((bitmask == WRAP_PARTIAL_FLAG || bitmask == (WRAP_BIND_FLAG | WRAP_PARTIAL_FLAG)) && !holders.length) {
            result2 = createPartial(func, bitmask, thisArg, partials);
          } else {
            result2 = createHybrid.apply(undefined2, newData);
          }
          var setter = data ? baseSetData : setData;
          return setWrapToString(setter(result2, newData), func, bitmask);
        }
        function customDefaultsAssignIn(objValue, srcValue, key, object) {
          if (objValue === undefined2 || eq(objValue, objectProto[key]) && !hasOwnProperty.call(object, key)) {
            return srcValue;
          }
          return objValue;
        }
        function customDefaultsMerge(objValue, srcValue, key, object, source, stack) {
          if (isObject(objValue) && isObject(srcValue)) {
            stack.set(srcValue, objValue);
            baseMerge(objValue, srcValue, undefined2, customDefaultsMerge, stack);
            stack["delete"](srcValue);
          }
          return objValue;
        }
        function customOmitClone(value) {
          return isPlainObject(value) ? undefined2 : value;
        }
        function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
          var isPartial = bitmask & COMPARE_PARTIAL_FLAG, arrLength = array.length, othLength = other.length;
          if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
            return false;
          }
          var arrStacked = stack.get(array);
          var othStacked = stack.get(other);
          if (arrStacked && othStacked) {
            return arrStacked == other && othStacked == array;
          }
          var index = -1, result2 = true, seen = bitmask & COMPARE_UNORDERED_FLAG ? new SetCache() : undefined2;
          stack.set(array, other);
          stack.set(other, array);
          while (++index < arrLength) {
            var arrValue = array[index], othValue = other[index];
            if (customizer) {
              var compared = isPartial ? customizer(othValue, arrValue, index, other, array, stack) : customizer(arrValue, othValue, index, array, other, stack);
            }
            if (compared !== undefined2) {
              if (compared) {
                continue;
              }
              result2 = false;
              break;
            }
            if (seen) {
              if (!arraySome(other, function(othValue2, othIndex) {
                if (!cacheHas(seen, othIndex) && (arrValue === othValue2 || equalFunc(arrValue, othValue2, bitmask, customizer, stack))) {
                  return seen.push(othIndex);
                }
              })) {
                result2 = false;
                break;
              }
            } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
              result2 = false;
              break;
            }
          }
          stack["delete"](array);
          stack["delete"](other);
          return result2;
        }
        function equalByTag(object, other, tag, bitmask, customizer, equalFunc, stack) {
          switch (tag) {
            case dataViewTag:
              if (object.byteLength != other.byteLength || object.byteOffset != other.byteOffset) {
                return false;
              }
              object = object.buffer;
              other = other.buffer;
            case arrayBufferTag:
              if (object.byteLength != other.byteLength || !equalFunc(new Uint8Array2(object), new Uint8Array2(other))) {
                return false;
              }
              return true;
            case boolTag:
            case dateTag:
            case numberTag:
              return eq(+object, +other);
            case errorTag:
              return object.name == other.name && object.message == other.message;
            case regexpTag:
            case stringTag:
              return object == other + "";
            case mapTag:
              var convert = mapToArray;
            case setTag:
              var isPartial = bitmask & COMPARE_PARTIAL_FLAG;
              convert || (convert = setToArray);
              if (object.size != other.size && !isPartial) {
                return false;
              }
              var stacked = stack.get(object);
              if (stacked) {
                return stacked == other;
              }
              bitmask |= COMPARE_UNORDERED_FLAG;
              stack.set(object, other);
              var result2 = equalArrays(convert(object), convert(other), bitmask, customizer, equalFunc, stack);
              stack["delete"](object);
              return result2;
            case symbolTag:
              if (symbolValueOf) {
                return symbolValueOf.call(object) == symbolValueOf.call(other);
              }
          }
          return false;
        }
        function equalObjects(object, other, bitmask, customizer, equalFunc, stack) {
          var isPartial = bitmask & COMPARE_PARTIAL_FLAG, objProps = getAllKeys(object), objLength = objProps.length, othProps = getAllKeys(other), othLength = othProps.length;
          if (objLength != othLength && !isPartial) {
            return false;
          }
          var index = objLength;
          while (index--) {
            var key = objProps[index];
            if (!(isPartial ? key in other : hasOwnProperty.call(other, key))) {
              return false;
            }
          }
          var objStacked = stack.get(object);
          var othStacked = stack.get(other);
          if (objStacked && othStacked) {
            return objStacked == other && othStacked == object;
          }
          var result2 = true;
          stack.set(object, other);
          stack.set(other, object);
          var skipCtor = isPartial;
          while (++index < objLength) {
            key = objProps[index];
            var objValue = object[key], othValue = other[key];
            if (customizer) {
              var compared = isPartial ? customizer(othValue, objValue, key, other, object, stack) : customizer(objValue, othValue, key, object, other, stack);
            }
            if (!(compared === undefined2 ? objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack) : compared)) {
              result2 = false;
              break;
            }
            skipCtor || (skipCtor = key == "constructor");
          }
          if (result2 && !skipCtor) {
            var objCtor = object.constructor, othCtor = other.constructor;
            if (objCtor != othCtor && ("constructor" in object && "constructor" in other) && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
              result2 = false;
            }
          }
          stack["delete"](object);
          stack["delete"](other);
          return result2;
        }
        function flatRest(func) {
          return setToString(overRest(func, undefined2, flatten), func + "");
        }
        function getAllKeys(object) {
          return baseGetAllKeys(object, keys, getSymbols);
        }
        function getAllKeysIn(object) {
          return baseGetAllKeys(object, keysIn, getSymbolsIn);
        }
        var getData = !metaMap ? noop : function(func) {
          return metaMap.get(func);
        };
        function getFuncName(func) {
          var result2 = func.name + "", array = realNames[result2], length = hasOwnProperty.call(realNames, result2) ? array.length : 0;
          while (length--) {
            var data = array[length], otherFunc = data.func;
            if (otherFunc == null || otherFunc == func) {
              return data.name;
            }
          }
          return result2;
        }
        function getHolder(func) {
          var object = hasOwnProperty.call(lodash, "placeholder") ? lodash : func;
          return object.placeholder;
        }
        function getIteratee() {
          var result2 = lodash.iteratee || iteratee;
          result2 = result2 === iteratee ? baseIteratee : result2;
          return arguments.length ? result2(arguments[0], arguments[1]) : result2;
        }
        function getMapData(map2, key) {
          var data = map2.__data__;
          return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
        }
        function getMatchData(object) {
          var result2 = keys(object), length = result2.length;
          while (length--) {
            var key = result2[length], value = object[key];
            result2[length] = [key, value, isStrictComparable(value)];
          }
          return result2;
        }
        function getNative(object, key) {
          var value = getValue(object, key);
          return baseIsNative(value) ? value : undefined2;
        }
        function getRawTag(value) {
          var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
          try {
            value[symToStringTag] = undefined2;
            var unmasked = true;
          } catch (e) {
          }
          var result2 = nativeObjectToString.call(value);
          if (unmasked) {
            if (isOwn) {
              value[symToStringTag] = tag;
            } else {
              delete value[symToStringTag];
            }
          }
          return result2;
        }
        var getSymbols = !nativeGetSymbols ? stubArray : function(object) {
          if (object == null) {
            return [];
          }
          object = Object2(object);
          return arrayFilter(nativeGetSymbols(object), function(symbol) {
            return propertyIsEnumerable.call(object, symbol);
          });
        };
        var getSymbolsIn = !nativeGetSymbols ? stubArray : function(object) {
          var result2 = [];
          while (object) {
            arrayPush(result2, getSymbols(object));
            object = getPrototype(object);
          }
          return result2;
        };
        var getTag = baseGetTag;
        if (DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag || Map2 && getTag(new Map2()) != mapTag || Promise2 && getTag(Promise2.resolve()) != promiseTag || Set2 && getTag(new Set2()) != setTag || WeakMap && getTag(new WeakMap()) != weakMapTag) {
          getTag = function(value) {
            var result2 = baseGetTag(value), Ctor = result2 == objectTag ? value.constructor : undefined2, ctorString = Ctor ? toSource(Ctor) : "";
            if (ctorString) {
              switch (ctorString) {
                case dataViewCtorString:
                  return dataViewTag;
                case mapCtorString:
                  return mapTag;
                case promiseCtorString:
                  return promiseTag;
                case setCtorString:
                  return setTag;
                case weakMapCtorString:
                  return weakMapTag;
              }
            }
            return result2;
          };
        }
        function getView(start, end, transforms) {
          var index = -1, length = transforms.length;
          while (++index < length) {
            var data = transforms[index], size2 = data.size;
            switch (data.type) {
              case "drop":
                start += size2;
                break;
              case "dropRight":
                end -= size2;
                break;
              case "take":
                end = nativeMin(end, start + size2);
                break;
              case "takeRight":
                start = nativeMax(start, end - size2);
                break;
            }
          }
          return { "start": start, "end": end };
        }
        function getWrapDetails(source) {
          var match = source.match(reWrapDetails);
          return match ? match[1].split(reSplitDetails) : [];
        }
        function hasPath(object, path, hasFunc) {
          path = castPath(path, object);
          var index = -1, length = path.length, result2 = false;
          while (++index < length) {
            var key = toKey(path[index]);
            if (!(result2 = object != null && hasFunc(object, key))) {
              break;
            }
            object = object[key];
          }
          if (result2 || ++index != length) {
            return result2;
          }
          length = object == null ? 0 : object.length;
          return !!length && isLength(length) && isIndex(key, length) && (isArray(object) || isArguments(object));
        }
        function initCloneArray(array) {
          var length = array.length, result2 = new array.constructor(length);
          if (length && typeof array[0] == "string" && hasOwnProperty.call(array, "index")) {
            result2.index = array.index;
            result2.input = array.input;
          }
          return result2;
        }
        function initCloneObject(object) {
          return typeof object.constructor == "function" && !isPrototype(object) ? baseCreate(getPrototype(object)) : {};
        }
        function initCloneByTag(object, tag, isDeep) {
          var Ctor = object.constructor;
          switch (tag) {
            case arrayBufferTag:
              return cloneArrayBuffer(object);
            case boolTag:
            case dateTag:
              return new Ctor(+object);
            case dataViewTag:
              return cloneDataView(object, isDeep);
            case float32Tag:
            case float64Tag:
            case int8Tag:
            case int16Tag:
            case int32Tag:
            case uint8Tag:
            case uint8ClampedTag:
            case uint16Tag:
            case uint32Tag:
              return cloneTypedArray(object, isDeep);
            case mapTag:
              return new Ctor();
            case numberTag:
            case stringTag:
              return new Ctor(object);
            case regexpTag:
              return cloneRegExp(object);
            case setTag:
              return new Ctor();
            case symbolTag:
              return cloneSymbol(object);
          }
        }
        function insertWrapDetails(source, details) {
          var length = details.length;
          if (!length) {
            return source;
          }
          var lastIndex = length - 1;
          details[lastIndex] = (length > 1 ? "& " : "") + details[lastIndex];
          details = details.join(length > 2 ? ", " : " ");
          return source.replace(reWrapComment, "{\n/* [wrapped with " + details + "] */\n");
        }
        function isFlattenable(value) {
          return isArray(value) || isArguments(value) || !!(spreadableSymbol && value && value[spreadableSymbol]);
        }
        function isIndex(value, length) {
          var type = typeof value;
          length = length == null ? MAX_SAFE_INTEGER : length;
          return !!length && (type == "number" || type != "symbol" && reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
        }
        function isIterateeCall(value, index, object) {
          if (!isObject(object)) {
            return false;
          }
          var type = typeof index;
          if (type == "number" ? isArrayLike(object) && isIndex(index, object.length) : type == "string" && index in object) {
            return eq(object[index], value);
          }
          return false;
        }
        function isKey(value, object) {
          if (isArray(value)) {
            return false;
          }
          var type = typeof value;
          if (type == "number" || type == "symbol" || type == "boolean" || value == null || isSymbol(value)) {
            return true;
          }
          return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object != null && value in Object2(object);
        }
        function isKeyable(value) {
          var type = typeof value;
          return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
        }
        function isLaziable(func) {
          var funcName = getFuncName(func), other = lodash[funcName];
          if (typeof other != "function" || !(funcName in LazyWrapper.prototype)) {
            return false;
          }
          if (func === other) {
            return true;
          }
          var data = getData(other);
          return !!data && func === data[0];
        }
        function isMasked(func) {
          return !!maskSrcKey && maskSrcKey in func;
        }
        var isMaskable = coreJsData ? isFunction : stubFalse;
        function isPrototype(value) {
          var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
          return value === proto;
        }
        function isStrictComparable(value) {
          return value === value && !isObject(value);
        }
        function matchesStrictComparable(key, srcValue) {
          return function(object) {
            if (object == null) {
              return false;
            }
            return object[key] === srcValue && (srcValue !== undefined2 || key in Object2(object));
          };
        }
        function memoizeCapped(func) {
          var result2 = memoize(func, function(key) {
            if (cache.size === MAX_MEMOIZE_SIZE) {
              cache.clear();
            }
            return key;
          });
          var cache = result2.cache;
          return result2;
        }
        function mergeData(data, source) {
          var bitmask = data[1], srcBitmask = source[1], newBitmask = bitmask | srcBitmask, isCommon = newBitmask < (WRAP_BIND_FLAG | WRAP_BIND_KEY_FLAG | WRAP_ARY_FLAG);
          var isCombo = srcBitmask == WRAP_ARY_FLAG && bitmask == WRAP_CURRY_FLAG || srcBitmask == WRAP_ARY_FLAG && bitmask == WRAP_REARG_FLAG && data[7].length <= source[8] || srcBitmask == (WRAP_ARY_FLAG | WRAP_REARG_FLAG) && source[7].length <= source[8] && bitmask == WRAP_CURRY_FLAG;
          if (!(isCommon || isCombo)) {
            return data;
          }
          if (srcBitmask & WRAP_BIND_FLAG) {
            data[2] = source[2];
            newBitmask |= bitmask & WRAP_BIND_FLAG ? 0 : WRAP_CURRY_BOUND_FLAG;
          }
          var value = source[3];
          if (value) {
            var partials = data[3];
            data[3] = partials ? composeArgs(partials, value, source[4]) : value;
            data[4] = partials ? replaceHolders(data[3], PLACEHOLDER) : source[4];
          }
          value = source[5];
          if (value) {
            partials = data[5];
            data[5] = partials ? composeArgsRight(partials, value, source[6]) : value;
            data[6] = partials ? replaceHolders(data[5], PLACEHOLDER) : source[6];
          }
          value = source[7];
          if (value) {
            data[7] = value;
          }
          if (srcBitmask & WRAP_ARY_FLAG) {
            data[8] = data[8] == null ? source[8] : nativeMin(data[8], source[8]);
          }
          if (data[9] == null) {
            data[9] = source[9];
          }
          data[0] = source[0];
          data[1] = newBitmask;
          return data;
        }
        function nativeKeysIn(object) {
          var result2 = [];
          if (object != null) {
            for (var key in Object2(object)) {
              result2.push(key);
            }
          }
          return result2;
        }
        function objectToString(value) {
          return nativeObjectToString.call(value);
        }
        function overRest(func, start, transform2) {
          start = nativeMax(start === undefined2 ? func.length - 1 : start, 0);
          return function() {
            var args = arguments, index = -1, length = nativeMax(args.length - start, 0), array = Array2(length);
            while (++index < length) {
              array[index] = args[start + index];
            }
            index = -1;
            var otherArgs = Array2(start + 1);
            while (++index < start) {
              otherArgs[index] = args[index];
            }
            otherArgs[start] = transform2(array);
            return apply(func, this, otherArgs);
          };
        }
        function parent(object, path) {
          return path.length < 2 ? object : baseGet(object, baseSlice(path, 0, -1));
        }
        function reorder(array, indexes) {
          var arrLength = array.length, length = nativeMin(indexes.length, arrLength), oldArray = copyArray(array);
          while (length--) {
            var index = indexes[length];
            array[length] = isIndex(index, arrLength) ? oldArray[index] : undefined2;
          }
          return array;
        }
        function safeGet(object, key) {
          if (key === "constructor" && typeof object[key] === "function") {
            return;
          }
          if (key == "__proto__") {
            return;
          }
          return object[key];
        }
        var setData = shortOut(baseSetData);
        var setTimeout2 = ctxSetTimeout || function(func, wait) {
          return root.setTimeout(func, wait);
        };
        var setToString = shortOut(baseSetToString);
        function setWrapToString(wrapper, reference, bitmask) {
          var source = reference + "";
          return setToString(wrapper, insertWrapDetails(source, updateWrapDetails(getWrapDetails(source), bitmask)));
        }
        function shortOut(func) {
          var count = 0, lastCalled = 0;
          return function() {
            var stamp = nativeNow(), remaining = HOT_SPAN - (stamp - lastCalled);
            lastCalled = stamp;
            if (remaining > 0) {
              if (++count >= HOT_COUNT) {
                return arguments[0];
              }
            } else {
              count = 0;
            }
            return func.apply(undefined2, arguments);
          };
        }
        function shuffleSelf(array, size2) {
          var index = -1, length = array.length, lastIndex = length - 1;
          size2 = size2 === undefined2 ? length : size2;
          while (++index < size2) {
            var rand = baseRandom(index, lastIndex), value = array[rand];
            array[rand] = array[index];
            array[index] = value;
          }
          array.length = size2;
          return array;
        }
        var stringToPath = memoizeCapped(function(string) {
          var result2 = [];
          if (string.charCodeAt(0) === 46) {
            result2.push("");
          }
          string.replace(rePropName, function(match, number, quote, subString) {
            result2.push(quote ? subString.replace(reEscapeChar, "$1") : number || match);
          });
          return result2;
        });
        function toKey(value) {
          if (typeof value == "string" || isSymbol(value)) {
            return value;
          }
          var result2 = value + "";
          return result2 == "0" && 1 / value == -INFINITY ? "-0" : result2;
        }
        function toSource(func) {
          if (func != null) {
            try {
              return funcToString.call(func);
            } catch (e) {
            }
            try {
              return func + "";
            } catch (e) {
            }
          }
          return "";
        }
        function updateWrapDetails(details, bitmask) {
          arrayEach(wrapFlags, function(pair) {
            var value = "_." + pair[0];
            if (bitmask & pair[1] && !arrayIncludes(details, value)) {
              details.push(value);
            }
          });
          return details.sort();
        }
        function wrapperClone(wrapper) {
          if (wrapper instanceof LazyWrapper) {
            return wrapper.clone();
          }
          var result2 = new LodashWrapper(wrapper.__wrapped__, wrapper.__chain__);
          result2.__actions__ = copyArray(wrapper.__actions__);
          result2.__index__ = wrapper.__index__;
          result2.__values__ = wrapper.__values__;
          return result2;
        }
        function chunk(array, size2, guard) {
          if (guard ? isIterateeCall(array, size2, guard) : size2 === undefined2) {
            size2 = 1;
          } else {
            size2 = nativeMax(toInteger(size2), 0);
          }
          var length = array == null ? 0 : array.length;
          if (!length || size2 < 1) {
            return [];
          }
          var index = 0, resIndex = 0, result2 = Array2(nativeCeil(length / size2));
          while (index < length) {
            result2[resIndex++] = baseSlice(array, index, index += size2);
          }
          return result2;
        }
        function compact(array) {
          var index = -1, length = array == null ? 0 : array.length, resIndex = 0, result2 = [];
          while (++index < length) {
            var value = array[index];
            if (value) {
              result2[resIndex++] = value;
            }
          }
          return result2;
        }
        function concat() {
          var length = arguments.length;
          if (!length) {
            return [];
          }
          var args = Array2(length - 1), array = arguments[0], index = length;
          while (index--) {
            args[index - 1] = arguments[index];
          }
          return arrayPush(isArray(array) ? copyArray(array) : [array], baseFlatten(args, 1));
        }
        var difference = baseRest(function(array, values2) {
          return isArrayLikeObject(array) ? baseDifference(array, baseFlatten(values2, 1, isArrayLikeObject, true)) : [];
        });
        var differenceBy = baseRest(function(array, values2) {
          var iteratee2 = last(values2);
          if (isArrayLikeObject(iteratee2)) {
            iteratee2 = undefined2;
          }
          return isArrayLikeObject(array) ? baseDifference(array, baseFlatten(values2, 1, isArrayLikeObject, true), getIteratee(iteratee2, 2)) : [];
        });
        var differenceWith = baseRest(function(array, values2) {
          var comparator = last(values2);
          if (isArrayLikeObject(comparator)) {
            comparator = undefined2;
          }
          return isArrayLikeObject(array) ? baseDifference(array, baseFlatten(values2, 1, isArrayLikeObject, true), undefined2, comparator) : [];
        });
        function drop(array, n, guard) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return [];
          }
          n = guard || n === undefined2 ? 1 : toInteger(n);
          return baseSlice(array, n < 0 ? 0 : n, length);
        }
        function dropRight(array, n, guard) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return [];
          }
          n = guard || n === undefined2 ? 1 : toInteger(n);
          n = length - n;
          return baseSlice(array, 0, n < 0 ? 0 : n);
        }
        function dropRightWhile(array, predicate) {
          return array && array.length ? baseWhile(array, getIteratee(predicate, 3), true, true) : [];
        }
        function dropWhile(array, predicate) {
          return array && array.length ? baseWhile(array, getIteratee(predicate, 3), true) : [];
        }
        function fill(array, value, start, end) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return [];
          }
          if (start && typeof start != "number" && isIterateeCall(array, value, start)) {
            start = 0;
            end = length;
          }
          return baseFill(array, value, start, end);
        }
        function findIndex(array, predicate, fromIndex) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return -1;
          }
          var index = fromIndex == null ? 0 : toInteger(fromIndex);
          if (index < 0) {
            index = nativeMax(length + index, 0);
          }
          return baseFindIndex(array, getIteratee(predicate, 3), index);
        }
        function findLastIndex(array, predicate, fromIndex) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return -1;
          }
          var index = length - 1;
          if (fromIndex !== undefined2) {
            index = toInteger(fromIndex);
            index = fromIndex < 0 ? nativeMax(length + index, 0) : nativeMin(index, length - 1);
          }
          return baseFindIndex(array, getIteratee(predicate, 3), index, true);
        }
        function flatten(array) {
          var length = array == null ? 0 : array.length;
          return length ? baseFlatten(array, 1) : [];
        }
        function flattenDeep(array) {
          var length = array == null ? 0 : array.length;
          return length ? baseFlatten(array, INFINITY) : [];
        }
        function flattenDepth(array, depth) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return [];
          }
          depth = depth === undefined2 ? 1 : toInteger(depth);
          return baseFlatten(array, depth);
        }
        function fromPairs(pairs) {
          var index = -1, length = pairs == null ? 0 : pairs.length, result2 = {};
          while (++index < length) {
            var pair = pairs[index];
            result2[pair[0]] = pair[1];
          }
          return result2;
        }
        function head(array) {
          return array && array.length ? array[0] : undefined2;
        }
        function indexOf(array, value, fromIndex) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return -1;
          }
          var index = fromIndex == null ? 0 : toInteger(fromIndex);
          if (index < 0) {
            index = nativeMax(length + index, 0);
          }
          return baseIndexOf(array, value, index);
        }
        function initial(array) {
          var length = array == null ? 0 : array.length;
          return length ? baseSlice(array, 0, -1) : [];
        }
        var intersection = baseRest(function(arrays) {
          var mapped = arrayMap(arrays, castArrayLikeObject);
          return mapped.length && mapped[0] === arrays[0] ? baseIntersection(mapped) : [];
        });
        var intersectionBy = baseRest(function(arrays) {
          var iteratee2 = last(arrays), mapped = arrayMap(arrays, castArrayLikeObject);
          if (iteratee2 === last(mapped)) {
            iteratee2 = undefined2;
          } else {
            mapped.pop();
          }
          return mapped.length && mapped[0] === arrays[0] ? baseIntersection(mapped, getIteratee(iteratee2, 2)) : [];
        });
        var intersectionWith = baseRest(function(arrays) {
          var comparator = last(arrays), mapped = arrayMap(arrays, castArrayLikeObject);
          comparator = typeof comparator == "function" ? comparator : undefined2;
          if (comparator) {
            mapped.pop();
          }
          return mapped.length && mapped[0] === arrays[0] ? baseIntersection(mapped, undefined2, comparator) : [];
        });
        function join(array, separator) {
          return array == null ? "" : nativeJoin.call(array, separator);
        }
        function last(array) {
          var length = array == null ? 0 : array.length;
          return length ? array[length - 1] : undefined2;
        }
        function lastIndexOf(array, value, fromIndex) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return -1;
          }
          var index = length;
          if (fromIndex !== undefined2) {
            index = toInteger(fromIndex);
            index = index < 0 ? nativeMax(length + index, 0) : nativeMin(index, length - 1);
          }
          return value === value ? strictLastIndexOf(array, value, index) : baseFindIndex(array, baseIsNaN, index, true);
        }
        function nth(array, n) {
          return array && array.length ? baseNth(array, toInteger(n)) : undefined2;
        }
        var pull = baseRest(pullAll);
        function pullAll(array, values2) {
          return array && array.length && values2 && values2.length ? basePullAll(array, values2) : array;
        }
        function pullAllBy(array, values2, iteratee2) {
          return array && array.length && values2 && values2.length ? basePullAll(array, values2, getIteratee(iteratee2, 2)) : array;
        }
        function pullAllWith(array, values2, comparator) {
          return array && array.length && values2 && values2.length ? basePullAll(array, values2, undefined2, comparator) : array;
        }
        var pullAt = flatRest(function(array, indexes) {
          var length = array == null ? 0 : array.length, result2 = baseAt(array, indexes);
          basePullAt(array, arrayMap(indexes, function(index) {
            return isIndex(index, length) ? +index : index;
          }).sort(compareAscending));
          return result2;
        });
        function remove(array, predicate) {
          var result2 = [];
          if (!(array && array.length)) {
            return result2;
          }
          var index = -1, indexes = [], length = array.length;
          predicate = getIteratee(predicate, 3);
          while (++index < length) {
            var value = array[index];
            if (predicate(value, index, array)) {
              result2.push(value);
              indexes.push(index);
            }
          }
          basePullAt(array, indexes);
          return result2;
        }
        function reverse(array) {
          return array == null ? array : nativeReverse.call(array);
        }
        function slice(array, start, end) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return [];
          }
          if (end && typeof end != "number" && isIterateeCall(array, start, end)) {
            start = 0;
            end = length;
          } else {
            start = start == null ? 0 : toInteger(start);
            end = end === undefined2 ? length : toInteger(end);
          }
          return baseSlice(array, start, end);
        }
        function sortedIndex(array, value) {
          return baseSortedIndex(array, value);
        }
        function sortedIndexBy(array, value, iteratee2) {
          return baseSortedIndexBy(array, value, getIteratee(iteratee2, 2));
        }
        function sortedIndexOf(array, value) {
          var length = array == null ? 0 : array.length;
          if (length) {
            var index = baseSortedIndex(array, value);
            if (index < length && eq(array[index], value)) {
              return index;
            }
          }
          return -1;
        }
        function sortedLastIndex(array, value) {
          return baseSortedIndex(array, value, true);
        }
        function sortedLastIndexBy(array, value, iteratee2) {
          return baseSortedIndexBy(array, value, getIteratee(iteratee2, 2), true);
        }
        function sortedLastIndexOf(array, value) {
          var length = array == null ? 0 : array.length;
          if (length) {
            var index = baseSortedIndex(array, value, true) - 1;
            if (eq(array[index], value)) {
              return index;
            }
          }
          return -1;
        }
        function sortedUniq(array) {
          return array && array.length ? baseSortedUniq(array) : [];
        }
        function sortedUniqBy(array, iteratee2) {
          return array && array.length ? baseSortedUniq(array, getIteratee(iteratee2, 2)) : [];
        }
        function tail(array) {
          var length = array == null ? 0 : array.length;
          return length ? baseSlice(array, 1, length) : [];
        }
        function take(array, n, guard) {
          if (!(array && array.length)) {
            return [];
          }
          n = guard || n === undefined2 ? 1 : toInteger(n);
          return baseSlice(array, 0, n < 0 ? 0 : n);
        }
        function takeRight(array, n, guard) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return [];
          }
          n = guard || n === undefined2 ? 1 : toInteger(n);
          n = length - n;
          return baseSlice(array, n < 0 ? 0 : n, length);
        }
        function takeRightWhile(array, predicate) {
          return array && array.length ? baseWhile(array, getIteratee(predicate, 3), false, true) : [];
        }
        function takeWhile(array, predicate) {
          return array && array.length ? baseWhile(array, getIteratee(predicate, 3)) : [];
        }
        var union = baseRest(function(arrays) {
          return baseUniq(baseFlatten(arrays, 1, isArrayLikeObject, true));
        });
        var unionBy = baseRest(function(arrays) {
          var iteratee2 = last(arrays);
          if (isArrayLikeObject(iteratee2)) {
            iteratee2 = undefined2;
          }
          return baseUniq(baseFlatten(arrays, 1, isArrayLikeObject, true), getIteratee(iteratee2, 2));
        });
        var unionWith = baseRest(function(arrays) {
          var comparator = last(arrays);
          comparator = typeof comparator == "function" ? comparator : undefined2;
          return baseUniq(baseFlatten(arrays, 1, isArrayLikeObject, true), undefined2, comparator);
        });
        function uniq(array) {
          return array && array.length ? baseUniq(array) : [];
        }
        function uniqBy(array, iteratee2) {
          return array && array.length ? baseUniq(array, getIteratee(iteratee2, 2)) : [];
        }
        function uniqWith(array, comparator) {
          comparator = typeof comparator == "function" ? comparator : undefined2;
          return array && array.length ? baseUniq(array, undefined2, comparator) : [];
        }
        function unzip(array) {
          if (!(array && array.length)) {
            return [];
          }
          var length = 0;
          array = arrayFilter(array, function(group) {
            if (isArrayLikeObject(group)) {
              length = nativeMax(group.length, length);
              return true;
            }
          });
          return baseTimes(length, function(index) {
            return arrayMap(array, baseProperty(index));
          });
        }
        function unzipWith(array, iteratee2) {
          if (!(array && array.length)) {
            return [];
          }
          var result2 = unzip(array);
          if (iteratee2 == null) {
            return result2;
          }
          return arrayMap(result2, function(group) {
            return apply(iteratee2, undefined2, group);
          });
        }
        var without = baseRest(function(array, values2) {
          return isArrayLikeObject(array) ? baseDifference(array, values2) : [];
        });
        var xor = baseRest(function(arrays) {
          return baseXor(arrayFilter(arrays, isArrayLikeObject));
        });
        var xorBy = baseRest(function(arrays) {
          var iteratee2 = last(arrays);
          if (isArrayLikeObject(iteratee2)) {
            iteratee2 = undefined2;
          }
          return baseXor(arrayFilter(arrays, isArrayLikeObject), getIteratee(iteratee2, 2));
        });
        var xorWith = baseRest(function(arrays) {
          var comparator = last(arrays);
          comparator = typeof comparator == "function" ? comparator : undefined2;
          return baseXor(arrayFilter(arrays, isArrayLikeObject), undefined2, comparator);
        });
        var zip = baseRest(unzip);
        function zipObject(props, values2) {
          return baseZipObject(props || [], values2 || [], assignValue);
        }
        function zipObjectDeep(props, values2) {
          return baseZipObject(props || [], values2 || [], baseSet);
        }
        var zipWith = baseRest(function(arrays) {
          var length = arrays.length, iteratee2 = length > 1 ? arrays[length - 1] : undefined2;
          iteratee2 = typeof iteratee2 == "function" ? (arrays.pop(), iteratee2) : undefined2;
          return unzipWith(arrays, iteratee2);
        });
        function chain(value) {
          var result2 = lodash(value);
          result2.__chain__ = true;
          return result2;
        }
        function tap(value, interceptor) {
          interceptor(value);
          return value;
        }
        function thru(value, interceptor) {
          return interceptor(value);
        }
        var wrapperAt = flatRest(function(paths) {
          var length = paths.length, start = length ? paths[0] : 0, value = this.__wrapped__, interceptor = function(object) {
            return baseAt(object, paths);
          };
          if (length > 1 || this.__actions__.length || !(value instanceof LazyWrapper) || !isIndex(start)) {
            return this.thru(interceptor);
          }
          value = value.slice(start, +start + (length ? 1 : 0));
          value.__actions__.push({
            "func": thru,
            "args": [interceptor],
            "thisArg": undefined2
          });
          return new LodashWrapper(value, this.__chain__).thru(function(array) {
            if (length && !array.length) {
              array.push(undefined2);
            }
            return array;
          });
        });
        function wrapperChain() {
          return chain(this);
        }
        function wrapperCommit() {
          return new LodashWrapper(this.value(), this.__chain__);
        }
        function wrapperNext() {
          if (this.__values__ === undefined2) {
            this.__values__ = toArray(this.value());
          }
          var done = this.__index__ >= this.__values__.length, value = done ? undefined2 : this.__values__[this.__index__++];
          return { "done": done, "value": value };
        }
        function wrapperToIterator() {
          return this;
        }
        function wrapperPlant(value) {
          var result2, parent2 = this;
          while (parent2 instanceof baseLodash) {
            var clone2 = wrapperClone(parent2);
            clone2.__index__ = 0;
            clone2.__values__ = undefined2;
            if (result2) {
              previous.__wrapped__ = clone2;
            } else {
              result2 = clone2;
            }
            var previous = clone2;
            parent2 = parent2.__wrapped__;
          }
          previous.__wrapped__ = value;
          return result2;
        }
        function wrapperReverse() {
          var value = this.__wrapped__;
          if (value instanceof LazyWrapper) {
            var wrapped = value;
            if (this.__actions__.length) {
              wrapped = new LazyWrapper(this);
            }
            wrapped = wrapped.reverse();
            wrapped.__actions__.push({
              "func": thru,
              "args": [reverse],
              "thisArg": undefined2
            });
            return new LodashWrapper(wrapped, this.__chain__);
          }
          return this.thru(reverse);
        }
        function wrapperValue() {
          return baseWrapperValue(this.__wrapped__, this.__actions__);
        }
        var countBy = createAggregator(function(result2, value, key) {
          if (hasOwnProperty.call(result2, key)) {
            ++result2[key];
          } else {
            baseAssignValue(result2, key, 1);
          }
        });
        function every(collection, predicate, guard) {
          var func = isArray(collection) ? arrayEvery : baseEvery;
          if (guard && isIterateeCall(collection, predicate, guard)) {
            predicate = undefined2;
          }
          return func(collection, getIteratee(predicate, 3));
        }
        function filter(collection, predicate) {
          var func = isArray(collection) ? arrayFilter : baseFilter;
          return func(collection, getIteratee(predicate, 3));
        }
        var find = createFind(findIndex);
        var findLast = createFind(findLastIndex);
        function flatMap(collection, iteratee2) {
          return baseFlatten(map(collection, iteratee2), 1);
        }
        function flatMapDeep(collection, iteratee2) {
          return baseFlatten(map(collection, iteratee2), INFINITY);
        }
        function flatMapDepth(collection, iteratee2, depth) {
          depth = depth === undefined2 ? 1 : toInteger(depth);
          return baseFlatten(map(collection, iteratee2), depth);
        }
        function forEach(collection, iteratee2) {
          var func = isArray(collection) ? arrayEach : baseEach;
          return func(collection, getIteratee(iteratee2, 3));
        }
        function forEachRight(collection, iteratee2) {
          var func = isArray(collection) ? arrayEachRight : baseEachRight;
          return func(collection, getIteratee(iteratee2, 3));
        }
        var groupBy = createAggregator(function(result2, value, key) {
          if (hasOwnProperty.call(result2, key)) {
            result2[key].push(value);
          } else {
            baseAssignValue(result2, key, [value]);
          }
        });
        function includes(collection, value, fromIndex, guard) {
          collection = isArrayLike(collection) ? collection : values(collection);
          fromIndex = fromIndex && !guard ? toInteger(fromIndex) : 0;
          var length = collection.length;
          if (fromIndex < 0) {
            fromIndex = nativeMax(length + fromIndex, 0);
          }
          return isString(collection) ? fromIndex <= length && collection.indexOf(value, fromIndex) > -1 : !!length && baseIndexOf(collection, value, fromIndex) > -1;
        }
        var invokeMap = baseRest(function(collection, path, args) {
          var index = -1, isFunc = typeof path == "function", result2 = isArrayLike(collection) ? Array2(collection.length) : [];
          baseEach(collection, function(value) {
            result2[++index] = isFunc ? apply(path, value, args) : baseInvoke(value, path, args);
          });
          return result2;
        });
        var keyBy = createAggregator(function(result2, value, key) {
          baseAssignValue(result2, key, value);
        });
        function map(collection, iteratee2) {
          var func = isArray(collection) ? arrayMap : baseMap;
          return func(collection, getIteratee(iteratee2, 3));
        }
        function orderBy(collection, iteratees, orders, guard) {
          if (collection == null) {
            return [];
          }
          if (!isArray(iteratees)) {
            iteratees = iteratees == null ? [] : [iteratees];
          }
          orders = guard ? undefined2 : orders;
          if (!isArray(orders)) {
            orders = orders == null ? [] : [orders];
          }
          return baseOrderBy(collection, iteratees, orders);
        }
        var partition = createAggregator(function(result2, value, key) {
          result2[key ? 0 : 1].push(value);
        }, function() {
          return [[], []];
        });
        function reduce(collection, iteratee2, accumulator) {
          var func = isArray(collection) ? arrayReduce : baseReduce, initAccum = arguments.length < 3;
          return func(collection, getIteratee(iteratee2, 4), accumulator, initAccum, baseEach);
        }
        function reduceRight(collection, iteratee2, accumulator) {
          var func = isArray(collection) ? arrayReduceRight : baseReduce, initAccum = arguments.length < 3;
          return func(collection, getIteratee(iteratee2, 4), accumulator, initAccum, baseEachRight);
        }
        function reject(collection, predicate) {
          var func = isArray(collection) ? arrayFilter : baseFilter;
          return func(collection, negate(getIteratee(predicate, 3)));
        }
        function sample(collection) {
          var func = isArray(collection) ? arraySample : baseSample;
          return func(collection);
        }
        function sampleSize(collection, n, guard) {
          if (guard ? isIterateeCall(collection, n, guard) : n === undefined2) {
            n = 1;
          } else {
            n = toInteger(n);
          }
          var func = isArray(collection) ? arraySampleSize : baseSampleSize;
          return func(collection, n);
        }
        function shuffle(collection) {
          var func = isArray(collection) ? arrayShuffle : baseShuffle;
          return func(collection);
        }
        function size(collection) {
          if (collection == null) {
            return 0;
          }
          if (isArrayLike(collection)) {
            return isString(collection) ? stringSize(collection) : collection.length;
          }
          var tag = getTag(collection);
          if (tag == mapTag || tag == setTag) {
            return collection.size;
          }
          return baseKeys(collection).length;
        }
        function some(collection, predicate, guard) {
          var func = isArray(collection) ? arraySome : baseSome;
          if (guard && isIterateeCall(collection, predicate, guard)) {
            predicate = undefined2;
          }
          return func(collection, getIteratee(predicate, 3));
        }
        var sortBy = baseRest(function(collection, iteratees) {
          if (collection == null) {
            return [];
          }
          var length = iteratees.length;
          if (length > 1 && isIterateeCall(collection, iteratees[0], iteratees[1])) {
            iteratees = [];
          } else if (length > 2 && isIterateeCall(iteratees[0], iteratees[1], iteratees[2])) {
            iteratees = [iteratees[0]];
          }
          return baseOrderBy(collection, baseFlatten(iteratees, 1), []);
        });
        var now = ctxNow || function() {
          return root.Date.now();
        };
        function after(n, func) {
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          n = toInteger(n);
          return function() {
            if (--n < 1) {
              return func.apply(this, arguments);
            }
          };
        }
        function ary(func, n, guard) {
          n = guard ? undefined2 : n;
          n = func && n == null ? func.length : n;
          return createWrap(func, WRAP_ARY_FLAG, undefined2, undefined2, undefined2, undefined2, n);
        }
        function before(n, func) {
          var result2;
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          n = toInteger(n);
          return function() {
            if (--n > 0) {
              result2 = func.apply(this, arguments);
            }
            if (n <= 1) {
              func = undefined2;
            }
            return result2;
          };
        }
        var bind = baseRest(function(func, thisArg, partials) {
          var bitmask = WRAP_BIND_FLAG;
          if (partials.length) {
            var holders = replaceHolders(partials, getHolder(bind));
            bitmask |= WRAP_PARTIAL_FLAG;
          }
          return createWrap(func, bitmask, thisArg, partials, holders);
        });
        var bindKey = baseRest(function(object, key, partials) {
          var bitmask = WRAP_BIND_FLAG | WRAP_BIND_KEY_FLAG;
          if (partials.length) {
            var holders = replaceHolders(partials, getHolder(bindKey));
            bitmask |= WRAP_PARTIAL_FLAG;
          }
          return createWrap(key, bitmask, object, partials, holders);
        });
        function curry(func, arity, guard) {
          arity = guard ? undefined2 : arity;
          var result2 = createWrap(func, WRAP_CURRY_FLAG, undefined2, undefined2, undefined2, undefined2, undefined2, arity);
          result2.placeholder = curry.placeholder;
          return result2;
        }
        function curryRight(func, arity, guard) {
          arity = guard ? undefined2 : arity;
          var result2 = createWrap(func, WRAP_CURRY_RIGHT_FLAG, undefined2, undefined2, undefined2, undefined2, undefined2, arity);
          result2.placeholder = curryRight.placeholder;
          return result2;
        }
        function debounce(func, wait, options) {
          var lastArgs, lastThis, maxWait, result2, timerId, lastCallTime, lastInvokeTime = 0, leading = false, maxing = false, trailing = true;
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          wait = toNumber(wait) || 0;
          if (isObject(options)) {
            leading = !!options.leading;
            maxing = "maxWait" in options;
            maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
            trailing = "trailing" in options ? !!options.trailing : trailing;
          }
          function invokeFunc(time) {
            var args = lastArgs, thisArg = lastThis;
            lastArgs = lastThis = undefined2;
            lastInvokeTime = time;
            result2 = func.apply(thisArg, args);
            return result2;
          }
          function leadingEdge(time) {
            lastInvokeTime = time;
            timerId = setTimeout2(timerExpired, wait);
            return leading ? invokeFunc(time) : result2;
          }
          function remainingWait(time) {
            var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime, timeWaiting = wait - timeSinceLastCall;
            return maxing ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke) : timeWaiting;
          }
          function shouldInvoke(time) {
            var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime;
            return lastCallTime === undefined2 || timeSinceLastCall >= wait || timeSinceLastCall < 0 || maxing && timeSinceLastInvoke >= maxWait;
          }
          function timerExpired() {
            var time = now();
            if (shouldInvoke(time)) {
              return trailingEdge(time);
            }
            timerId = setTimeout2(timerExpired, remainingWait(time));
          }
          function trailingEdge(time) {
            timerId = undefined2;
            if (trailing && lastArgs) {
              return invokeFunc(time);
            }
            lastArgs = lastThis = undefined2;
            return result2;
          }
          function cancel() {
            if (timerId !== undefined2) {
              clearTimeout(timerId);
            }
            lastInvokeTime = 0;
            lastArgs = lastCallTime = lastThis = timerId = undefined2;
          }
          function flush() {
            return timerId === undefined2 ? result2 : trailingEdge(now());
          }
          function debounced() {
            var time = now(), isInvoking = shouldInvoke(time);
            lastArgs = arguments;
            lastThis = this;
            lastCallTime = time;
            if (isInvoking) {
              if (timerId === undefined2) {
                return leadingEdge(lastCallTime);
              }
              if (maxing) {
                clearTimeout(timerId);
                timerId = setTimeout2(timerExpired, wait);
                return invokeFunc(lastCallTime);
              }
            }
            if (timerId === undefined2) {
              timerId = setTimeout2(timerExpired, wait);
            }
            return result2;
          }
          debounced.cancel = cancel;
          debounced.flush = flush;
          return debounced;
        }
        var defer = baseRest(function(func, args) {
          return baseDelay(func, 1, args);
        });
        var delay = baseRest(function(func, wait, args) {
          return baseDelay(func, toNumber(wait) || 0, args);
        });
        function flip(func) {
          return createWrap(func, WRAP_FLIP_FLAG);
        }
        function memoize(func, resolver) {
          if (typeof func != "function" || resolver != null && typeof resolver != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          var memoized = function() {
            var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache = memoized.cache;
            if (cache.has(key)) {
              return cache.get(key);
            }
            var result2 = func.apply(this, args);
            memoized.cache = cache.set(key, result2) || cache;
            return result2;
          };
          memoized.cache = new (memoize.Cache || MapCache)();
          return memoized;
        }
        memoize.Cache = MapCache;
        function negate(predicate) {
          if (typeof predicate != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          return function() {
            var args = arguments;
            switch (args.length) {
              case 0:
                return !predicate.call(this);
              case 1:
                return !predicate.call(this, args[0]);
              case 2:
                return !predicate.call(this, args[0], args[1]);
              case 3:
                return !predicate.call(this, args[0], args[1], args[2]);
            }
            return !predicate.apply(this, args);
          };
        }
        function once(func) {
          return before(2, func);
        }
        var overArgs = castRest(function(func, transforms) {
          transforms = transforms.length == 1 && isArray(transforms[0]) ? arrayMap(transforms[0], baseUnary(getIteratee())) : arrayMap(baseFlatten(transforms, 1), baseUnary(getIteratee()));
          var funcsLength = transforms.length;
          return baseRest(function(args) {
            var index = -1, length = nativeMin(args.length, funcsLength);
            while (++index < length) {
              args[index] = transforms[index].call(this, args[index]);
            }
            return apply(func, this, args);
          });
        });
        var partial = baseRest(function(func, partials) {
          var holders = replaceHolders(partials, getHolder(partial));
          return createWrap(func, WRAP_PARTIAL_FLAG, undefined2, partials, holders);
        });
        var partialRight = baseRest(function(func, partials) {
          var holders = replaceHolders(partials, getHolder(partialRight));
          return createWrap(func, WRAP_PARTIAL_RIGHT_FLAG, undefined2, partials, holders);
        });
        var rearg = flatRest(function(func, indexes) {
          return createWrap(func, WRAP_REARG_FLAG, undefined2, undefined2, undefined2, indexes);
        });
        function rest(func, start) {
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          start = start === undefined2 ? start : toInteger(start);
          return baseRest(func, start);
        }
        function spread(func, start) {
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          start = start == null ? 0 : nativeMax(toInteger(start), 0);
          return baseRest(function(args) {
            var array = args[start], otherArgs = castSlice(args, 0, start);
            if (array) {
              arrayPush(otherArgs, array);
            }
            return apply(func, this, otherArgs);
          });
        }
        function throttle(func, wait, options) {
          var leading = true, trailing = true;
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          if (isObject(options)) {
            leading = "leading" in options ? !!options.leading : leading;
            trailing = "trailing" in options ? !!options.trailing : trailing;
          }
          return debounce(func, wait, {
            "leading": leading,
            "maxWait": wait,
            "trailing": trailing
          });
        }
        function unary(func) {
          return ary(func, 1);
        }
        function wrap(value, wrapper) {
          return partial(castFunction(wrapper), value);
        }
        function castArray() {
          if (!arguments.length) {
            return [];
          }
          var value = arguments[0];
          return isArray(value) ? value : [value];
        }
        function clone(value) {
          return baseClone(value, CLONE_SYMBOLS_FLAG);
        }
        function cloneWith(value, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined2;
          return baseClone(value, CLONE_SYMBOLS_FLAG, customizer);
        }
        function cloneDeep(value) {
          return baseClone(value, CLONE_DEEP_FLAG | CLONE_SYMBOLS_FLAG);
        }
        function cloneDeepWith(value, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined2;
          return baseClone(value, CLONE_DEEP_FLAG | CLONE_SYMBOLS_FLAG, customizer);
        }
        function conformsTo(object, source) {
          return source == null || baseConformsTo(object, source, keys(source));
        }
        function eq(value, other) {
          return value === other || value !== value && other !== other;
        }
        var gt = createRelationalOperation(baseGt);
        var gte = createRelationalOperation(function(value, other) {
          return value >= other;
        });
        var isArguments = baseIsArguments(/* @__PURE__ */ (function() {
          return arguments;
        })()) ? baseIsArguments : function(value) {
          return isObjectLike(value) && hasOwnProperty.call(value, "callee") && !propertyIsEnumerable.call(value, "callee");
        };
        var isArray = Array2.isArray;
        var isArrayBuffer = nodeIsArrayBuffer ? baseUnary(nodeIsArrayBuffer) : baseIsArrayBuffer;
        function isArrayLike(value) {
          return value != null && isLength(value.length) && !isFunction(value);
        }
        function isArrayLikeObject(value) {
          return isObjectLike(value) && isArrayLike(value);
        }
        function isBoolean(value) {
          return value === true || value === false || isObjectLike(value) && baseGetTag(value) == boolTag;
        }
        var isBuffer = nativeIsBuffer || stubFalse;
        var isDate = nodeIsDate ? baseUnary(nodeIsDate) : baseIsDate;
        function isElement(value) {
          return isObjectLike(value) && value.nodeType === 1 && !isPlainObject(value);
        }
        function isEmpty(value) {
          if (value == null) {
            return true;
          }
          if (isArrayLike(value) && (isArray(value) || typeof value == "string" || typeof value.splice == "function" || isBuffer(value) || isTypedArray(value) || isArguments(value))) {
            return !value.length;
          }
          var tag = getTag(value);
          if (tag == mapTag || tag == setTag) {
            return !value.size;
          }
          if (isPrototype(value)) {
            return !baseKeys(value).length;
          }
          for (var key in value) {
            if (hasOwnProperty.call(value, key)) {
              return false;
            }
          }
          return true;
        }
        function isEqual(value, other) {
          return baseIsEqual(value, other);
        }
        function isEqualWith(value, other, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined2;
          var result2 = customizer ? customizer(value, other) : undefined2;
          return result2 === undefined2 ? baseIsEqual(value, other, undefined2, customizer) : !!result2;
        }
        function isError(value) {
          if (!isObjectLike(value)) {
            return false;
          }
          var tag = baseGetTag(value);
          return tag == errorTag || tag == domExcTag || typeof value.message == "string" && typeof value.name == "string" && !isPlainObject(value);
        }
        function isFinite2(value) {
          return typeof value == "number" && nativeIsFinite(value);
        }
        function isFunction(value) {
          if (!isObject(value)) {
            return false;
          }
          var tag = baseGetTag(value);
          return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
        }
        function isInteger(value) {
          return typeof value == "number" && value == toInteger(value);
        }
        function isLength(value) {
          return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
        }
        function isObject(value) {
          var type = typeof value;
          return value != null && (type == "object" || type == "function");
        }
        function isObjectLike(value) {
          return value != null && typeof value == "object";
        }
        var isMap = nodeIsMap ? baseUnary(nodeIsMap) : baseIsMap;
        function isMatch(object, source) {
          return object === source || baseIsMatch(object, source, getMatchData(source));
        }
        function isMatchWith(object, source, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined2;
          return baseIsMatch(object, source, getMatchData(source), customizer);
        }
        function isNaN2(value) {
          return isNumber(value) && value != +value;
        }
        function isNative(value) {
          if (isMaskable(value)) {
            throw new Error2(CORE_ERROR_TEXT);
          }
          return baseIsNative(value);
        }
        function isNull(value) {
          return value === null;
        }
        function isNil(value) {
          return value == null;
        }
        function isNumber(value) {
          return typeof value == "number" || isObjectLike(value) && baseGetTag(value) == numberTag;
        }
        function isPlainObject(value) {
          if (!isObjectLike(value) || baseGetTag(value) != objectTag) {
            return false;
          }
          var proto = getPrototype(value);
          if (proto === null) {
            return true;
          }
          var Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
          return typeof Ctor == "function" && Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString;
        }
        var isRegExp = nodeIsRegExp ? baseUnary(nodeIsRegExp) : baseIsRegExp;
        function isSafeInteger(value) {
          return isInteger(value) && value >= -MAX_SAFE_INTEGER && value <= MAX_SAFE_INTEGER;
        }
        var isSet = nodeIsSet ? baseUnary(nodeIsSet) : baseIsSet;
        function isString(value) {
          return typeof value == "string" || !isArray(value) && isObjectLike(value) && baseGetTag(value) == stringTag;
        }
        function isSymbol(value) {
          return typeof value == "symbol" || isObjectLike(value) && baseGetTag(value) == symbolTag;
        }
        var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
        function isUndefined(value) {
          return value === undefined2;
        }
        function isWeakMap(value) {
          return isObjectLike(value) && getTag(value) == weakMapTag;
        }
        function isWeakSet(value) {
          return isObjectLike(value) && baseGetTag(value) == weakSetTag;
        }
        var lt = createRelationalOperation(baseLt);
        var lte = createRelationalOperation(function(value, other) {
          return value <= other;
        });
        function toArray(value) {
          if (!value) {
            return [];
          }
          if (isArrayLike(value)) {
            return isString(value) ? stringToArray(value) : copyArray(value);
          }
          if (symIterator && value[symIterator]) {
            return iteratorToArray(value[symIterator]());
          }
          var tag = getTag(value), func = tag == mapTag ? mapToArray : tag == setTag ? setToArray : values;
          return func(value);
        }
        function toFinite(value) {
          if (!value) {
            return value === 0 ? value : 0;
          }
          value = toNumber(value);
          if (value === INFINITY || value === -INFINITY) {
            var sign = value < 0 ? -1 : 1;
            return sign * MAX_INTEGER;
          }
          return value === value ? value : 0;
        }
        function toInteger(value) {
          var result2 = toFinite(value), remainder = result2 % 1;
          return result2 === result2 ? remainder ? result2 - remainder : result2 : 0;
        }
        function toLength(value) {
          return value ? baseClamp(toInteger(value), 0, MAX_ARRAY_LENGTH) : 0;
        }
        function toNumber(value) {
          if (typeof value == "number") {
            return value;
          }
          if (isSymbol(value)) {
            return NAN;
          }
          if (isObject(value)) {
            var other = typeof value.valueOf == "function" ? value.valueOf() : value;
            value = isObject(other) ? other + "" : other;
          }
          if (typeof value != "string") {
            return value === 0 ? value : +value;
          }
          value = baseTrim(value);
          var isBinary = reIsBinary.test(value);
          return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
        }
        function toPlainObject(value) {
          return copyObject(value, keysIn(value));
        }
        function toSafeInteger(value) {
          return value ? baseClamp(toInteger(value), -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER) : value === 0 ? value : 0;
        }
        function toString(value) {
          return value == null ? "" : baseToString(value);
        }
        var assign = createAssigner(function(object, source) {
          if (isPrototype(source) || isArrayLike(source)) {
            copyObject(source, keys(source), object);
            return;
          }
          for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
              assignValue(object, key, source[key]);
            }
          }
        });
        var assignIn = createAssigner(function(object, source) {
          copyObject(source, keysIn(source), object);
        });
        var assignInWith = createAssigner(function(object, source, srcIndex, customizer) {
          copyObject(source, keysIn(source), object, customizer);
        });
        var assignWith = createAssigner(function(object, source, srcIndex, customizer) {
          copyObject(source, keys(source), object, customizer);
        });
        var at = flatRest(baseAt);
        function create(prototype, properties) {
          var result2 = baseCreate(prototype);
          return properties == null ? result2 : baseAssign(result2, properties);
        }
        var defaults = baseRest(function(object, sources) {
          object = Object2(object);
          var index = -1;
          var length = sources.length;
          var guard = length > 2 ? sources[2] : undefined2;
          if (guard && isIterateeCall(sources[0], sources[1], guard)) {
            length = 1;
          }
          while (++index < length) {
            var source = sources[index];
            var props = keysIn(source);
            var propsIndex = -1;
            var propsLength = props.length;
            while (++propsIndex < propsLength) {
              var key = props[propsIndex];
              var value = object[key];
              if (value === undefined2 || eq(value, objectProto[key]) && !hasOwnProperty.call(object, key)) {
                object[key] = source[key];
              }
            }
          }
          return object;
        });
        var defaultsDeep = baseRest(function(args) {
          args.push(undefined2, customDefaultsMerge);
          return apply(mergeWith, undefined2, args);
        });
        function findKey(object, predicate) {
          return baseFindKey(object, getIteratee(predicate, 3), baseForOwn);
        }
        function findLastKey(object, predicate) {
          return baseFindKey(object, getIteratee(predicate, 3), baseForOwnRight);
        }
        function forIn(object, iteratee2) {
          return object == null ? object : baseFor(object, getIteratee(iteratee2, 3), keysIn);
        }
        function forInRight(object, iteratee2) {
          return object == null ? object : baseForRight(object, getIteratee(iteratee2, 3), keysIn);
        }
        function forOwn(object, iteratee2) {
          return object && baseForOwn(object, getIteratee(iteratee2, 3));
        }
        function forOwnRight(object, iteratee2) {
          return object && baseForOwnRight(object, getIteratee(iteratee2, 3));
        }
        function functions(object) {
          return object == null ? [] : baseFunctions(object, keys(object));
        }
        function functionsIn(object) {
          return object == null ? [] : baseFunctions(object, keysIn(object));
        }
        function get(object, path, defaultValue) {
          var result2 = object == null ? undefined2 : baseGet(object, path);
          return result2 === undefined2 ? defaultValue : result2;
        }
        function has(object, path) {
          return object != null && hasPath(object, path, baseHas);
        }
        function hasIn(object, path) {
          return object != null && hasPath(object, path, baseHasIn);
        }
        var invert = createInverter(function(result2, value, key) {
          if (value != null && typeof value.toString != "function") {
            value = nativeObjectToString.call(value);
          }
          result2[value] = key;
        }, constant(identity));
        var invertBy = createInverter(function(result2, value, key) {
          if (value != null && typeof value.toString != "function") {
            value = nativeObjectToString.call(value);
          }
          if (hasOwnProperty.call(result2, value)) {
            result2[value].push(key);
          } else {
            result2[value] = [key];
          }
        }, getIteratee);
        var invoke = baseRest(baseInvoke);
        function keys(object) {
          return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
        }
        function keysIn(object) {
          return isArrayLike(object) ? arrayLikeKeys(object, true) : baseKeysIn(object);
        }
        function mapKeys(object, iteratee2) {
          var result2 = {};
          iteratee2 = getIteratee(iteratee2, 3);
          baseForOwn(object, function(value, key, object2) {
            baseAssignValue(result2, iteratee2(value, key, object2), value);
          });
          return result2;
        }
        function mapValues(object, iteratee2) {
          var result2 = {};
          iteratee2 = getIteratee(iteratee2, 3);
          baseForOwn(object, function(value, key, object2) {
            baseAssignValue(result2, key, iteratee2(value, key, object2));
          });
          return result2;
        }
        var merge = createAssigner(function(object, source, srcIndex) {
          baseMerge(object, source, srcIndex);
        });
        var mergeWith = createAssigner(function(object, source, srcIndex, customizer) {
          baseMerge(object, source, srcIndex, customizer);
        });
        var omit = flatRest(function(object, paths) {
          var result2 = {};
          if (object == null) {
            return result2;
          }
          var isDeep = false;
          paths = arrayMap(paths, function(path) {
            path = castPath(path, object);
            isDeep || (isDeep = path.length > 1);
            return path;
          });
          copyObject(object, getAllKeysIn(object), result2);
          if (isDeep) {
            result2 = baseClone(result2, CLONE_DEEP_FLAG | CLONE_FLAT_FLAG | CLONE_SYMBOLS_FLAG, customOmitClone);
          }
          var length = paths.length;
          while (length--) {
            baseUnset(result2, paths[length]);
          }
          return result2;
        });
        function omitBy(object, predicate) {
          return pickBy(object, negate(getIteratee(predicate)));
        }
        var pick = flatRest(function(object, paths) {
          return object == null ? {} : basePick(object, paths);
        });
        function pickBy(object, predicate) {
          if (object == null) {
            return {};
          }
          var props = arrayMap(getAllKeysIn(object), function(prop) {
            return [prop];
          });
          predicate = getIteratee(predicate);
          return basePickBy(object, props, function(value, path) {
            return predicate(value, path[0]);
          });
        }
        function result(object, path, defaultValue) {
          path = castPath(path, object);
          var index = -1, length = path.length;
          if (!length) {
            length = 1;
            object = undefined2;
          }
          while (++index < length) {
            var value = object == null ? undefined2 : object[toKey(path[index])];
            if (value === undefined2) {
              index = length;
              value = defaultValue;
            }
            object = isFunction(value) ? value.call(object) : value;
          }
          return object;
        }
        function set(object, path, value) {
          return object == null ? object : baseSet(object, path, value);
        }
        function setWith(object, path, value, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined2;
          return object == null ? object : baseSet(object, path, value, customizer);
        }
        var toPairs = createToPairs(keys);
        var toPairsIn = createToPairs(keysIn);
        function transform(object, iteratee2, accumulator) {
          var isArr = isArray(object), isArrLike = isArr || isBuffer(object) || isTypedArray(object);
          iteratee2 = getIteratee(iteratee2, 4);
          if (accumulator == null) {
            var Ctor = object && object.constructor;
            if (isArrLike) {
              accumulator = isArr ? new Ctor() : [];
            } else if (isObject(object)) {
              accumulator = isFunction(Ctor) ? baseCreate(getPrototype(object)) : {};
            } else {
              accumulator = {};
            }
          }
          (isArrLike ? arrayEach : baseForOwn)(object, function(value, index, object2) {
            return iteratee2(accumulator, value, index, object2);
          });
          return accumulator;
        }
        function unset(object, path) {
          return object == null ? true : baseUnset(object, path);
        }
        function update(object, path, updater) {
          return object == null ? object : baseUpdate(object, path, castFunction(updater));
        }
        function updateWith(object, path, updater, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined2;
          return object == null ? object : baseUpdate(object, path, castFunction(updater), customizer);
        }
        function values(object) {
          return object == null ? [] : baseValues(object, keys(object));
        }
        function valuesIn(object) {
          return object == null ? [] : baseValues(object, keysIn(object));
        }
        function clamp(number, lower, upper) {
          if (upper === undefined2) {
            upper = lower;
            lower = undefined2;
          }
          if (upper !== undefined2) {
            upper = toNumber(upper);
            upper = upper === upper ? upper : 0;
          }
          if (lower !== undefined2) {
            lower = toNumber(lower);
            lower = lower === lower ? lower : 0;
          }
          return baseClamp(toNumber(number), lower, upper);
        }
        function inRange(number, start, end) {
          start = toFinite(start);
          if (end === undefined2) {
            end = start;
            start = 0;
          } else {
            end = toFinite(end);
          }
          number = toNumber(number);
          return baseInRange(number, start, end);
        }
        function random(lower, upper, floating) {
          if (floating && typeof floating != "boolean" && isIterateeCall(lower, upper, floating)) {
            upper = floating = undefined2;
          }
          if (floating === undefined2) {
            if (typeof upper == "boolean") {
              floating = upper;
              upper = undefined2;
            } else if (typeof lower == "boolean") {
              floating = lower;
              lower = undefined2;
            }
          }
          if (lower === undefined2 && upper === undefined2) {
            lower = 0;
            upper = 1;
          } else {
            lower = toFinite(lower);
            if (upper === undefined2) {
              upper = lower;
              lower = 0;
            } else {
              upper = toFinite(upper);
            }
          }
          if (lower > upper) {
            var temp = lower;
            lower = upper;
            upper = temp;
          }
          if (floating || lower % 1 || upper % 1) {
            var rand = nativeRandom();
            return nativeMin(lower + rand * (upper - lower + freeParseFloat("1e-" + ((rand + "").length - 1))), upper);
          }
          return baseRandom(lower, upper);
        }
        var camelCase = createCompounder(function(result2, word, index) {
          word = word.toLowerCase();
          return result2 + (index ? capitalize(word) : word);
        });
        function capitalize(string) {
          return upperFirst(toString(string).toLowerCase());
        }
        function deburr(string) {
          string = toString(string);
          return string && string.replace(reLatin, deburrLetter).replace(reComboMark, "");
        }
        function endsWith(string, target, position) {
          string = toString(string);
          target = baseToString(target);
          var length = string.length;
          position = position === undefined2 ? length : baseClamp(toInteger(position), 0, length);
          var end = position;
          position -= target.length;
          return position >= 0 && string.slice(position, end) == target;
        }
        function escape(string) {
          string = toString(string);
          return string && reHasUnescapedHtml.test(string) ? string.replace(reUnescapedHtml, escapeHtmlChar) : string;
        }
        function escapeRegExp(string) {
          string = toString(string);
          return string && reHasRegExpChar.test(string) ? string.replace(reRegExpChar, "\\$&") : string;
        }
        var kebabCase = createCompounder(function(result2, word, index) {
          return result2 + (index ? "-" : "") + word.toLowerCase();
        });
        var lowerCase = createCompounder(function(result2, word, index) {
          return result2 + (index ? " " : "") + word.toLowerCase();
        });
        var lowerFirst = createCaseFirst("toLowerCase");
        function pad(string, length, chars) {
          string = toString(string);
          length = toInteger(length);
          var strLength = length ? stringSize(string) : 0;
          if (!length || strLength >= length) {
            return string;
          }
          var mid = (length - strLength) / 2;
          return createPadding(nativeFloor(mid), chars) + string + createPadding(nativeCeil(mid), chars);
        }
        function padEnd(string, length, chars) {
          string = toString(string);
          length = toInteger(length);
          var strLength = length ? stringSize(string) : 0;
          return length && strLength < length ? string + createPadding(length - strLength, chars) : string;
        }
        function padStart(string, length, chars) {
          string = toString(string);
          length = toInteger(length);
          var strLength = length ? stringSize(string) : 0;
          return length && strLength < length ? createPadding(length - strLength, chars) + string : string;
        }
        function parseInt2(string, radix, guard) {
          if (guard || radix == null) {
            radix = 0;
          } else if (radix) {
            radix = +radix;
          }
          return nativeParseInt(toString(string).replace(reTrimStart, ""), radix || 0);
        }
        function repeat(string, n, guard) {
          if (guard ? isIterateeCall(string, n, guard) : n === undefined2) {
            n = 1;
          } else {
            n = toInteger(n);
          }
          return baseRepeat(toString(string), n);
        }
        function replace() {
          var args = arguments, string = toString(args[0]);
          return args.length < 3 ? string : string.replace(args[1], args[2]);
        }
        var snakeCase = createCompounder(function(result2, word, index) {
          return result2 + (index ? "_" : "") + word.toLowerCase();
        });
        function split(string, separator, limit) {
          if (limit && typeof limit != "number" && isIterateeCall(string, separator, limit)) {
            separator = limit = undefined2;
          }
          limit = limit === undefined2 ? MAX_ARRAY_LENGTH : limit >>> 0;
          if (!limit) {
            return [];
          }
          string = toString(string);
          if (string && (typeof separator == "string" || separator != null && !isRegExp(separator))) {
            separator = baseToString(separator);
            if (!separator && hasUnicode(string)) {
              return castSlice(stringToArray(string), 0, limit);
            }
          }
          return string.split(separator, limit);
        }
        var startCase = createCompounder(function(result2, word, index) {
          return result2 + (index ? " " : "") + upperFirst(word);
        });
        function startsWith(string, target, position) {
          string = toString(string);
          position = position == null ? 0 : baseClamp(toInteger(position), 0, string.length);
          target = baseToString(target);
          return string.slice(position, position + target.length) == target;
        }
        function template(string, options, guard) {
          var settings = lodash.templateSettings;
          if (guard && isIterateeCall(string, options, guard)) {
            options = undefined2;
          }
          string = toString(string);
          options = assignInWith({}, options, settings, customDefaultsAssignIn);
          var imports = assignInWith({}, options.imports, settings.imports, customDefaultsAssignIn), importsKeys = keys(imports), importsValues = baseValues(imports, importsKeys);
          var isEscaping, isEvaluating, index = 0, interpolate = options.interpolate || reNoMatch, source = "__p += '";
          var reDelimiters = RegExp2(
            (options.escape || reNoMatch).source + "|" + interpolate.source + "|" + (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + "|" + (options.evaluate || reNoMatch).source + "|$",
            "g"
          );
          var sourceURL = "//# sourceURL=" + (hasOwnProperty.call(options, "sourceURL") ? (options.sourceURL + "").replace(/\s/g, " ") : "lodash.templateSources[" + ++templateCounter + "]") + "\n";
          string.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
            interpolateValue || (interpolateValue = esTemplateValue);
            source += string.slice(index, offset).replace(reUnescapedString, escapeStringChar);
            if (escapeValue) {
              isEscaping = true;
              source += "' +\n__e(" + escapeValue + ") +\n'";
            }
            if (evaluateValue) {
              isEvaluating = true;
              source += "';\n" + evaluateValue + ";\n__p += '";
            }
            if (interpolateValue) {
              source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
            }
            index = offset + match.length;
            return match;
          });
          source += "';\n";
          var variable = hasOwnProperty.call(options, "variable") && options.variable;
          if (!variable) {
            source = "with (obj) {\n" + source + "\n}\n";
          } else if (reForbiddenIdentifierChars.test(variable)) {
            throw new Error2(INVALID_TEMPL_VAR_ERROR_TEXT);
          }
          source = (isEvaluating ? source.replace(reEmptyStringLeading, "") : source).replace(reEmptyStringMiddle, "$1").replace(reEmptyStringTrailing, "$1;");
          source = "function(" + (variable || "obj") + ") {\n" + (variable ? "" : "obj || (obj = {});\n") + "var __t, __p = ''" + (isEscaping ? ", __e = _.escape" : "") + (isEvaluating ? ", __j = Array.prototype.join;\nfunction print() { __p += __j.call(arguments, '') }\n" : ";\n") + source + "return __p\n}";
          var result2 = attempt(function() {
            return Function2(importsKeys, sourceURL + "return " + source).apply(undefined2, importsValues);
          });
          result2.source = source;
          if (isError(result2)) {
            throw result2;
          }
          return result2;
        }
        function toLower(value) {
          return toString(value).toLowerCase();
        }
        function toUpper(value) {
          return toString(value).toUpperCase();
        }
        function trim(string, chars, guard) {
          string = toString(string);
          if (string && (guard || chars === undefined2)) {
            return baseTrim(string);
          }
          if (!string || !(chars = baseToString(chars))) {
            return string;
          }
          var strSymbols = stringToArray(string), chrSymbols = stringToArray(chars), start = charsStartIndex(strSymbols, chrSymbols), end = charsEndIndex(strSymbols, chrSymbols) + 1;
          return castSlice(strSymbols, start, end).join("");
        }
        function trimEnd(string, chars, guard) {
          string = toString(string);
          if (string && (guard || chars === undefined2)) {
            return string.slice(0, trimmedEndIndex(string) + 1);
          }
          if (!string || !(chars = baseToString(chars))) {
            return string;
          }
          var strSymbols = stringToArray(string), end = charsEndIndex(strSymbols, stringToArray(chars)) + 1;
          return castSlice(strSymbols, 0, end).join("");
        }
        function trimStart(string, chars, guard) {
          string = toString(string);
          if (string && (guard || chars === undefined2)) {
            return string.replace(reTrimStart, "");
          }
          if (!string || !(chars = baseToString(chars))) {
            return string;
          }
          var strSymbols = stringToArray(string), start = charsStartIndex(strSymbols, stringToArray(chars));
          return castSlice(strSymbols, start).join("");
        }
        function truncate(string, options) {
          var length = DEFAULT_TRUNC_LENGTH, omission = DEFAULT_TRUNC_OMISSION;
          if (isObject(options)) {
            var separator = "separator" in options ? options.separator : separator;
            length = "length" in options ? toInteger(options.length) : length;
            omission = "omission" in options ? baseToString(options.omission) : omission;
          }
          string = toString(string);
          var strLength = string.length;
          if (hasUnicode(string)) {
            var strSymbols = stringToArray(string);
            strLength = strSymbols.length;
          }
          if (length >= strLength) {
            return string;
          }
          var end = length - stringSize(omission);
          if (end < 1) {
            return omission;
          }
          var result2 = strSymbols ? castSlice(strSymbols, 0, end).join("") : string.slice(0, end);
          if (separator === undefined2) {
            return result2 + omission;
          }
          if (strSymbols) {
            end += result2.length - end;
          }
          if (isRegExp(separator)) {
            if (string.slice(end).search(separator)) {
              var match, substring = result2;
              if (!separator.global) {
                separator = RegExp2(separator.source, toString(reFlags.exec(separator)) + "g");
              }
              separator.lastIndex = 0;
              while (match = separator.exec(substring)) {
                var newEnd = match.index;
              }
              result2 = result2.slice(0, newEnd === undefined2 ? end : newEnd);
            }
          } else if (string.indexOf(baseToString(separator), end) != end) {
            var index = result2.lastIndexOf(separator);
            if (index > -1) {
              result2 = result2.slice(0, index);
            }
          }
          return result2 + omission;
        }
        function unescape(string) {
          string = toString(string);
          return string && reHasEscapedHtml.test(string) ? string.replace(reEscapedHtml, unescapeHtmlChar) : string;
        }
        var upperCase = createCompounder(function(result2, word, index) {
          return result2 + (index ? " " : "") + word.toUpperCase();
        });
        var upperFirst = createCaseFirst("toUpperCase");
        function words(string, pattern, guard) {
          string = toString(string);
          pattern = guard ? undefined2 : pattern;
          if (pattern === undefined2) {
            return hasUnicodeWord(string) ? unicodeWords(string) : asciiWords(string);
          }
          return string.match(pattern) || [];
        }
        var attempt = baseRest(function(func, args) {
          try {
            return apply(func, undefined2, args);
          } catch (e) {
            return isError(e) ? e : new Error2(e);
          }
        });
        var bindAll = flatRest(function(object, methodNames) {
          arrayEach(methodNames, function(key) {
            key = toKey(key);
            baseAssignValue(object, key, bind(object[key], object));
          });
          return object;
        });
        function cond(pairs) {
          var length = pairs == null ? 0 : pairs.length, toIteratee = getIteratee();
          pairs = !length ? [] : arrayMap(pairs, function(pair) {
            if (typeof pair[1] != "function") {
              throw new TypeError2(FUNC_ERROR_TEXT);
            }
            return [toIteratee(pair[0]), pair[1]];
          });
          return baseRest(function(args) {
            var index = -1;
            while (++index < length) {
              var pair = pairs[index];
              if (apply(pair[0], this, args)) {
                return apply(pair[1], this, args);
              }
            }
          });
        }
        function conforms(source) {
          return baseConforms(baseClone(source, CLONE_DEEP_FLAG));
        }
        function constant(value) {
          return function() {
            return value;
          };
        }
        function defaultTo(value, defaultValue) {
          return value == null || value !== value ? defaultValue : value;
        }
        var flow = createFlow();
        var flowRight = createFlow(true);
        function identity(value) {
          return value;
        }
        function iteratee(func) {
          return baseIteratee(typeof func == "function" ? func : baseClone(func, CLONE_DEEP_FLAG));
        }
        function matches(source) {
          return baseMatches(baseClone(source, CLONE_DEEP_FLAG));
        }
        function matchesProperty(path, srcValue) {
          return baseMatchesProperty(path, baseClone(srcValue, CLONE_DEEP_FLAG));
        }
        var method = baseRest(function(path, args) {
          return function(object) {
            return baseInvoke(object, path, args);
          };
        });
        var methodOf = baseRest(function(object, args) {
          return function(path) {
            return baseInvoke(object, path, args);
          };
        });
        function mixin(object, source, options) {
          var props = keys(source), methodNames = baseFunctions(source, props);
          if (options == null && !(isObject(source) && (methodNames.length || !props.length))) {
            options = source;
            source = object;
            object = this;
            methodNames = baseFunctions(source, keys(source));
          }
          var chain2 = !(isObject(options) && "chain" in options) || !!options.chain, isFunc = isFunction(object);
          arrayEach(methodNames, function(methodName) {
            var func = source[methodName];
            object[methodName] = func;
            if (isFunc) {
              object.prototype[methodName] = function() {
                var chainAll = this.__chain__;
                if (chain2 || chainAll) {
                  var result2 = object(this.__wrapped__), actions = result2.__actions__ = copyArray(this.__actions__);
                  actions.push({ "func": func, "args": arguments, "thisArg": object });
                  result2.__chain__ = chainAll;
                  return result2;
                }
                return func.apply(object, arrayPush([this.value()], arguments));
              };
            }
          });
          return object;
        }
        function noConflict() {
          if (root._ === this) {
            root._ = oldDash;
          }
          return this;
        }
        function noop() {
        }
        function nthArg(n) {
          n = toInteger(n);
          return baseRest(function(args) {
            return baseNth(args, n);
          });
        }
        var over = createOver(arrayMap);
        var overEvery = createOver(arrayEvery);
        var overSome = createOver(arraySome);
        function property(path) {
          return isKey(path) ? baseProperty(toKey(path)) : basePropertyDeep(path);
        }
        function propertyOf(object) {
          return function(path) {
            return object == null ? undefined2 : baseGet(object, path);
          };
        }
        var range = createRange();
        var rangeRight = createRange(true);
        function stubArray() {
          return [];
        }
        function stubFalse() {
          return false;
        }
        function stubObject() {
          return {};
        }
        function stubString() {
          return "";
        }
        function stubTrue() {
          return true;
        }
        function times(n, iteratee2) {
          n = toInteger(n);
          if (n < 1 || n > MAX_SAFE_INTEGER) {
            return [];
          }
          var index = MAX_ARRAY_LENGTH, length = nativeMin(n, MAX_ARRAY_LENGTH);
          iteratee2 = getIteratee(iteratee2);
          n -= MAX_ARRAY_LENGTH;
          var result2 = baseTimes(length, iteratee2);
          while (++index < n) {
            iteratee2(index);
          }
          return result2;
        }
        function toPath(value) {
          if (isArray(value)) {
            return arrayMap(value, toKey);
          }
          return isSymbol(value) ? [value] : copyArray(stringToPath(toString(value)));
        }
        function uniqueId(prefix) {
          var id = ++idCounter;
          return toString(prefix) + id;
        }
        var add = createMathOperation(function(augend, addend) {
          return augend + addend;
        }, 0);
        var ceil = createRound("ceil");
        var divide = createMathOperation(function(dividend, divisor) {
          return dividend / divisor;
        }, 1);
        var floor = createRound("floor");
        function max(array) {
          return array && array.length ? baseExtremum(array, identity, baseGt) : undefined2;
        }
        function maxBy(array, iteratee2) {
          return array && array.length ? baseExtremum(array, getIteratee(iteratee2, 2), baseGt) : undefined2;
        }
        function mean(array) {
          return baseMean(array, identity);
        }
        function meanBy(array, iteratee2) {
          return baseMean(array, getIteratee(iteratee2, 2));
        }
        function min(array) {
          return array && array.length ? baseExtremum(array, identity, baseLt) : undefined2;
        }
        function minBy(array, iteratee2) {
          return array && array.length ? baseExtremum(array, getIteratee(iteratee2, 2), baseLt) : undefined2;
        }
        var multiply = createMathOperation(function(multiplier, multiplicand) {
          return multiplier * multiplicand;
        }, 1);
        var round = createRound("round");
        var subtract = createMathOperation(function(minuend, subtrahend) {
          return minuend - subtrahend;
        }, 0);
        function sum(array) {
          return array && array.length ? baseSum(array, identity) : 0;
        }
        function sumBy(array, iteratee2) {
          return array && array.length ? baseSum(array, getIteratee(iteratee2, 2)) : 0;
        }
        lodash.after = after;
        lodash.ary = ary;
        lodash.assign = assign;
        lodash.assignIn = assignIn;
        lodash.assignInWith = assignInWith;
        lodash.assignWith = assignWith;
        lodash.at = at;
        lodash.before = before;
        lodash.bind = bind;
        lodash.bindAll = bindAll;
        lodash.bindKey = bindKey;
        lodash.castArray = castArray;
        lodash.chain = chain;
        lodash.chunk = chunk;
        lodash.compact = compact;
        lodash.concat = concat;
        lodash.cond = cond;
        lodash.conforms = conforms;
        lodash.constant = constant;
        lodash.countBy = countBy;
        lodash.create = create;
        lodash.curry = curry;
        lodash.curryRight = curryRight;
        lodash.debounce = debounce;
        lodash.defaults = defaults;
        lodash.defaultsDeep = defaultsDeep;
        lodash.defer = defer;
        lodash.delay = delay;
        lodash.difference = difference;
        lodash.differenceBy = differenceBy;
        lodash.differenceWith = differenceWith;
        lodash.drop = drop;
        lodash.dropRight = dropRight;
        lodash.dropRightWhile = dropRightWhile;
        lodash.dropWhile = dropWhile;
        lodash.fill = fill;
        lodash.filter = filter;
        lodash.flatMap = flatMap;
        lodash.flatMapDeep = flatMapDeep;
        lodash.flatMapDepth = flatMapDepth;
        lodash.flatten = flatten;
        lodash.flattenDeep = flattenDeep;
        lodash.flattenDepth = flattenDepth;
        lodash.flip = flip;
        lodash.flow = flow;
        lodash.flowRight = flowRight;
        lodash.fromPairs = fromPairs;
        lodash.functions = functions;
        lodash.functionsIn = functionsIn;
        lodash.groupBy = groupBy;
        lodash.initial = initial;
        lodash.intersection = intersection;
        lodash.intersectionBy = intersectionBy;
        lodash.intersectionWith = intersectionWith;
        lodash.invert = invert;
        lodash.invertBy = invertBy;
        lodash.invokeMap = invokeMap;
        lodash.iteratee = iteratee;
        lodash.keyBy = keyBy;
        lodash.keys = keys;
        lodash.keysIn = keysIn;
        lodash.map = map;
        lodash.mapKeys = mapKeys;
        lodash.mapValues = mapValues;
        lodash.matches = matches;
        lodash.matchesProperty = matchesProperty;
        lodash.memoize = memoize;
        lodash.merge = merge;
        lodash.mergeWith = mergeWith;
        lodash.method = method;
        lodash.methodOf = methodOf;
        lodash.mixin = mixin;
        lodash.negate = negate;
        lodash.nthArg = nthArg;
        lodash.omit = omit;
        lodash.omitBy = omitBy;
        lodash.once = once;
        lodash.orderBy = orderBy;
        lodash.over = over;
        lodash.overArgs = overArgs;
        lodash.overEvery = overEvery;
        lodash.overSome = overSome;
        lodash.partial = partial;
        lodash.partialRight = partialRight;
        lodash.partition = partition;
        lodash.pick = pick;
        lodash.pickBy = pickBy;
        lodash.property = property;
        lodash.propertyOf = propertyOf;
        lodash.pull = pull;
        lodash.pullAll = pullAll;
        lodash.pullAllBy = pullAllBy;
        lodash.pullAllWith = pullAllWith;
        lodash.pullAt = pullAt;
        lodash.range = range;
        lodash.rangeRight = rangeRight;
        lodash.rearg = rearg;
        lodash.reject = reject;
        lodash.remove = remove;
        lodash.rest = rest;
        lodash.reverse = reverse;
        lodash.sampleSize = sampleSize;
        lodash.set = set;
        lodash.setWith = setWith;
        lodash.shuffle = shuffle;
        lodash.slice = slice;
        lodash.sortBy = sortBy;
        lodash.sortedUniq = sortedUniq;
        lodash.sortedUniqBy = sortedUniqBy;
        lodash.split = split;
        lodash.spread = spread;
        lodash.tail = tail;
        lodash.take = take;
        lodash.takeRight = takeRight;
        lodash.takeRightWhile = takeRightWhile;
        lodash.takeWhile = takeWhile;
        lodash.tap = tap;
        lodash.throttle = throttle;
        lodash.thru = thru;
        lodash.toArray = toArray;
        lodash.toPairs = toPairs;
        lodash.toPairsIn = toPairsIn;
        lodash.toPath = toPath;
        lodash.toPlainObject = toPlainObject;
        lodash.transform = transform;
        lodash.unary = unary;
        lodash.union = union;
        lodash.unionBy = unionBy;
        lodash.unionWith = unionWith;
        lodash.uniq = uniq;
        lodash.uniqBy = uniqBy;
        lodash.uniqWith = uniqWith;
        lodash.unset = unset;
        lodash.unzip = unzip;
        lodash.unzipWith = unzipWith;
        lodash.update = update;
        lodash.updateWith = updateWith;
        lodash.values = values;
        lodash.valuesIn = valuesIn;
        lodash.without = without;
        lodash.words = words;
        lodash.wrap = wrap;
        lodash.xor = xor;
        lodash.xorBy = xorBy;
        lodash.xorWith = xorWith;
        lodash.zip = zip;
        lodash.zipObject = zipObject;
        lodash.zipObjectDeep = zipObjectDeep;
        lodash.zipWith = zipWith;
        lodash.entries = toPairs;
        lodash.entriesIn = toPairsIn;
        lodash.extend = assignIn;
        lodash.extendWith = assignInWith;
        mixin(lodash, lodash);
        lodash.add = add;
        lodash.attempt = attempt;
        lodash.camelCase = camelCase;
        lodash.capitalize = capitalize;
        lodash.ceil = ceil;
        lodash.clamp = clamp;
        lodash.clone = clone;
        lodash.cloneDeep = cloneDeep;
        lodash.cloneDeepWith = cloneDeepWith;
        lodash.cloneWith = cloneWith;
        lodash.conformsTo = conformsTo;
        lodash.deburr = deburr;
        lodash.defaultTo = defaultTo;
        lodash.divide = divide;
        lodash.endsWith = endsWith;
        lodash.eq = eq;
        lodash.escape = escape;
        lodash.escapeRegExp = escapeRegExp;
        lodash.every = every;
        lodash.find = find;
        lodash.findIndex = findIndex;
        lodash.findKey = findKey;
        lodash.findLast = findLast;
        lodash.findLastIndex = findLastIndex;
        lodash.findLastKey = findLastKey;
        lodash.floor = floor;
        lodash.forEach = forEach;
        lodash.forEachRight = forEachRight;
        lodash.forIn = forIn;
        lodash.forInRight = forInRight;
        lodash.forOwn = forOwn;
        lodash.forOwnRight = forOwnRight;
        lodash.get = get;
        lodash.gt = gt;
        lodash.gte = gte;
        lodash.has = has;
        lodash.hasIn = hasIn;
        lodash.head = head;
        lodash.identity = identity;
        lodash.includes = includes;
        lodash.indexOf = indexOf;
        lodash.inRange = inRange;
        lodash.invoke = invoke;
        lodash.isArguments = isArguments;
        lodash.isArray = isArray;
        lodash.isArrayBuffer = isArrayBuffer;
        lodash.isArrayLike = isArrayLike;
        lodash.isArrayLikeObject = isArrayLikeObject;
        lodash.isBoolean = isBoolean;
        lodash.isBuffer = isBuffer;
        lodash.isDate = isDate;
        lodash.isElement = isElement;
        lodash.isEmpty = isEmpty;
        lodash.isEqual = isEqual;
        lodash.isEqualWith = isEqualWith;
        lodash.isError = isError;
        lodash.isFinite = isFinite2;
        lodash.isFunction = isFunction;
        lodash.isInteger = isInteger;
        lodash.isLength = isLength;
        lodash.isMap = isMap;
        lodash.isMatch = isMatch;
        lodash.isMatchWith = isMatchWith;
        lodash.isNaN = isNaN2;
        lodash.isNative = isNative;
        lodash.isNil = isNil;
        lodash.isNull = isNull;
        lodash.isNumber = isNumber;
        lodash.isObject = isObject;
        lodash.isObjectLike = isObjectLike;
        lodash.isPlainObject = isPlainObject;
        lodash.isRegExp = isRegExp;
        lodash.isSafeInteger = isSafeInteger;
        lodash.isSet = isSet;
        lodash.isString = isString;
        lodash.isSymbol = isSymbol;
        lodash.isTypedArray = isTypedArray;
        lodash.isUndefined = isUndefined;
        lodash.isWeakMap = isWeakMap;
        lodash.isWeakSet = isWeakSet;
        lodash.join = join;
        lodash.kebabCase = kebabCase;
        lodash.last = last;
        lodash.lastIndexOf = lastIndexOf;
        lodash.lowerCase = lowerCase;
        lodash.lowerFirst = lowerFirst;
        lodash.lt = lt;
        lodash.lte = lte;
        lodash.max = max;
        lodash.maxBy = maxBy;
        lodash.mean = mean;
        lodash.meanBy = meanBy;
        lodash.min = min;
        lodash.minBy = minBy;
        lodash.stubArray = stubArray;
        lodash.stubFalse = stubFalse;
        lodash.stubObject = stubObject;
        lodash.stubString = stubString;
        lodash.stubTrue = stubTrue;
        lodash.multiply = multiply;
        lodash.nth = nth;
        lodash.noConflict = noConflict;
        lodash.noop = noop;
        lodash.now = now;
        lodash.pad = pad;
        lodash.padEnd = padEnd;
        lodash.padStart = padStart;
        lodash.parseInt = parseInt2;
        lodash.random = random;
        lodash.reduce = reduce;
        lodash.reduceRight = reduceRight;
        lodash.repeat = repeat;
        lodash.replace = replace;
        lodash.result = result;
        lodash.round = round;
        lodash.runInContext = runInContext2;
        lodash.sample = sample;
        lodash.size = size;
        lodash.snakeCase = snakeCase;
        lodash.some = some;
        lodash.sortedIndex = sortedIndex;
        lodash.sortedIndexBy = sortedIndexBy;
        lodash.sortedIndexOf = sortedIndexOf;
        lodash.sortedLastIndex = sortedLastIndex;
        lodash.sortedLastIndexBy = sortedLastIndexBy;
        lodash.sortedLastIndexOf = sortedLastIndexOf;
        lodash.startCase = startCase;
        lodash.startsWith = startsWith;
        lodash.subtract = subtract;
        lodash.sum = sum;
        lodash.sumBy = sumBy;
        lodash.template = template;
        lodash.times = times;
        lodash.toFinite = toFinite;
        lodash.toInteger = toInteger;
        lodash.toLength = toLength;
        lodash.toLower = toLower;
        lodash.toNumber = toNumber;
        lodash.toSafeInteger = toSafeInteger;
        lodash.toString = toString;
        lodash.toUpper = toUpper;
        lodash.trim = trim;
        lodash.trimEnd = trimEnd;
        lodash.trimStart = trimStart;
        lodash.truncate = truncate;
        lodash.unescape = unescape;
        lodash.uniqueId = uniqueId;
        lodash.upperCase = upperCase;
        lodash.upperFirst = upperFirst;
        lodash.each = forEach;
        lodash.eachRight = forEachRight;
        lodash.first = head;
        mixin(lodash, (function() {
          var source = {};
          baseForOwn(lodash, function(func, methodName) {
            if (!hasOwnProperty.call(lodash.prototype, methodName)) {
              source[methodName] = func;
            }
          });
          return source;
        })(), { "chain": false });
        lodash.VERSION = VERSION;
        arrayEach(["bind", "bindKey", "curry", "curryRight", "partial", "partialRight"], function(methodName) {
          lodash[methodName].placeholder = lodash;
        });
        arrayEach(["drop", "take"], function(methodName, index) {
          LazyWrapper.prototype[methodName] = function(n) {
            n = n === undefined2 ? 1 : nativeMax(toInteger(n), 0);
            var result2 = this.__filtered__ && !index ? new LazyWrapper(this) : this.clone();
            if (result2.__filtered__) {
              result2.__takeCount__ = nativeMin(n, result2.__takeCount__);
            } else {
              result2.__views__.push({
                "size": nativeMin(n, MAX_ARRAY_LENGTH),
                "type": methodName + (result2.__dir__ < 0 ? "Right" : "")
              });
            }
            return result2;
          };
          LazyWrapper.prototype[methodName + "Right"] = function(n) {
            return this.reverse()[methodName](n).reverse();
          };
        });
        arrayEach(["filter", "map", "takeWhile"], function(methodName, index) {
          var type = index + 1, isFilter = type == LAZY_FILTER_FLAG || type == LAZY_WHILE_FLAG;
          LazyWrapper.prototype[methodName] = function(iteratee2) {
            var result2 = this.clone();
            result2.__iteratees__.push({
              "iteratee": getIteratee(iteratee2, 3),
              "type": type
            });
            result2.__filtered__ = result2.__filtered__ || isFilter;
            return result2;
          };
        });
        arrayEach(["head", "last"], function(methodName, index) {
          var takeName = "take" + (index ? "Right" : "");
          LazyWrapper.prototype[methodName] = function() {
            return this[takeName](1).value()[0];
          };
        });
        arrayEach(["initial", "tail"], function(methodName, index) {
          var dropName = "drop" + (index ? "" : "Right");
          LazyWrapper.prototype[methodName] = function() {
            return this.__filtered__ ? new LazyWrapper(this) : this[dropName](1);
          };
        });
        LazyWrapper.prototype.compact = function() {
          return this.filter(identity);
        };
        LazyWrapper.prototype.find = function(predicate) {
          return this.filter(predicate).head();
        };
        LazyWrapper.prototype.findLast = function(predicate) {
          return this.reverse().find(predicate);
        };
        LazyWrapper.prototype.invokeMap = baseRest(function(path, args) {
          if (typeof path == "function") {
            return new LazyWrapper(this);
          }
          return this.map(function(value) {
            return baseInvoke(value, path, args);
          });
        });
        LazyWrapper.prototype.reject = function(predicate) {
          return this.filter(negate(getIteratee(predicate)));
        };
        LazyWrapper.prototype.slice = function(start, end) {
          start = toInteger(start);
          var result2 = this;
          if (result2.__filtered__ && (start > 0 || end < 0)) {
            return new LazyWrapper(result2);
          }
          if (start < 0) {
            result2 = result2.takeRight(-start);
          } else if (start) {
            result2 = result2.drop(start);
          }
          if (end !== undefined2) {
            end = toInteger(end);
            result2 = end < 0 ? result2.dropRight(-end) : result2.take(end - start);
          }
          return result2;
        };
        LazyWrapper.prototype.takeRightWhile = function(predicate) {
          return this.reverse().takeWhile(predicate).reverse();
        };
        LazyWrapper.prototype.toArray = function() {
          return this.take(MAX_ARRAY_LENGTH);
        };
        baseForOwn(LazyWrapper.prototype, function(func, methodName) {
          var checkIteratee = /^(?:filter|find|map|reject)|While$/.test(methodName), isTaker = /^(?:head|last)$/.test(methodName), lodashFunc = lodash[isTaker ? "take" + (methodName == "last" ? "Right" : "") : methodName], retUnwrapped = isTaker || /^find/.test(methodName);
          if (!lodashFunc) {
            return;
          }
          lodash.prototype[methodName] = function() {
            var value = this.__wrapped__, args = isTaker ? [1] : arguments, isLazy = value instanceof LazyWrapper, iteratee2 = args[0], useLazy = isLazy || isArray(value);
            var interceptor = function(value2) {
              var result3 = lodashFunc.apply(lodash, arrayPush([value2], args));
              return isTaker && chainAll ? result3[0] : result3;
            };
            if (useLazy && checkIteratee && typeof iteratee2 == "function" && iteratee2.length != 1) {
              isLazy = useLazy = false;
            }
            var chainAll = this.__chain__, isHybrid = !!this.__actions__.length, isUnwrapped = retUnwrapped && !chainAll, onlyLazy = isLazy && !isHybrid;
            if (!retUnwrapped && useLazy) {
              value = onlyLazy ? value : new LazyWrapper(this);
              var result2 = func.apply(value, args);
              result2.__actions__.push({ "func": thru, "args": [interceptor], "thisArg": undefined2 });
              return new LodashWrapper(result2, chainAll);
            }
            if (isUnwrapped && onlyLazy) {
              return func.apply(this, args);
            }
            result2 = this.thru(interceptor);
            return isUnwrapped ? isTaker ? result2.value()[0] : result2.value() : result2;
          };
        });
        arrayEach(["pop", "push", "shift", "sort", "splice", "unshift"], function(methodName) {
          var func = arrayProto[methodName], chainName = /^(?:push|sort|unshift)$/.test(methodName) ? "tap" : "thru", retUnwrapped = /^(?:pop|shift)$/.test(methodName);
          lodash.prototype[methodName] = function() {
            var args = arguments;
            if (retUnwrapped && !this.__chain__) {
              var value = this.value();
              return func.apply(isArray(value) ? value : [], args);
            }
            return this[chainName](function(value2) {
              return func.apply(isArray(value2) ? value2 : [], args);
            });
          };
        });
        baseForOwn(LazyWrapper.prototype, function(func, methodName) {
          var lodashFunc = lodash[methodName];
          if (lodashFunc) {
            var key = lodashFunc.name + "";
            if (!hasOwnProperty.call(realNames, key)) {
              realNames[key] = [];
            }
            realNames[key].push({ "name": methodName, "func": lodashFunc });
          }
        });
        realNames[createHybrid(undefined2, WRAP_BIND_KEY_FLAG).name] = [{
          "name": "wrapper",
          "func": undefined2
        }];
        LazyWrapper.prototype.clone = lazyClone;
        LazyWrapper.prototype.reverse = lazyReverse;
        LazyWrapper.prototype.value = lazyValue;
        lodash.prototype.at = wrapperAt;
        lodash.prototype.chain = wrapperChain;
        lodash.prototype.commit = wrapperCommit;
        lodash.prototype.next = wrapperNext;
        lodash.prototype.plant = wrapperPlant;
        lodash.prototype.reverse = wrapperReverse;
        lodash.prototype.toJSON = lodash.prototype.valueOf = lodash.prototype.value = wrapperValue;
        lodash.prototype.first = lodash.prototype.head;
        if (symIterator) {
          lodash.prototype[symIterator] = wrapperToIterator;
        }
        return lodash;
      });
      var _ = runInContext();
      if (typeof define == "function" && typeof define.amd == "object" && define.amd) {
        root._ = _;
        define(function() {
          return _;
        });
      } else if (freeModule) {
        (freeModule.exports = _)._ = _;
        freeExports._ = _;
      } else {
        root._ = _;
      }
    }).call(exports2);
  }
});

// node_modules/jsonwebtoken/sign.js
var require_sign = __commonJS({
  "node_modules/jsonwebtoken/sign.js"(exports2, module2) {
    var timespan = require_timespan();
    var PS_SUPPORTED = require_psSupported();
    var validateAsymmetricKey = require_validateAsymmetricKey();
    var jws = require_jws();
    var { includes, isBoolean, isInteger, isNumber, isPlainObject, isString, once } = require_lodash();
    var { KeyObject, createSecretKey, createPrivateKey } = require("crypto");
    var SUPPORTED_ALGS = ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "HS256", "HS384", "HS512", "none"];
    if (PS_SUPPORTED) {
      SUPPORTED_ALGS.splice(3, 0, "PS256", "PS384", "PS512");
    }
    var sign_options_schema = {
      expiresIn: { isValid: function(value) {
        return isInteger(value) || isString(value) && value;
      }, message: '"expiresIn" should be a number of seconds or string representing a timespan' },
      notBefore: { isValid: function(value) {
        return isInteger(value) || isString(value) && value;
      }, message: '"notBefore" should be a number of seconds or string representing a timespan' },
      audience: { isValid: function(value) {
        return isString(value) || Array.isArray(value);
      }, message: '"audience" must be a string or array' },
      algorithm: { isValid: includes.bind(null, SUPPORTED_ALGS), message: '"algorithm" must be a valid string enum value' },
      header: { isValid: isPlainObject, message: '"header" must be an object' },
      encoding: { isValid: isString, message: '"encoding" must be a string' },
      issuer: { isValid: isString, message: '"issuer" must be a string' },
      subject: { isValid: isString, message: '"subject" must be a string' },
      jwtid: { isValid: isString, message: '"jwtid" must be a string' },
      noTimestamp: { isValid: isBoolean, message: '"noTimestamp" must be a boolean' },
      keyid: { isValid: isString, message: '"keyid" must be a string' },
      mutatePayload: { isValid: isBoolean, message: '"mutatePayload" must be a boolean' },
      allowInsecureKeySizes: { isValid: isBoolean, message: '"allowInsecureKeySizes" must be a boolean' },
      allowInvalidAsymmetricKeyTypes: { isValid: isBoolean, message: '"allowInvalidAsymmetricKeyTypes" must be a boolean' }
    };
    var registered_claims_schema = {
      iat: { isValid: isNumber, message: '"iat" should be a number of seconds' },
      exp: { isValid: isNumber, message: '"exp" should be a number of seconds' },
      nbf: { isValid: isNumber, message: '"nbf" should be a number of seconds' }
    };
    function validate(schema, allowUnknown, object, parameterName) {
      if (!isPlainObject(object)) {
        throw new Error('Expected "' + parameterName + '" to be a plain object.');
      }
      Object.keys(object).forEach(function(key) {
        const validator = schema[key];
        if (!validator) {
          if (!allowUnknown) {
            throw new Error('"' + key + '" is not allowed in "' + parameterName + '"');
          }
          return;
        }
        if (!validator.isValid(object[key])) {
          throw new Error(validator.message);
        }
      });
    }
    function validateOptions(options) {
      return validate(sign_options_schema, false, options, "options");
    }
    function validatePayload(payload) {
      return validate(registered_claims_schema, true, payload, "payload");
    }
    var options_to_payload = {
      "audience": "aud",
      "issuer": "iss",
      "subject": "sub",
      "jwtid": "jti"
    };
    var options_for_objects = [
      "expiresIn",
      "notBefore",
      "noTimestamp",
      "audience",
      "issuer",
      "subject",
      "jwtid"
    ];
    module2.exports = function(payload, secretOrPrivateKey, options, callback) {
      if (typeof options === "function") {
        callback = options;
        options = {};
      } else {
        options = options || {};
      }
      const isObjectPayload = typeof payload === "object" && !Buffer.isBuffer(payload);
      const header = Object.assign({
        alg: options.algorithm || "HS256",
        typ: isObjectPayload ? "JWT" : void 0,
        kid: options.keyid
      }, options.header);
      function failure(err) {
        if (callback) {
          return callback(err);
        }
        throw err;
      }
      if (!secretOrPrivateKey && options.algorithm !== "none") {
        return failure(new Error("secretOrPrivateKey must have a value"));
      }
      if (secretOrPrivateKey != null && !(secretOrPrivateKey instanceof KeyObject)) {
        try {
          secretOrPrivateKey = createPrivateKey(secretOrPrivateKey);
        } catch (_) {
          try {
            secretOrPrivateKey = createSecretKey(typeof secretOrPrivateKey === "string" ? Buffer.from(secretOrPrivateKey) : secretOrPrivateKey);
          } catch (_2) {
            return failure(new Error("secretOrPrivateKey is not valid key material"));
          }
        }
      }
      if (header.alg.startsWith("HS") && secretOrPrivateKey.type !== "secret") {
        return failure(new Error(`secretOrPrivateKey must be a symmetric key when using ${header.alg}`));
      } else if (/^(?:RS|PS|ES)/.test(header.alg)) {
        if (secretOrPrivateKey.type !== "private") {
          return failure(new Error(`secretOrPrivateKey must be an asymmetric key when using ${header.alg}`));
        }
        if (!options.allowInsecureKeySizes && !header.alg.startsWith("ES") && secretOrPrivateKey.asymmetricKeyDetails !== void 0 && //KeyObject.asymmetricKeyDetails is supported in Node 15+
        secretOrPrivateKey.asymmetricKeyDetails.modulusLength < 2048) {
          return failure(new Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${header.alg}`));
        }
      }
      if (typeof payload === "undefined") {
        return failure(new Error("payload is required"));
      } else if (isObjectPayload) {
        try {
          validatePayload(payload);
        } catch (error) {
          return failure(error);
        }
        if (!options.mutatePayload) {
          payload = Object.assign({}, payload);
        }
      } else {
        const invalid_options = options_for_objects.filter(function(opt) {
          return typeof options[opt] !== "undefined";
        });
        if (invalid_options.length > 0) {
          return failure(new Error("invalid " + invalid_options.join(",") + " option for " + typeof payload + " payload"));
        }
      }
      if (typeof payload.exp !== "undefined" && typeof options.expiresIn !== "undefined") {
        return failure(new Error('Bad "options.expiresIn" option the payload already has an "exp" property.'));
      }
      if (typeof payload.nbf !== "undefined" && typeof options.notBefore !== "undefined") {
        return failure(new Error('Bad "options.notBefore" option the payload already has an "nbf" property.'));
      }
      try {
        validateOptions(options);
      } catch (error) {
        return failure(error);
      }
      if (!options.allowInvalidAsymmetricKeyTypes) {
        try {
          validateAsymmetricKey(header.alg, secretOrPrivateKey);
        } catch (error) {
          return failure(error);
        }
      }
      const timestamp = payload.iat || Math.floor(Date.now() / 1e3);
      if (options.noTimestamp) {
        delete payload.iat;
      } else if (isObjectPayload) {
        payload.iat = timestamp;
      }
      if (typeof options.notBefore !== "undefined") {
        try {
          payload.nbf = timespan(options.notBefore, timestamp);
        } catch (err) {
          return failure(err);
        }
        if (typeof payload.nbf === "undefined") {
          return failure(new Error('"notBefore" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60'));
        }
      }
      if (typeof options.expiresIn !== "undefined" && typeof payload === "object") {
        try {
          payload.exp = timespan(options.expiresIn, timestamp);
        } catch (err) {
          return failure(err);
        }
        if (typeof payload.exp === "undefined") {
          return failure(new Error('"expiresIn" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60'));
        }
      }
      Object.keys(options_to_payload).forEach(function(key) {
        const claim = options_to_payload[key];
        if (typeof options[key] !== "undefined") {
          if (typeof payload[claim] !== "undefined") {
            return failure(new Error('Bad "options.' + key + '" option. The payload already has an "' + claim + '" property.'));
          }
          payload[claim] = options[key];
        }
      });
      const encoding = options.encoding || "utf8";
      if (typeof callback === "function") {
        callback = callback && once(callback);
        jws.createSign({
          header,
          privateKey: secretOrPrivateKey,
          payload,
          encoding
        }).once("error", callback).once("done", function(signature) {
          if (!options.allowInsecureKeySizes && /^(?:RS|PS)/.test(header.alg) && signature.length < 256) {
            return callback(new Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${header.alg}`));
          }
          callback(null, signature);
        });
      } else {
        let signature = jws.sign({ header, payload, secret: secretOrPrivateKey, encoding });
        if (!options.allowInsecureKeySizes && /^(?:RS|PS)/.test(header.alg) && signature.length < 256) {
          throw new Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${header.alg}`);
        }
        return signature;
      }
    };
  }
});

// node_modules/jsonwebtoken/index.js
var require_jsonwebtoken = __commonJS({
  "node_modules/jsonwebtoken/index.js"(exports2, module2) {
    module2.exports = {
      verify: require_verify(),
      sign: require_sign(),
      JsonWebTokenError: require_JsonWebTokenError(),
      NotBeforeError: require_NotBeforeError(),
      TokenExpiredError: require_TokenExpiredError()
    };
    Object.defineProperty(module2.exports, "decode", {
      enumerable: false,
      value: require_decode()
    });
  }
});

// plugins/zhao-auth/server/src/permissions.ts
var permissions_exports = {};
__export(permissions_exports, {
  DEFAULT_ROLE_PERMISSIONS: () => DEFAULT_ROLE_PERMISSIONS,
  MODULE_MANAGER_MAP: () => MODULE_MANAGER_MAP,
  PERMISSION_TREE: () => PERMISSION_TREE,
  ROLES: () => ROLES,
  ROLE_LABELS: () => ROLE_LABELS,
  centerEditorPermissions: () => centerEditorPermissions,
  centerPermissions: () => centerPermissions,
  expandPermissionKeys: () => expandPermissionKeys,
  flattenPermissions: () => flattenPermissions,
  getPermissionLabel: () => getPermissionLabel
});
function flattenPermissions(tree) {
  const keys = [];
  for (const [key, item] of Object.entries(tree)) {
    keys.push(key);
    if (item.children) {
      keys.push(...flattenPermissions(item.children));
    }
  }
  return keys;
}
function centerPermissions(centerKey) {
  const center = PERMISSION_TREE[centerKey];
  if (!center?.children) return [];
  return [centerKey, ...flattenPermissions(center.children)];
}
function centerEditorPermissions(centerKey) {
  return centerPermissions(centerKey).filter(
    (k) => !k.endsWith(".delete") && !k.endsWith(".manage")
  );
}
function expandPermissionKeys(keys, tree = PERMISSION_TREE) {
  const expanded = /* @__PURE__ */ new Set();
  const findAndExpand = (key, nodes) => {
    for (const [k, item] of Object.entries(nodes)) {
      if (k === key) {
        expanded.add(k);
        if (item.children && item.type !== "menu") {
          flattenPermissions(item.children).forEach(
            (ck) => expanded.add(ck)
          );
        }
        return true;
      }
      if (item.children && findAndExpand(key, item.children)) {
        return true;
      }
    }
    return false;
  };
  keys.forEach((key) => findAndExpand(key, tree));
  return Array.from(expanded);
}
function getPermissionLabel(key, tree = PERMISSION_TREE) {
  for (const [k, item] of Object.entries(tree)) {
    if (k === key) return item.label;
    if (item.children) {
      const found = getPermissionLabel(key, item.children);
      if (found) return found;
    }
  }
  return null;
}
var ROLES, MODULE_MANAGER_MAP, ROLE_LABELS, PERMISSION_TREE, DEFAULT_ROLE_PERMISSIONS;
var init_permissions = __esm({
  "plugins/zhao-auth/server/src/permissions.ts"() {
    ROLES = {
      ADMIN: "admin",
      CHANNEL_ADMIN: "channel-admin",
      PLUGIN_MANAGER: "plugin-manager",
      INSTRUCTOR: "instructor",
      USER: "user",
      // 11 个中心 × 2 = 22 个新角色
      WEBSITE_MANAGER: "website-manager",
      WEBSITE_EDITOR: "website-editor",
      LOGISTICS_MANAGER: "logistics-manager",
      LOGISTICS_EDITOR: "logistics-editor",
      COURSE_MANAGER: "course-manager",
      COURSE_EDITOR: "course-editor",
      STUDY_MANAGER: "study-manager",
      STUDY_EDITOR: "study-editor",
      QUIZ_MANAGER: "quiz-manager",
      QUIZ_EDITOR: "quiz-editor",
      POINT_MANAGER: "point-manager",
      POINT_EDITOR: "point-editor",
      MARKETING_MANAGER: "marketing-manager",
      MARKETING_EDITOR: "marketing-editor",
      SYSTEM_MANAGER: "system-manager",
      SYSTEM_EDITOR: "system-editor",
      TAG_MANAGER: "tag-manager",
      TAG_EDITOR: "tag-editor",
      STUDIO_MANAGER: "studio-manager",
      STUDIO_EDITOR: "studio-editor",
      WEALTH_MANAGER: "wealth-manager",
      WEALTH_EDITOR: "wealth-editor"
    };
    MODULE_MANAGER_MAP = {
      website: ROLES.WEBSITE_MANAGER,
      logistics: ROLES.LOGISTICS_MANAGER,
      studio: ROLES.STUDIO_MANAGER,
      points: ROLES.POINT_MANAGER,
      course: ROLES.COURSE_MANAGER,
      quiz: ROLES.QUIZ_MANAGER,
      sso: ROLES.SYSTEM_MANAGER,
      thirdParty: ROLES.SYSTEM_MANAGER,
      oss: ROLES.SYSTEM_MANAGER
    };
    ROLE_LABELS = {
      [ROLES.ADMIN]: "\u7CFB\u7EDF\u7BA1\u7406\u5458",
      [ROLES.CHANNEL_ADMIN]: "\u6E20\u9053\u7BA1\u7406\u5458",
      [ROLES.PLUGIN_MANAGER]: "\u63D2\u4EF6\u7BA1\u7406\u5458",
      [ROLES.INSTRUCTOR]: "\u8BB2\u5E08",
      [ROLES.USER]: "\u666E\u901A\u7528\u6237",
      [ROLES.WEBSITE_MANAGER]: "\u5B98\u7F51\u7BA1\u7406\u5458",
      [ROLES.WEBSITE_EDITOR]: "\u5B98\u7F51\u7F16\u8F91",
      [ROLES.LOGISTICS_MANAGER]: "\u7269\u6D41\u7BA1\u7406\u5458",
      [ROLES.LOGISTICS_EDITOR]: "\u7269\u6D41\u7F16\u8F91",
      [ROLES.COURSE_MANAGER]: "\u8BFE\u7A0B\u7BA1\u7406\u5458",
      [ROLES.COURSE_EDITOR]: "\u8BFE\u7A0B\u7F16\u8F91",
      [ROLES.STUDY_MANAGER]: "\u5B66\u4E60\u6570\u636E\u7BA1\u7406\u5458",
      [ROLES.STUDY_EDITOR]: "\u5B66\u4E60\u6570\u636E\u7F16\u8F91",
      [ROLES.QUIZ_MANAGER]: "\u9898\u5E93\u7BA1\u7406\u5458",
      [ROLES.QUIZ_EDITOR]: "\u9898\u5E93\u7F16\u8F91",
      [ROLES.POINT_MANAGER]: "\u79EF\u5206\u7BA1\u7406\u5458",
      [ROLES.POINT_EDITOR]: "\u79EF\u5206\u7F16\u8F91",
      [ROLES.MARKETING_MANAGER]: "\u8425\u9500\u7BA1\u7406\u5458",
      [ROLES.MARKETING_EDITOR]: "\u8425\u9500\u7F16\u8F91",
      [ROLES.SYSTEM_MANAGER]: "\u7CFB\u7EDF\u7BA1\u7406\u5458(\u4E2D\u5FC3)",
      [ROLES.SYSTEM_EDITOR]: "\u7CFB\u7EDF\u7F16\u8F91",
      [ROLES.TAG_MANAGER]: "\u6807\u7B7E\u7BA1\u7406\u5458",
      [ROLES.TAG_EDITOR]: "\u6807\u7B7E\u7F16\u8F91",
      [ROLES.STUDIO_MANAGER]: "\u5DE5\u4F5C\u5BA4\u7BA1\u7406\u5458",
      [ROLES.STUDIO_EDITOR]: "\u5DE5\u4F5C\u5BA4\u7F16\u8F91",
      [ROLES.WEALTH_MANAGER]: "\u7406\u8D22\u7BA1\u7406\u5458",
      [ROLES.WEALTH_EDITOR]: "\u7406\u8D22\u7F16\u8F91"
    };
    PERMISSION_TREE = {
      "auth": {
        label: "\u8BA4\u8BC1\u6743\u9650",
        type: "menu",
        children: {
          "auth.admin-login": { label: "\u540E\u53F0\u767B\u5F55", type: "button" }
        }
      },
      "menu.course-center": {
        label: "\u8BFE\u7A0B\u4E2D\u5FC3",
        type: "menu",
        children: {
          "menu.course": {
            label: "\u8BFE\u7A0B\u7BA1\u7406",
            type: "menu",
            children: {
              "course.read": { label: "\u67E5\u770B\u8BFE\u7A0B", type: "button" },
              "course.create": { label: "\u65B0\u589E\u8BFE\u7A0B", type: "button" },
              "course.update": { label: "\u7F16\u8F91\u8BFE\u7A0B", type: "button" },
              "course.publish": { label: "\u53D1\u5E03\u8BFE\u7A0B", type: "button" },
              "course.delete": { label: "\u5220\u9664\u8BFE\u7A0B", type: "button" }
            }
          },
          "menu.lesson": {
            label: "\u8BFE\u65F6\u7BA1\u7406",
            type: "menu",
            children: {
              "lesson.read": { label: "\u67E5\u770B\u8BFE\u65F6", type: "button" },
              "lesson.create": { label: "\u65B0\u589E\u8BFE\u65F6", type: "button" },
              "lesson.update": { label: "\u7F16\u8F91\u8BFE\u65F6", type: "button" },
              "lesson.delete": { label: "\u5220\u9664\u8BFE\u65F6", type: "button" }
            }
          },
          "menu.category": {
            label: "\u8BFE\u7A0B\u5206\u7C7B",
            type: "menu",
            children: {
              "course-category.read": { label: "\u67E5\u770B\u5206\u7C7B", type: "button" },
              "course-category.create": { label: "\u65B0\u589E\u5206\u7C7B", type: "button" },
              "course-category.update": { label: "\u7F16\u8F91\u5206\u7C7B", type: "button" },
              "course-category.delete": { label: "\u5220\u9664\u5206\u7C7B", type: "button" }
            }
          },
          "menu.auth": {
            label: "\u7528\u6237\u6388\u6743",
            type: "menu",
            children: {
              "user-course.read": { label: "\u67E5\u770B\u6388\u6743", type: "button" },
              "user-course.grant": { label: "\u6388\u6743\u7BA1\u7406", type: "button" }
            }
          }
        }
      },
      "menu.study-center": {
        label: "\u5B66\u4E60\u6570\u636E",
        type: "menu",
        children: {
          "menu.progress": {
            label: "\u8BFE\u7A0B\u8FDB\u5EA6",
            type: "menu",
            children: {
              "course-progress.read": { label: "\u67E5\u770B\u8BFE\u7A0B\u8FDB\u5EA6", type: "button" },
              "course-progress.update": { label: "\u66F4\u65B0\u8BFE\u7A0B\u8FDB\u5EA6", type: "button" }
            }
          },
          "menu.lesson-progress": {
            label: "\u8BFE\u65F6\u8FDB\u5EA6",
            type: "menu",
            children: {
              "lesson-progress.read": { label: "\u67E5\u770B\u8BFE\u65F6\u8FDB\u5EA6", type: "button" },
              "lesson-progress.update": { label: "\u66F4\u65B0\u8BFE\u65F6\u8FDB\u5EA6", type: "button" }
            }
          }
        }
      },
      "menu.quiz-center": {
        label: "\u9898\u5E93\u7CFB\u7EDF",
        type: "menu",
        children: {
          "menu.quiz": {
            label: "\u9898\u5E93\u7BA1\u7406",
            type: "menu",
            children: {
              "quiz.read": { label: "\u67E5\u770B\u9898\u76EE", type: "button" },
              "quiz.create": { label: "\u65B0\u589E\u9898\u76EE", type: "button" },
              "quiz.update": { label: "\u7F16\u8F91\u9898\u76EE", type: "button" },
              "quiz.delete": { label: "\u5220\u9664\u9898\u76EE", type: "button" }
            }
          },
          "menu.exam": {
            label: "\u8003\u8BD5\u7BA1\u7406",
            type: "menu",
            children: {
              "exam.read": { label: "\u67E5\u770B\u8003\u8BD5", type: "button" },
              "exam.create": { label: "\u65B0\u589E\u8003\u8BD5", type: "button" },
              "exam.update": { label: "\u7F16\u8F91\u8003\u8BD5", type: "button" },
              "exam.delete": { label: "\u5220\u9664\u8003\u8BD5", type: "button" },
              "quiz.exam-attempt.read": { label: "\u67E5\u770B\u8003\u8BD5\u8BB0\u5F55", type: "button" },
              "quiz.exam-attempt.delete": { label: "\u5220\u9664\u8003\u8BD5\u8BB0\u5F55", type: "button" }
            }
          },
          "menu.quiz-record": {
            label: "\u7B54\u9898\u8BB0\u5F55",
            type: "menu",
            children: {
              "quiz-record.read": { label: "\u67E5\u770B\u7B54\u9898\u8BB0\u5F55", type: "button" }
            }
          },
          "menu.quiz-batch": {
            label: "\u6279\u91CF\u8003\u8BD5",
            type: "menu",
            children: {
              "quiz.quiz-batch.read": { label: "\u67E5\u770B", type: "button" },
              "quiz.quiz-batch.create": { label: "\u521B\u5EFA", type: "button" },
              "quiz.quiz-batch.delete": { label: "\u5220\u9664", type: "button" }
            }
          }
        }
      },
      "menu.point-center": {
        label: "\u79EF\u5206\u4F53\u7CFB",
        type: "menu",
        children: {
          "menu.point-type": {
            label: "\u79EF\u5206\u7C7B\u578B",
            type: "menu",
            children: {
              "point-type.read": { label: "\u67E5\u770B\u79EF\u5206\u7C7B\u578B", type: "button" },
              "point-type.create": { label: "\u65B0\u589E\u79EF\u5206\u7C7B\u578B", type: "button" },
              "point-type.update": { label: "\u7F16\u8F91\u79EF\u5206\u7C7B\u578B", type: "button" },
              "point-type.delete": { label: "\u5220\u9664\u79EF\u5206\u7C7B\u578B", type: "button" }
            }
          },
          "menu.point-rule": {
            label: "\u79EF\u5206\u89C4\u5219",
            type: "menu",
            children: {
              "point-rule.read": { label: "\u67E5\u770B\u89C4\u5219", type: "button" },
              "point-rule.create": { label: "\u65B0\u589E\u89C4\u5219", type: "button" },
              "point-rule.update": { label: "\u7F16\u8F91\u89C4\u5219", type: "button" },
              "point-rule.delete": { label: "\u5220\u9664\u89C4\u5219", type: "button" }
            }
          },
          "menu.point-record": {
            label: "\u79EF\u5206\u8BB0\u5F55",
            type: "menu",
            children: {
              "point-record.read": { label: "\u67E5\u770B\u8BB0\u5F55", type: "button" }
            }
          },
          "menu.product": {
            label: "\u79EF\u5206\u4EA7\u54C1",
            type: "menu",
            children: {
              "point-product.read": { label: "\u67E5\u770B\u4EA7\u54C1", type: "button" },
              "point-product.create": { label: "\u65B0\u589E\u4EA7\u54C1", type: "button" },
              "point-product.update": { label: "\u7F16\u8F91\u4EA7\u54C1", type: "button" },
              "point-product.delete": { label: "\u5220\u9664\u4EA7\u54C1", type: "button" }
            }
          },
          "menu.exchange": {
            label: "\u5151\u6362\u8BB0\u5F55",
            type: "menu",
            children: {
              "point-exchange.read": { label: "\u67E5\u770B\u5151\u6362", type: "button" }
            }
          },
          "menu.point-stat": {
            label: "\u79EF\u5206\u7EDF\u8BA1",
            type: "menu",
            children: {
              "point-dashboard.read": { label: "\u67E5\u770B\u7EDF\u8BA1", type: "button" }
            }
          },
          "menu.point-config": {
            label: "\u79EF\u5206\u914D\u7F6E",
            type: "menu",
            children: {
              "point-config.read": { label: "\u67E5\u770B\u914D\u7F6E", type: "button" },
              "point-config.update": { label: "\u4FEE\u6539\u914D\u7F6E", type: "button" }
            }
          },
          "menu.pickup-location": {
            label: "\u81EA\u63D0\u70B9",
            type: "menu",
            children: {
              "pickup-location.read": { label: "\u67E5\u770B\u81EA\u63D0\u70B9", type: "button" },
              "pickup-location.create": { label: "\u65B0\u589E\u81EA\u63D0\u70B9", type: "button" },
              "pickup-location.update": { label: "\u7F16\u8F91\u81EA\u63D0\u70B9", type: "button" },
              "pickup-location.delete": { label: "\u5220\u9664\u81EA\u63D0\u70B9", type: "button" }
            }
          },
          "menu.point-verification": {
            label: "\u79EF\u5206\u6838\u9500",
            type: "menu",
            children: {
              "point-verification.read": { label: "\u67E5\u770B\u6838\u9500\u8BB0\u5F55", type: "button" }
            }
          },
          "menu.point-rule-template": {
            label: "\u89C4\u5219\u6A21\u677F",
            type: "menu",
            children: {
              "point.rule-template.read": { label: "\u67E5\u770B", type: "button" },
              "point.rule-template.create": { label: "\u521B\u5EFA", type: "button" },
              "point.rule-template.update": { label: "\u7F16\u8F91", type: "button" },
              "point.rule-template.delete": { label: "\u5220\u9664", type: "button" }
            }
          },
          "menu.point-sign-in": {
            label: "\u7B7E\u5230\u8BB0\u5F55",
            type: "menu",
            children: {
              "point.sign-in-record.read": { label: "\u67E5\u770B", type: "button" },
              "point.sign-in-record.export": { label: "\u5BFC\u51FA", type: "button" }
            }
          }
        }
      },
      "menu.marketing-center": {
        label: "\u8425\u9500\u8FD0\u8425",
        type: "menu",
        children: {
          "menu.channel": {
            label: "\u6E20\u9053\u7BA1\u7406",
            type: "menu",
            children: {
              "channel.read": { label: "\u67E5\u770B\u6E20\u9053", type: "button" },
              "channel.create": { label: "\u65B0\u589E\u6E20\u9053", type: "button" },
              "channel.update": { label: "\u7F16\u8F91\u6E20\u9053", type: "button" },
              "channel.delete": { label: "\u5220\u9664\u6E20\u9053", type: "button" },
              "channel.config.update": { label: "\u4FEE\u6539\u6E20\u9053\u914D\u7F6E", type: "button" }
            }
          },
          "menu.network": {
            label: "\u6E20\u9053\u7F51\u7EDC",
            type: "menu",
            children: {
              "network.view": { label: "\u67E5\u770B\u7F51\u7EDC", type: "button" }
            }
          },
          "menu.members": {
            label: "\u6210\u5458\u7BA1\u7406",
            type: "menu",
            children: {
              "channel-member.read": { label: "\u67E5\u770B\u6210\u5458", type: "button" },
              "channel-member.add": { label: "\u9080\u8BF7\u6210\u5458", type: "button" },
              "channel-member.remove": { label: "\u79FB\u9664\u6210\u5458", type: "button" }
            }
          },
          "menu.invite": {
            label: "\u5206\u9500\u9080\u8BF7",
            type: "menu",
            children: {
              "user-invite.send": { label: "\u521B\u5EFA\u9080\u8BF7", type: "button" },
              "user-invite.validate": { label: "\u4F7F\u7528\u9080\u8BF7", type: "button" }
            }
          },
          "menu.channel-permission": {
            label: "\u6E20\u9053\u6743\u9650",
            type: "menu",
            children: {
              "channel-permission.set": { label: "\u6388\u6743\u6E20\u9053", type: "button" },
              "channel.user-channel.read": { label: "\u67E5\u770B\u7528\u6237\u6E20\u9053", type: "button" },
              "channel.user-channel.assign": { label: "\u5206\u914D\u6E20\u9053", type: "button" },
              "channel.user-channel.revoke": { label: "\u64A4\u9500\u6E20\u9053", type: "button" }
            }
          },
          "menu.redemption-code": {
            label: "\u5151\u6362\u7801",
            type: "menu",
            children: {
              "redemption-code.create": { label: "\u521B\u5EFA\u5151\u6362\u7801", type: "button" },
              "redemption-code.delete": { label: "\u5220\u9664\u5151\u6362\u7801", type: "button" }
            }
          },
          "menu.redemption-record": {
            label: "\u5151\u6362\u8BB0\u5F55",
            type: "menu",
            children: {
              "redemption-record.review": { label: "\u5BA1\u6838\u5151\u6362", type: "button" }
            }
          }
        }
      },
      "menu.system-center": {
        label: "\u7CFB\u7EDF\u5DE5\u5177",
        type: "menu",
        children: {
          "menu.media": {
            label: "\u5A92\u4F53\u8D44\u6E90",
            type: "menu",
            children: {
              "oss.media-meta.read": { label: "\u67E5\u770B\u5A92\u4F53", type: "button" },
              "oss.media-meta.upload": { label: "\u4E0A\u4F20\u5A92\u4F53", type: "button" },
              "oss.media-meta.delete": { label: "\u5220\u9664\u5A92\u4F53", type: "button" }
            }
          },
          "menu.soft-delete": {
            label: "\u56DE\u6536\u7AD9",
            type: "menu",
            children: {
              "soft-delete.read": { label: "\u67E5\u770B\u56DE\u6536\u7AD9", type: "button" },
              "soft-delete.manage": { label: "\u7BA1\u7406\u56DE\u6536\u7AD9", type: "button" }
            }
          },
          "menu.feature-flag": {
            label: "\u529F\u80FD\u5F00\u5173",
            type: "menu",
            children: {
              "feature-flag.update": { label: "\u4FEE\u6539\u7C97\u7C92\u5EA6\u5F00\u5173", type: "button" },
              "config.feature.update": { label: "\u4FEE\u6539\u7EC6\u7C92\u5EA6\u914D\u7F6E", type: "button" }
            }
          },
          "menu.site-config": {
            label: "\u7AD9\u70B9\u914D\u7F6E",
            type: "menu",
            children: {
              "config.read": { label: "\u67E5\u770B\u914D\u7F6E", type: "button" },
              "config.create": { label: "\u65B0\u589E\u914D\u7F6E", type: "button" },
              "config.update": { label: "\u4FEE\u6539\u914D\u7F6E", type: "button" },
              "config.delete": { label: "\u5220\u9664\u914D\u7F6E", type: "button" },
              "site-config.update": { label: "\u4FEE\u6539\u7AD9\u70B9\u914D\u7F6E", type: "button" }
            }
          },
          "menu.verification": { label: "\u9A8C\u8BC1\u8BB0\u5F55", type: "menu" },
          "menu.user-roles": {
            label: "\u7528\u6237\u89D2\u8272",
            type: "menu",
            children: {
              "role.assign": { label: "\u5206\u914D\u89D2\u8272", type: "button" },
              "role.revoke": { label: "\u64A4\u9500\u89D2\u8272", type: "button" },
              "role.create": { label: "\u65B0\u589E\u89D2\u8272", type: "button" },
              "role.read": { label: "\u67E5\u770B\u89D2\u8272", type: "button" },
              "role.read-logs": { label: "\u67E5\u770B\u89D2\u8272\u65E5\u5FD7", type: "button" }
            }
          },
          "menu.global-config": {
            label: "\u5168\u5C40\u914D\u7F6E",
            type: "menu",
            children: {
              "global-config.read": { label: "\u67E5\u770B\u5168\u5C40\u914D\u7F6E", type: "button" },
              "global-config.update": { label: "\u4FEE\u6539\u5168\u5C40\u914D\u7F6E", type: "button" }
            }
          },
          "menu.module-visibility": {
            label: "\u6A21\u5757\u53EF\u89C1\u6027\u914D\u7F6E",
            type: "menu",
            children: {}
          },
          "menu.permissions": {
            label: "\u6743\u9650\u7BA1\u7406",
            type: "menu",
            children: {
              "permissions.read": { label: "\u67E5\u770B\u6743\u9650", type: "button" },
              "permissions.update": { label: "\u66F4\u65B0\u6743\u9650", type: "button" }
            }
          },
          "menu.role-logs": { label: "\u64CD\u4F5C\u65E5\u5FD7", type: "menu" },
          "menu.oss": {
            label: "OSS \u7BA1\u7406",
            type: "menu",
            children: {
              "oss.read": { label: "\u67E5\u770B OSS", type: "button" },
              "oss.upload": { label: "\u4E0A\u4F20\u6587\u4EF6", type: "button" },
              "oss.delete": { label: "\u5220\u9664\u6587\u4EF6", type: "button" },
              "oss.dashboard": { label: "\u67E5\u770B\u4EEA\u8868\u76D8", type: "button" },
              "oss.record": { label: "\u67E5\u770B\u540C\u6B65\u8BB0\u5F55", type: "button" },
              "oss.settings": { label: "\u4FEE\u6539\u5B58\u50A8\u8BBE\u7F6E", type: "button" }
            }
          },
          "menu.third": {
            label: "\u4E09\u65B9\u914D\u7F6E",
            type: "menu",
            children: {
              "third-party-config.read": { label: "\u67E5\u770B\u914D\u7F6E", type: "button" },
              "third-party-config.create": { label: "\u65B0\u589E\u914D\u7F6E", type: "button" },
              "third-party-config.update": { label: "\u7F16\u8F91\u914D\u7F6E", type: "button" },
              "third-party-config.delete": { label: "\u5220\u9664\u914D\u7F6E", type: "button" },
              "third-party-account.read": { label: "\u67E5\u770B\u7ED1\u5B9A\u8D26\u53F7", type: "button" },
              "third-party-account.delete": { label: "\u89E3\u7ED1\u8D26\u53F7", type: "button" }
            }
          },
          "menu.sso": {
            label: "SSO \u7BA1\u7406",
            type: "menu",
            children: {
              "sso.dashboard": { label: "\u67E5\u770B\u4EEA\u8868\u76D8", type: "button" },
              "sso.user-read": { label: "\u67E5\u770B\u7528\u6237", type: "button" },
              "sso.user-update": { label: "\u7F16\u8F91\u7528\u6237", type: "button" },
              "sso.app-read": { label: "\u67E5\u770B\u5E94\u7528", type: "button" },
              "sso.app-create": { label: "\u521B\u5EFA\u5E94\u7528", type: "button" },
              "sso.app-update": { label: "\u7F16\u8F91\u5E94\u7528", type: "button" },
              "sso.channel-read": { label: "\u67E5\u770B\u6E20\u9053", type: "button" },
              "sso.channel-create": { label: "\u521B\u5EFA\u6E20\u9053", type: "button" },
              "sso.channel-update": { label: "\u7F16\u8F91\u6E20\u9053", type: "button" },
              "sso.log-read": { label: "\u67E5\u770B\u65E5\u5FD7", type: "button" },
              "menu.sso-binding": {
                label: "\u4E09\u65B9\u7ED1\u5B9A",
                type: "menu",
                children: {
                  "sso.third-party-binding.read": { label: "\u67E5\u770B\u4E09\u65B9\u7ED1\u5B9A", type: "button" },
                  "sso.third-party-binding.create": { label: "\u521B\u5EFA\u7ED1\u5B9A", type: "button" },
                  "sso.third-party-binding.update": { label: "\u7F16\u8F91\u7ED1\u5B9A", type: "button" },
                  "sso.third-party-binding.delete": { label: "\u5220\u9664\u7ED1\u5B9A", type: "button" },
                  "sso.oauth-config.read": { label: "\u67E5\u770BOAuth\u914D\u7F6E", type: "button" },
                  "sso.oauth-config.create": { label: "\u521B\u5EFAOAuth\u914D\u7F6E", type: "button" },
                  "sso.oauth-config.update": { label: "\u7F16\u8F91OAuth\u914D\u7F6E", type: "button" },
                  "sso.oauth-config.delete": { label: "\u5220\u9664OAuth\u914D\u7F6E", type: "button" }
                }
              },
              "menu.sso-token": {
                label: "\u4EE4\u724C\u7BA1\u7406",
                type: "menu",
                children: {
                  "sso.token.read": { label: "\u67E5\u770B\u4EE4\u724C", type: "button" },
                  "sso.token.delete": { label: "\u5220\u9664\u4EE4\u724C", type: "button" },
                  "sso.auth-code.read": { label: "\u67E5\u770B\u6388\u6743\u7801", type: "button" },
                  "sso.auth-code.delete": { label: "\u5220\u9664\u6388\u6743\u7801", type: "button" }
                }
              },
              "menu.sso-user-role": {
                label: "\u7528\u6237\u5E94\u7528\u89D2\u8272",
                type: "menu",
                children: {
                  "sso.user-app-role.read": { label: "\u67E5\u770B\u89D2\u8272", type: "button" },
                  "sso.user-app-role.create": { label: "\u5206\u914D\u89D2\u8272", type: "button" },
                  "sso.user-app-role.update": { label: "\u7F16\u8F91\u89D2\u8272", type: "button" },
                  "sso.user-app-role.delete": { label: "\u5220\u9664\u89D2\u8272", type: "button" }
                }
              },
              "menu.sso-invite": {
                label: "\u9080\u8BF7\u4F53\u7CFB",
                type: "menu",
                children: {
                  "sso.invite-code.read": { label: "\u67E5\u770B\u9080\u8BF7\u7801", type: "button" },
                  "sso.invite-code.create": { label: "\u521B\u5EFA\u9080\u8BF7\u7801", type: "button" },
                  "sso.invite-code.delete": { label: "\u5220\u9664\u9080\u8BF7\u7801", type: "button" },
                  "sso.invite-code.validate": { label: "\u6838\u9500\u9080\u8BF7\u7801", type: "button" },
                  "sso.invite-usage.read": { label: "\u67E5\u770B\u4F7F\u7528\u8BB0\u5F55", type: "button" },
                  "sso.invite-usage.delete": { label: "\u5220\u9664\u4F7F\u7528\u8BB0\u5F55", type: "button" },
                  "sso.invite-stats.read": { label: "\u67E5\u770B\u9080\u8BF7\u7EDF\u8BA1", type: "button" },
                  "sso.referral-relation.read": { label: "\u67E5\u770B\u63A8\u8350\u5173\u7CFB", type: "button" },
                  "sso.referral-relation.delete": { label: "\u5220\u9664\u63A8\u8350\u5173\u7CFB", type: "button" }
                }
              },
              "menu.sso-sms": {
                label: "\u77ED\u4FE1\u9A8C\u8BC1",
                type: "menu",
                children: {
                  "sso.sms-code.read": { label: "\u67E5\u770B\u77ED\u4FE1\u7801", type: "button" },
                  "sso.sms-code.delete": { label: "\u5220\u9664\u77ED\u4FE1\u7801", type: "button" }
                }
              }
            }
          },
          "menu.tenant": {
            label: "\u79DF\u6237\u7BA1\u7406",
            type: "menu",
            children: {
              "tenant.read": { label: "\u67E5\u770B\u79DF\u6237", type: "button" },
              "tenant.create": { label: "\u65B0\u5EFA\u79DF\u6237", type: "button" },
              "tenant.update": { label: "\u7F16\u8F91\u79DF\u6237", type: "button" },
              "tenant.delete": { label: "\u5220\u9664\u79DF\u6237", type: "button" }
            }
          },
          "menu.template": {
            label: "\u6A21\u677F\u7BA1\u7406",
            type: "menu",
            children: {
              "template.read": { label: "\u67E5\u770B\u6A21\u677F", type: "button" },
              "template.create": { label: "\u65B0\u589E\u6A21\u677F", type: "button" },
              "template.update": { label: "\u7F16\u8F91\u6A21\u677F", type: "button" },
              "template.delete": { label: "\u5220\u9664\u6A21\u677F", type: "button" }
            }
          }
        }
      },
      "menu.tag-center": {
        label: "\u6807\u7B7E\u4F53\u7CFB",
        type: "menu",
        children: {
          "menu.tag": {
            label: "\u6807\u7B7E\u7BA1\u7406",
            type: "menu",
            children: {
              "tag.read": { label: "\u67E5\u770B\u6807\u7B7E", type: "button" },
              "tag.create": { label: "\u65B0\u589E\u6807\u7B7E", type: "button" },
              "tag.update": { label: "\u7F16\u8F91\u6807\u7B7E", type: "button" },
              "tag.delete": { label: "\u5220\u9664\u6807\u7B7E", type: "button" }
            }
          },
          "menu.tag-group": {
            label: "\u5206\u7EC4\u7BA1\u7406",
            type: "menu",
            children: {
              "tag-group.read": { label: "\u67E5\u770B\u5206\u7EC4", type: "button" },
              "tag-group.create": { label: "\u65B0\u589E\u5206\u7EC4", type: "button" },
              "tag-group.update": { label: "\u7F16\u8F91\u5206\u7EC4", type: "button" },
              "tag-group.delete": { label: "\u5220\u9664\u5206\u7EC4", type: "button" }
            }
          },
          "menu.knowledge": {
            label: "\u77E5\u8BC6\u70B9",
            type: "menu",
            children: {
              "knowledge-point.read": { label: "\u67E5\u770B\u77E5\u8BC6\u70B9", type: "button" },
              "knowledge-point.create": { label: "\u65B0\u589E\u77E5\u8BC6\u70B9", type: "button" },
              "knowledge-point.update": { label: "\u7F16\u8F91\u77E5\u8BC6\u70B9", type: "button" },
              "knowledge-point.delete": { label: "\u5220\u9664\u77E5\u8BC6\u70B9", type: "button" }
            }
          },
          "menu.tag-preset": { label: "\u5206\u7C7B\u9884\u8BBE", type: "menu" },
          "menu.tag-search": { label: "\u5168\u5C40\u68C0\u7D22", type: "menu" },
          "menu.tag-index": {
            label: "\u6807\u7B7E\u7D22\u5F15",
            type: "menu",
            children: {
              "tag.tag-index.read": { label: "\u67E5\u770B", type: "button" },
              "tag.tag-index.create": { label: "\u521B\u5EFA", type: "button" },
              "tag.tag-index.update": { label: "\u7F16\u8F91", type: "button" },
              "tag.tag-index.delete": { label: "\u5220\u9664", type: "button" }
            }
          }
        }
      },
      "menu.studio-center": {
        label: "\u76F4\u64AD\u5DE5\u4F5C\u5BA4",
        type: "menu",
        children: {
          "menu.studio": {
            label: "\u5DE5\u4F5C\u5BA4\u7BA1\u7406",
            type: "menu",
            children: {
              "zhao-studio.read": { label: "\u67E5\u770B\u5DE5\u4F5C\u5BA4", type: "button" },
              "zhao-studio.create": { label: "\u65B0\u589E\u5DE5\u4F5C\u5BA4", type: "button" },
              "zhao-studio.update": { label: "\u7F16\u8F91\u5DE5\u4F5C\u5BA4", type: "button" },
              "zhao-studio.delete": { label: "\u5220\u9664\u5DE5\u4F5C\u5BA4", type: "button" }
            }
          },
          "menu.studio-collect": {
            label: "\u5185\u5BB9\u91C7\u96C6",
            type: "menu",
            children: {
              "studio.article-draft.read": { label: "\u67E5\u770B\u6587\u7AE0\u8349\u7A3F", type: "button" },
              "studio.article-draft.create": { label: "\u521B\u5EFA\u8349\u7A3F", type: "button" },
              "studio.article-draft.update": { label: "\u7F16\u8F91\u8349\u7A3F", type: "button" },
              "studio.article-draft.delete": { label: "\u5220\u9664\u8349\u7A3F", type: "button" },
              "studio.collect-source.read": { label: "\u67E5\u770B\u91C7\u96C6\u6E90", type: "button" },
              "studio.collect-source.create": { label: "\u521B\u5EFA\u91C7\u96C6\u6E90", type: "button" },
              "studio.collect-source.update": { label: "\u7F16\u8F91\u91C7\u96C6\u6E90", type: "button" },
              "studio.collect-source.delete": { label: "\u5220\u9664\u91C7\u96C6\u6E90", type: "button" },
              "studio.collect-task.read": { label: "\u67E5\u770B\u91C7\u96C6\u4EFB\u52A1", type: "button" },
              "studio.collect-task.create": { label: "\u521B\u5EFA\u91C7\u96C6\u4EFB\u52A1", type: "button" },
              "studio.collect-task.update": { label: "\u7F16\u8F91\u91C7\u96C6\u4EFB\u52A1", type: "button" },
              "studio.collect-task.delete": { label: "\u5220\u9664\u91C7\u96C6\u4EFB\u52A1", type: "button" },
              "studio.knowledge-point-index.read": { label: "\u67E5\u770B\u77E5\u8BC6\u7D22\u5F15", type: "button" },
              "studio.knowledge-point-index.create": { label: "\u521B\u5EFA\u77E5\u8BC6\u7D22\u5F15", type: "button" },
              "studio.knowledge-point-index.update": { label: "\u7F16\u8F91\u77E5\u8BC6\u7D22\u5F15", type: "button" },
              "studio.knowledge-point-index.delete": { label: "\u5220\u9664\u77E5\u8BC6\u7D22\u5F15", type: "button" }
            }
          },
          "menu.studio-publish": {
            label: "\u591A\u5E73\u53F0\u53D1\u5E03",
            type: "menu",
            children: {
              "studio.publish-platform.read": { label: "\u67E5\u770B\u53D1\u5E03\u5E73\u53F0", type: "button" },
              "studio.publish-platform.create": { label: "\u521B\u5EFA\u53D1\u5E03\u5E73\u53F0", type: "button" },
              "studio.publish-platform.update": { label: "\u7F16\u8F91\u53D1\u5E03\u5E73\u53F0", type: "button" },
              "studio.publish-platform.delete": { label: "\u5220\u9664\u53D1\u5E03\u5E73\u53F0", type: "button" },
              "studio.publish-account.read": { label: "\u67E5\u770B\u53D1\u5E03\u8D26\u53F7", type: "button" },
              "studio.publish-account.create": { label: "\u521B\u5EFA\u53D1\u5E03\u8D26\u53F7", type: "button" },
              "studio.publish-account.update": { label: "\u7F16\u8F91\u53D1\u5E03\u8D26\u53F7", type: "button" },
              "studio.publish-account.delete": { label: "\u5220\u9664\u53D1\u5E03\u8D26\u53F7", type: "button" },
              "studio.publish-record.read": { label: "\u67E5\u770B\u53D1\u5E03\u8BB0\u5F55", type: "button" },
              "studio.publish-record.delete": { label: "\u5220\u9664\u53D1\u5E03\u8BB0\u5F55", type: "button" }
            }
          },
          "menu.studio-stats": {
            label: "\u6570\u636E\u5206\u6790",
            type: "menu",
            children: {
              "studio.stat-summary.read": { label: "\u67E5\u770B\u7EDF\u8BA1", type: "button" },
              "studio.stat-summary.export": { label: "\u5BFC\u51FA\u7EDF\u8BA1", type: "button" },
              "studio.browser-log.read": { label: "\u67E5\u770B\u6D4F\u89C8\u65E5\u5FD7", type: "button" },
              "studio.browser-log.export": { label: "\u5BFC\u51FA\u6D4F\u89C8\u65E5\u5FD7", type: "button" }
            }
          },
          "menu.studio-ad": {
            label: "\u5E7F\u544A\u4F4D",
            type: "menu",
            children: {
              "studio.ad-slot.read": { label: "\u67E5\u770B\u5E7F\u544A\u4F4D", type: "button" },
              "studio.ad-slot.create": { label: "\u521B\u5EFA\u5E7F\u544A\u4F4D", type: "button" },
              "studio.ad-slot.update": { label: "\u7F16\u8F91\u5E7F\u544A\u4F4D", type: "button" },
              "studio.ad-slot.delete": { label: "\u5220\u9664\u5E7F\u544A\u4F4D", type: "button" }
            }
          },
          "menu.studio-sync-event": {
            label: "\u540C\u6B65\u4E8B\u4EF6",
            type: "menu",
            children: {
              "sync-event.read": { label: "\u67E5\u770B\u540C\u6B65\u4E8B\u4EF6", type: "button" },
              "sync-event.update": { label: "\u5904\u7406\u540C\u6B65\u4E8B\u4EF6", type: "button" },
              "sync-event.manage": { label: "\u540C\u6B65\u4E8B\u4EF6\u7BA1\u7406", type: "button" }
            }
          }
        }
      },
      "menu.website-center": {
        label: "\u5B98\u7F51\u4E2D\u5FC3",
        type: "menu",
        children: {
          "menu.website-seo": {
            label: "SEO \u914D\u7F6E",
            type: "menu",
            children: {
              "seo-config.read": { label: "\u67E5\u770B SEO", type: "button" },
              "seo-config.update": { label: "\u7F16\u8F91 SEO", type: "button" }
            }
          },
          "menu.website-brand": {
            label: "\u54C1\u724C\u4FE1\u606F",
            type: "menu",
            children: {
              "brand-info.read": { label: "\u67E5\u770B\u54C1\u724C", type: "button" },
              "brand-info.update": { label: "\u7F16\u8F91\u54C1\u724C", type: "button" }
            }
          },
          "menu.website-article": {
            label: "\u6587\u7AE0\u7BA1\u7406",
            type: "menu",
            children: {
              "article.read": { label: "\u67E5\u770B\u6587\u7AE0", type: "button" },
              "article.create": { label: "\u65B0\u589E\u6587\u7AE0", type: "button" },
              "article.update": { label: "\u7F16\u8F91\u6587\u7AE0", type: "button" },
              "article.delete": { label: "\u5220\u9664\u6587\u7AE0", type: "button" },
              "article.publish": { label: "\u53D1\u5E03\u6587\u7AE0", type: "button" }
            }
          },
          "menu.website-article-category": {
            label: "\u6587\u7AE0\u5206\u7C7B",
            type: "menu",
            children: {
              "article-category.read": { label: "\u67E5\u770B\u5206\u7C7B", type: "button" },
              "article-category.create": { label: "\u65B0\u589E\u5206\u7C7B", type: "button" },
              "article-category.update": { label: "\u7F16\u8F91\u5206\u7C7B", type: "button" },
              "article-category.delete": { label: "\u5220\u9664\u5206\u7C7B", type: "button" }
            }
          },
          "menu.website-product": {
            label: "\u4EA7\u54C1\u7BA1\u7406",
            type: "menu",
            children: {
              "product.read": { label: "\u67E5\u770B\u4EA7\u54C1", type: "button" },
              "product.create": { label: "\u65B0\u589E\u4EA7\u54C1", type: "button" },
              "product.update": { label: "\u7F16\u8F91\u4EA7\u54C1", type: "button" },
              "product.delete": { label: "\u5220\u9664\u4EA7\u54C1", type: "button" }
            }
          },
          "menu.website-case": {
            label: "\u6848\u4F8B\u7BA1\u7406",
            type: "menu",
            children: {
              "case.read": { label: "\u67E5\u770B\u6848\u4F8B", type: "button" },
              "case.create": { label: "\u65B0\u589E\u6848\u4F8B", type: "button" },
              "case.update": { label: "\u7F16\u8F91\u6848\u4F8B", type: "button" },
              "case.delete": { label: "\u5220\u9664\u6848\u4F8B", type: "button" }
            }
          },
          "menu.website-compliance": {
            label: "\u5408\u89C4\u516C\u793A",
            type: "menu",
            children: {
              "compliance.read": { label: "\u67E5\u770B\u5408\u89C4", type: "button" },
              "compliance.create": { label: "\u65B0\u589E\u5408\u89C4", type: "button" },
              "compliance.update": { label: "\u7F16\u8F91\u5408\u89C4", type: "button" },
              "compliance.delete": { label: "\u5220\u9664\u5408\u89C4", type: "button" }
            }
          },
          "menu.website-faq": {
            label: "FAQ \u7BA1\u7406",
            type: "menu",
            children: {
              "faq.read": { label: "\u67E5\u770B FAQ", type: "button" },
              "faq.create": { label: "\u65B0\u589E FAQ", type: "button" },
              "faq.update": { label: "\u7F16\u8F91 FAQ", type: "button" },
              "faq.delete": { label: "\u5220\u9664 FAQ", type: "button" }
            }
          },
          "menu.website-tutorial": {
            label: "\u6559\u7A0B\u7BA1\u7406",
            type: "menu",
            children: {
              "tutorial.read": { label: "\u67E5\u770B\u6559\u7A0B", type: "button" },
              "tutorial.create": { label: "\u65B0\u589E\u6559\u7A0B", type: "button" },
              "tutorial.update": { label: "\u7F16\u8F91\u6559\u7A0B", type: "button" },
              "tutorial.delete": { label: "\u5220\u9664\u6559\u7A0B", type: "button" }
            }
          },
          "menu.website-download": {
            label: "\u4E0B\u8F7D\u7BA1\u7406",
            type: "menu",
            children: {
              "download.read": { label: "\u67E5\u770B\u4E0B\u8F7D", type: "button" },
              "download.create": { label: "\u65B0\u589E\u4E0B\u8F7D", type: "button" },
              "download.update": { label: "\u7F16\u8F91\u4E0B\u8F7D", type: "button" },
              "download.delete": { label: "\u5220\u9664\u4E0B\u8F7D", type: "button" }
            }
          },
          "menu.website-lead": {
            label: "\u7EBF\u7D22\u7BA1\u7406",
            type: "menu",
            children: {
              "lead.read": { label: "\u67E5\u770B\u7EBF\u7D22", type: "button" },
              "lead.update": { label: "\u66F4\u65B0\u7EBF\u7D22", type: "button" },
              "lead.delete": { label: "\u5220\u9664\u7EBF\u7D22", type: "button" }
            }
          },
          "menu.website-visit-log": {
            label: "\u8BBF\u95EE\u65E5\u5FD7",
            type: "menu",
            children: {
              "visit-log.read": { label: "\u67E5\u770B\u65E5\u5FD7", type: "button" },
              "visit-log.delete": { label: "\u5220\u9664\u65E5\u5FD7", type: "button" }
            }
          },
          "menu.website-interaction": {
            label: "\u4E92\u52A8\u8BB0\u5F55",
            type: "menu",
            children: {
              "interaction.read": { label: "\u67E5\u770B\u4E92\u52A8", type: "button" },
              "interaction.delete": { label: "\u5220\u9664\u4E92\u52A8", type: "button" }
            }
          },
          "menu.website-search-log": {
            label: "\u641C\u7D22\u65E5\u5FD7",
            type: "menu",
            children: {
              "search-log.read": { label: "\u67E5\u770B\u641C\u7D22\u65E5\u5FD7", type: "button" },
              "search-log.delete": { label: "\u5220\u9664\u641C\u7D22\u65E5\u5FD7", type: "button" }
            }
          },
          "menu.website-knowledge-entity": {
            label: "\u77E5\u8BC6\u5B9E\u4F53",
            type: "menu",
            children: {
              "knowledge-entity.read": { label: "\u67E5\u770B\u5B9E\u4F53", type: "button" },
              "knowledge-entity.create": { label: "\u65B0\u589E\u5B9E\u4F53", type: "button" },
              "knowledge-entity.update": { label: "\u7F16\u8F91\u5B9E\u4F53", type: "button" },
              "knowledge-entity.delete": { label: "\u5220\u9664\u5B9E\u4F53", type: "button" },
              "knowledge-entity.manage": { label: "\u5B9E\u4F53\u7BA1\u7406", type: "button" },
              "knowledge-entity.create-global": { label: "\u65B0\u589E\u5168\u5C40\u5B9E\u4F53", type: "button" },
              "knowledge-entity.update-global": { label: "\u7F16\u8F91\u5168\u5C40\u5B9E\u4F53", type: "button" },
              "knowledge-entity.delete-global": { label: "\u5220\u9664\u5168\u5C40\u5B9E\u4F53", type: "button" }
            }
          },
          "menu.website-knowledge-relation": {
            label: "\u77E5\u8BC6\u5173\u7CFB",
            type: "menu",
            children: {
              "knowledge-relation.read": { label: "\u67E5\u770B\u5173\u7CFB", type: "button" },
              "knowledge-relation.create": { label: "\u65B0\u589E\u5173\u7CFB", type: "button" },
              "knowledge-relation.update": { label: "\u7F16\u8F91\u5173\u7CFB", type: "button" },
              "knowledge-relation.delete": { label: "\u5220\u9664\u5173\u7CFB", type: "button" }
            }
          },
          "menu.website-ai-summary": {
            label: "AI \u6458\u8981",
            type: "menu",
            children: {
              "ai-summary.read": { label: "\u67E5\u770B\u6458\u8981", type: "button" },
              "ai-summary.create": { label: "\u65B0\u589E\u6458\u8981", type: "button" },
              "ai-summary.update": { label: "\u7F16\u8F91\u6458\u8981", type: "button" },
              "ai-summary.delete": { label: "\u5220\u9664\u6458\u8981", type: "button" }
            }
          },
          "menu.website-first-truth": {
            label: "\u7B2C\u4E00\u771F\u503C",
            type: "menu",
            children: {
              "first-truth.read": { label: "\u67E5\u770B\u771F\u503C", type: "button" },
              "first-truth.create": { label: "\u65B0\u589E\u771F\u503C", type: "button" },
              "first-truth.update": { label: "\u7F16\u8F91\u771F\u503C", type: "button" },
              "first-truth.delete": { label: "\u5220\u9664\u771F\u503C", type: "button" },
              "first-truth.manage": { label: "\u771F\u503C\u7BA1\u7406", type: "button" },
              "first-truth.create-global": { label: "\u65B0\u589E\u5168\u5C40\u771F\u503C", type: "button" },
              "first-truth.update-global": { label: "\u7F16\u8F91\u5168\u5C40\u771F\u503C", type: "button" },
              "first-truth.delete-global": { label: "\u5220\u9664\u5168\u5C40\u771F\u503C", type: "button" }
            }
          },
          "menu.website-brand-voice": {
            label: "\u54C1\u724C\u8BDD\u672F",
            type: "menu",
            children: {
              "brand-voice.read": { label: "\u67E5\u770B\u8BDD\u672F", type: "button" },
              "brand-voice.create": { label: "\u65B0\u589E\u8BDD\u672F", type: "button" },
              "brand-voice.update": { label: "\u7F16\u8F91\u8BDD\u672F", type: "button" },
              "brand-voice.delete": { label: "\u5220\u9664\u8BDD\u672F", type: "button" },
              "brand-voice.create-global": { label: "\u65B0\u589E\u5168\u5C40\u8BDD\u672F", type: "button" },
              "brand-voice.update-global": { label: "\u7F16\u8F91\u5168\u5C40\u8BDD\u672F", type: "button" },
              "brand-voice.delete-global": { label: "\u5220\u9664\u5168\u5C40\u8BDD\u672F", type: "button" }
            }
          }
        }
      },
      "menu.logistics-center": {
        label: "\u7269\u6D41\u4E2D\u5FC3",
        type: "menu",
        children: {
          "menu.logistics-quote": {
            label: "\u8BE2\u4EF7\u7BA1\u7406",
            type: "menu",
            children: {
              "logistics.quote-request.read": { label: "\u67E5\u770B\u8BE2\u4EF7\u5355", type: "button" },
              "logistics.quote-request.create": { label: "\u65B0\u589E\u8BE2\u4EF7\u5355", type: "button" },
              "logistics.quote-request.update": { label: "\u7F16\u8F91\u8BE2\u4EF7\u5355", type: "button" },
              "logistics.quote-request.delete": { label: "\u5220\u9664\u8BE2\u4EF7\u5355", type: "button" },
              "logistics.quote-field-rule.read": { label: "\u67E5\u770B\u5B57\u6BB5\u89C4\u5219", type: "button" },
              "logistics.quote-field-rule.create": { label: "\u65B0\u589E\u5B57\u6BB5\u89C4\u5219", type: "button" },
              "logistics.quote-field-rule.update": { label: "\u7F16\u8F91\u5B57\u6BB5\u89C4\u5219", type: "button" },
              "logistics.quote-field-rule.delete": { label: "\u5220\u9664\u5B57\u6BB5\u89C4\u5219", type: "button" },
              "logistics.quote-price-rule.read": { label: "\u67E5\u770B\u62A5\u4EF7\u89C4\u5219", type: "button" },
              "logistics.quote-price-rule.create": { label: "\u65B0\u589E\u62A5\u4EF7\u89C4\u5219", type: "button" },
              "logistics.quote-price-rule.update": { label: "\u7F16\u8F91\u62A5\u4EF7\u89C4\u5219", type: "button" },
              "logistics.quote-price-rule.delete": { label: "\u5220\u9664\u62A5\u4EF7\u89C4\u5219", type: "button" },
              "logistics.quote-price-formula.read": { label: "\u67E5\u770B\u62A5\u4EF7\u516C\u5F0F", type: "button" },
              "logistics.quote-price-formula.create": { label: "\u65B0\u589E\u516C\u5F0F", type: "button" },
              "logistics.quote-price-formula.update": { label: "\u7F16\u8F91\u516C\u5F0F", type: "button" },
              "logistics.quote-price-formula.delete": { label: "\u5220\u9664\u516C\u5F0F", type: "button" }
            }
          },
          "menu.logistics-tracking": {
            label: "\u8D27\u7269\u8FFD\u8E2A",
            type: "menu",
            children: {
              "logistics.tracking-shipment.read": { label: "\u67E5\u770B\u8FD0\u5355", type: "button" },
              "logistics.tracking-shipment.create": { label: "\u65B0\u589E\u8FD0\u5355", type: "button" },
              "logistics.tracking-shipment.update": { label: "\u7F16\u8F91\u8FD0\u5355", type: "button" },
              "logistics.tracking-shipment.delete": { label: "\u5220\u9664\u8FD0\u5355", type: "button" },
              "logistics.tracking-node.read": { label: "\u67E5\u770B\u8FFD\u8E2A\u8282\u70B9", type: "button" },
              "logistics.tracking-node.create": { label: "\u65B0\u589E\u8282\u70B9", type: "button" },
              "logistics.tracking-node.update": { label: "\u7F16\u8F91\u8282\u70B9", type: "button" },
              "logistics.tracking-node.delete": { label: "\u5220\u9664\u8282\u70B9", type: "button" },
              "logistics.tracking-provider.read": { label: "\u67E5\u770B\u8FFD\u8E2A\u914D\u7F6E", type: "button" },
              "logistics.tracking-provider.create": { label: "\u65B0\u589E\u8FFD\u8E2A\u914D\u7F6E", type: "button" },
              "logistics.tracking-provider.update": { label: "\u7F16\u8F91\u8FFD\u8E2A\u914D\u7F6E", type: "button" },
              "logistics.tracking-provider.delete": { label: "\u5220\u9664\u8FFD\u8E2A\u914D\u7F6E", type: "button" }
            }
          },
          "menu.logistics-contact": {
            label: "\u8054\u7CFB\u6E20\u9053",
            type: "menu",
            children: {
              "logistics.contact-matrix.read": { label: "\u67E5\u770B\u6E20\u9053\u77E9\u9635", type: "button" },
              "logistics.contact-matrix.create": { label: "\u65B0\u589E\u6E20\u9053\u77E9\u9635", type: "button" },
              "logistics.contact-matrix.update": { label: "\u7F16\u8F91\u6E20\u9053\u77E9\u9635", type: "button" },
              "logistics.contact-matrix.delete": { label: "\u5220\u9664\u6E20\u9053\u77E9\u9635", type: "button" }
            }
          },
          "menu.logistics-review": {
            label: "\u5BA2\u6237\u8BC4\u4EF7",
            type: "menu",
            children: {
              "logistics.review.read": { label: "\u67E5\u770B\u8BC4\u4EF7", type: "button" },
              "logistics.review.create": { label: "\u65B0\u589E\u8BC4\u4EF7", type: "button" },
              "logistics.review.update": { label: "\u7F16\u8F91\u8BC4\u4EF7", type: "button" },
              "logistics.review.delete": { label: "\u5220\u9664\u8BC4\u4EF7", type: "button" },
              "logistics.review.approve": { label: "\u5BA1\u6838\u8BC4\u4EF7", type: "button" }
            }
          },
          "menu.logistics-subscription": {
            label: "\u901A\u77E5\u8BA2\u9605",
            type: "menu",
            children: {
              "logistics.subscription.read": { label: "\u67E5\u770B\u8BA2\u9605", type: "button" },
              "logistics.subscription.update": { label: "\u66F4\u65B0\u8BA2\u9605", type: "button" },
              "logistics.subscription.delete": { label: "\u5220\u9664\u8BA2\u9605", type: "button" }
            }
          },
          "menu.logistics-landing": {
            label: "\u843D\u5730\u9875",
            type: "menu",
            children: {
              "logistics.landing-page.read": { label: "\u67E5\u770B\u843D\u5730\u9875", type: "button" },
              "logistics.landing-page.create": { label: "\u65B0\u589E\u843D\u5730\u9875", type: "button" },
              "logistics.landing-page.update": { label: "\u7F16\u8F91\u843D\u5730\u9875", type: "button" },
              "logistics.landing-page.delete": { label: "\u5220\u9664\u843D\u5730\u9875", type: "button" }
            }
          },
          "menu.logistics-funnel": {
            label: "\u8F6C\u5316\u6F0F\u6597",
            type: "menu",
            children: {
              "logistics.conversion-funnel.read": { label: "\u67E5\u770B\u6F0F\u6597", type: "button" },
              "logistics.conversion-funnel.create": { label: "\u65B0\u589E\u6F0F\u6597", type: "button" },
              "logistics.conversion-funnel.update": { label: "\u7F16\u8F91\u6F0F\u6597", type: "button" },
              "logistics.conversion-funnel.delete": { label: "\u5220\u9664\u6F0F\u6597", type: "button" },
              "logistics.conversion-event.read": { label: "\u67E5\u770B\u4E8B\u4EF6", type: "button" },
              "logistics.funnel-stats.read": { label: "\u67E5\u770B\u6F0F\u6597\u7EDF\u8BA1", type: "button" }
            }
          },
          "menu.logistics-order": {
            label: "\u610F\u5411\u8BA2\u5355",
            type: "menu",
            children: {
              "logistics.intent-order.read": { label: "\u67E5\u770B\u8BA2\u5355", type: "button" },
              "logistics.intent-order.create": { label: "\u65B0\u589E\u8BA2\u5355", type: "button" },
              "logistics.intent-order.update": { label: "\u7F16\u8F91\u8BA2\u5355", type: "button" },
              "logistics.intent-order.delete": { label: "\u5220\u9664\u8BA2\u5355", type: "button" },
              "logistics.intent-order.convert": { label: "\u6807\u8BB0\u8F6C\u5316", type: "button" }
            }
          },
          "menu.logistics-referral": {
            label: "\u63A8\u8350\u5956\u52B1",
            type: "menu",
            children: {
              "logistics.referral.read": { label: "\u67E5\u770B\u63A8\u8350", type: "button" },
              "logistics.referral.create": { label: "\u65B0\u589E\u63A8\u8350", type: "button" },
              "logistics.referral.update": { label: "\u7F16\u8F91\u63A8\u8350", type: "button" },
              "logistics.referral.delete": { label: "\u5220\u9664\u63A8\u8350", type: "button" },
              "logistics.referral-stats.read": { label: "\u67E5\u770B\u63A8\u8350\u7EDF\u8BA1", type: "button" }
            }
          },
          "menu.logistics-customer": {
            label: "\u5BA2\u6237\u6863\u6848",
            type: "menu",
            children: {
              "logistics.customer-profile.read": { label: "\u67E5\u770B\u6863\u6848", type: "button" },
              "logistics.customer-profile.update": { label: "\u7F16\u8F91\u6863\u6848", type: "button" },
              "logistics.customer-profile.delete": { label: "\u5220\u9664\u6863\u6848", type: "button" },
              "logistics.customer-profile.merge": { label: "\u5408\u5E76\u6863\u6848", type: "button" }
            }
          }
        }
      },
      // ===== 理财中心 =====
      "menu.wealth-center": {
        label: "\u7406\u8D22\u4E2D\u5FC3",
        type: "menu",
        children: {
          "menu.wealth-product": {
            label: "\u4EA7\u54C1\u7BA1\u7406",
            type: "menu",
            children: {
              "wealth.wealth-product.read": { label: "\u67E5\u770B", type: "button" },
              "wealth.wealth-product.create": { label: "\u521B\u5EFA", type: "button" },
              "wealth.wealth-product.update": { label: "\u7F16\u8F91", type: "button" },
              "wealth.wealth-product.delete": { label: "\u5220\u9664", type: "button" },
              "wealth.wealth-product.collect": { label: "\u91C7\u96C6", type: "button" },
              "wealth.wealth-nav.read": { label: "\u67E5\u770B\u51C0\u503C", type: "button" },
              "wealth.wealth-nav.create": { label: "\u5F55\u5165\u51C0\u503C", type: "button" },
              "wealth.wealth-nav.update": { label: "\u7F16\u8F91\u51C0\u503C", type: "button" },
              "wealth.wealth-nav.delete": { label: "\u5220\u9664\u51C0\u503C", type: "button" }
            }
          },
          "menu.wealth-company": {
            label: "\u516C\u53F8\u7BA1\u7406",
            type: "menu",
            children: {
              "wealth.wealth-company.read": { label: "\u67E5\u770B", type: "button" },
              "wealth.wealth-company.create": { label: "\u521B\u5EFA", type: "button" },
              "wealth.wealth-company.update": { label: "\u7F16\u8F91", type: "button" },
              "wealth.wealth-company.delete": { label: "\u5220\u9664", type: "button" }
            }
          },
          "menu.wealth-collect": {
            label: "\u6570\u636E\u91C7\u96C6",
            type: "menu",
            children: {
              "wealth.wealth-collect-config.read": { label: "\u67E5\u770B\u914D\u7F6E", type: "button" },
              "wealth.wealth-collect-config.create": { label: "\u521B\u5EFA\u914D\u7F6E", type: "button" },
              "wealth.wealth-collect-config.update": { label: "\u7F16\u8F91\u914D\u7F6E", type: "button" },
              "wealth.wealth-collect-config.delete": { label: "\u5220\u9664\u914D\u7F6E", type: "button" },
              "wealth.wealth-collect-config.trigger": { label: "\u89E6\u53D1\u91C7\u96C6", type: "button" },
              "wealth.wealth-customer-product.read": { label: "\u67E5\u770B\u6301\u4ED3", type: "button" },
              "wealth.wealth-customer-product.create": { label: "\u5F55\u5165\u6301\u4ED3", type: "button" },
              "wealth.wealth-customer-product.delete": { label: "\u5220\u9664\u6301\u4ED3", type: "button" }
            }
          },
          "menu.wealth-metrics": {
            label: "\u98CE\u9669\u6307\u6807",
            type: "menu",
            children: {
              "wealth.wealth-risk-metric.read": { label: "\u67E5\u770B\u98CE\u9669", type: "button" },
              "wealth.wealth-risk-metric.update": { label: "\u7F16\u8F91\u98CE\u9669", type: "button" },
              "wealth.wealth-risk-metric.aggregate": { label: "\u805A\u5408\u7EDF\u8BA1", type: "button" },
              "wealth.wealth-risk-metric.trend": { label: "\u8D8B\u52BF\u5206\u6790", type: "button" },
              "wealth.wealth-risk-metric.peers": { label: "\u540C\u4E1A\u5BF9\u6BD4", type: "button" },
              "wealth.wealth-risk-metric.recalculate": { label: "\u91CD\u7B97\u6307\u6807", type: "button" },
              "wealth.wealth-recommend-config.read": { label: "\u67E5\u770B\u63A8\u8350\u914D\u7F6E", type: "button" },
              "wealth.wealth-recommend-config.create": { label: "\u521B\u5EFA\u63A8\u8350\u914D\u7F6E", type: "button" },
              "wealth.wealth-recommend-config.update": { label: "\u7F16\u8F91\u63A8\u8350\u914D\u7F6E", type: "button" },
              "wealth.wealth-recommend-config.delete": { label: "\u5220\u9664\u63A8\u8350\u914D\u7F6E", type: "button" },
              "wealth.wealth-annual-snapshot.read": { label: "\u67E5\u770B\u5E74\u62A5", type: "button" },
              "wealth.wealth-annual-snapshot.update": { label: "\u7F16\u8F91\u5E74\u62A5", type: "button" },
              "wealth.wealth-yearly-return.read": { label: "\u67E5\u770B\u5E74\u5316\u6536\u76CA", type: "button" },
              "wealth.wealth-yearly-return.update": { label: "\u7F16\u8F91\u5E74\u5316\u6536\u76CA", type: "button" },
              "wealth.wealth-money-income.read": { label: "\u67E5\u770B\u6536\u76CA\u5206\u914D", type: "button" },
              "wealth.wealth-money-income.update": { label: "\u7F16\u8F91\u6536\u76CA\u5206\u914D", type: "button" }
            }
          }
        }
      }
    };
    DEFAULT_ROLE_PERMISSIONS = {
      [ROLES.ADMIN]: flattenPermissions(PERMISSION_TREE),
      [ROLES.CHANNEL_ADMIN]: [
        // ===== 渠道管理员职责：仅渠道管理 + 成员管理 + 邀请 + 租户读取 + 站点配置创建/更新 =====
        // 不再通过 flattenPermissions(PERMISSION_TREE) 自动获得全部中心权限
        // (1) 后台登录
        "auth.admin-login",
        // (2) 渠道管理（本渠道范围内）
        "menu.marketing-center",
        "menu.channel",
        "channel.read",
        "channel.create",
        "channel.update",
        "channel.config.update",
        "menu.network",
        "network.view",
        // (3) 成员管理（本渠道范围内）
        "menu.members",
        "channel-member.read",
        "channel-member.add",
        "channel-member.remove",
        // (4) 分销邀请
        "menu.invite",
        "user-invite.send",
        "user-invite.validate",
        // (5) 渠道权限
        "menu.channel-permission",
        "channel-permission.set",
        "channel.user-channel.read",
        "channel.user-channel.assign",
        "channel.user-channel.revoke",
        // (6) 兑换码 + 兑换记录（渠道运营）
        "menu.redemption-code",
        "redemption-code.create",
        "redemption-code.delete",
        "menu.redemption-record",
        "redemption-record.review",
        // (7) 租户管理（仅读取 + 创建自己租户 + 更新自己租户；不含 delete）
        "menu.tenant",
        "tenant.read",
        "tenant.create",
        "tenant.update",
        // (8) 站点配置（仅创建 + 更新自己租户的 site-config）
        "menu.site-config",
        "site-config.update",
        "config.read",
        "config.create",
        "config.update",
        // (9) 功能开关（本租户内的粗粒度开关 + 细粒度配置）
        "menu.feature-flag",
        "feature-flag.update",
        "config.feature.update",
        // (10) 模块可见性（本租户内的角色可见性配置）
        "menu.module-visibility",
        // (11) 用户角色管理（分配/撤销；不含 role.create 防止绕过白名单）
        "menu.user-roles",
        "role.read",
        "role.assign",
        "role.revoke",
        "role.read-logs",
        // (12) 媒体资源（本租户内的 OSS 资源管理）
        "oss.media-meta.read",
        "oss.media-meta.upload",
        // 注：不含 oss.media-meta.delete（删除需 admin 或 system-manager）
        // (13) 模板 + 第三方配置（只读，创建租户时需加载模板列表和第三方配置）
        "template.read",
        "third-party-config.read"
        // ===== 显式排除（不再包含）=====
        // - flattenPermissions(PERMISSION_TREE)：不再自动获得全部中心权限
        // - tenant.delete：跨租户删除，不应下放
        // - role.create：防止 channel-admin 创建"全权限自定义角色"绕过白名单（见 Task 6.7 createRole 白名单）
        // - *-global 后缀权限：跨租户全局操作，不应下放
        // - sso.* 权限：与 DEFAULT_MODULE_VISIBILITY 不一致（sso 模块对 channel-admin 不可见）
        // - oss.media-meta.delete：删除敏感，仅 admin 或 system-manager
        // - 22 个中心的业务权限（course/quiz/point/...）：channel-admin 职责是渠道管理，不管理各中心业务内容
        //   如需让 channel-admin 管理某中心内容，admin 应通过角色分配给 channel-admin 额外叠加中心角色（如 website-manager）
      ],
      [ROLES.PLUGIN_MANAGER]: flattenPermissions(
        ((t) => {
          const result = {};
          for (const key of [
            "menu.course-center",
            "menu.quiz-center",
            "menu.point-center",
            "menu.tag-center",
            "menu.studio-center"
          ]) {
            if (t[key]) result[key] = t[key];
          }
          return result;
        })(PERMISSION_TREE)
      ).concat([
        "menu.site-config",
        "site-config.update",
        "config.read",
        "config.update",
        "config.feature.update",
        "channel.config.update",
        // 官网中心（read/create/update，不含 delete/manage）
        "menu.website-center",
        "menu.website-seo",
        "seo-config.read",
        "menu.website-brand",
        "brand-info.read",
        "menu.website-article",
        "article.read",
        "article.create",
        "article.update",
        "menu.website-article-category",
        "article-category.read",
        "article-category.create",
        "article-category.update",
        "menu.website-product",
        "product.read",
        "product.create",
        "product.update",
        "menu.website-case",
        "case.read",
        "case.create",
        "case.update",
        "menu.website-compliance",
        "compliance.read",
        "compliance.create",
        "compliance.update",
        "menu.website-faq",
        "faq.read",
        "faq.create",
        "faq.update",
        "menu.website-tutorial",
        "tutorial.read",
        "tutorial.create",
        "tutorial.update",
        "menu.website-download",
        "download.read",
        "download.create",
        "download.update",
        "menu.website-lead",
        "lead.read",
        "lead.update",
        "menu.website-visit-log",
        "visit-log.read",
        "menu.website-interaction",
        "interaction.read",
        "menu.website-search-log",
        "search-log.read",
        "menu.website-knowledge-entity",
        "knowledge-entity.read",
        "menu.website-knowledge-relation",
        "knowledge-relation.read",
        "menu.website-ai-summary",
        "ai-summary.read",
        "ai-summary.create",
        "menu.website-first-truth",
        "first-truth.read",
        "menu.website-brand-voice",
        "brand-voice.read",
        "brand-voice.create",
        "brand-voice.update",
        "brand-voice.delete",
        // 物流中心（read/create/update，不含 delete）
        "menu.logistics-center",
        "menu.logistics-quote",
        "logistics.quote-request.read",
        "logistics.quote-request.create",
        "logistics.quote-request.update",
        "logistics.quote-field-rule.read",
        "logistics.quote-field-rule.create",
        "logistics.quote-field-rule.update",
        "logistics.quote-price-rule.read",
        "logistics.quote-price-rule.create",
        "logistics.quote-price-rule.update",
        "logistics.quote-price-formula.read",
        "menu.logistics-tracking",
        "logistics.tracking-shipment.read",
        "logistics.tracking-shipment.create",
        "logistics.tracking-shipment.update",
        "logistics.tracking-node.read",
        "logistics.tracking-provider.read",
        "menu.logistics-contact",
        "logistics.contact-matrix.read",
        "logistics.contact-matrix.create",
        "logistics.contact-matrix.update",
        "menu.logistics-review",
        "logistics.review.read",
        "logistics.review.create",
        "logistics.review.update",
        "menu.logistics-subscription",
        "logistics.subscription.read",
        "menu.logistics-landing",
        "logistics.landing-page.read",
        "logistics.landing-page.create",
        "logistics.landing-page.update",
        "menu.logistics-funnel",
        "logistics.conversion-funnel.read",
        "logistics.funnel-stats.read",
        "logistics.conversion-event.read",
        "menu.logistics-order",
        "logistics.intent-order.read",
        "logistics.intent-order.create",
        "logistics.intent-order.update",
        "menu.logistics-referral",
        "logistics.referral.read",
        "logistics.referral-stats.read",
        "menu.logistics-customer",
        "logistics.customer-profile.read",
        "logistics.customer-profile.update",
        // 理财中心（read/create/update，不含 delete）
        "menu.wealth-center",
        "menu.wealth-product",
        "wealth.wealth-product.read",
        "wealth.wealth-product.create",
        "wealth.wealth-product.update",
        "wealth.wealth-product.collect",
        "wealth.wealth-nav.read",
        "wealth.wealth-nav.create",
        "wealth.wealth-nav.update",
        "menu.wealth-company",
        "wealth.wealth-company.read",
        "wealth.wealth-company.create",
        "wealth.wealth-company.update",
        "menu.wealth-collect",
        "wealth.wealth-collect-config.read",
        "wealth.wealth-collect-config.create",
        "wealth.wealth-collect-config.update",
        "wealth.wealth-collect-config.trigger",
        "wealth.wealth-customer-product.read",
        "wealth.wealth-customer-product.create",
        "menu.wealth-metrics",
        "wealth.wealth-risk-metric.read",
        "wealth.wealth-risk-metric.aggregate",
        "wealth.wealth-risk-metric.trend",
        "wealth.wealth-risk-metric.peers",
        "wealth.wealth-recommend-config.read",
        "wealth.wealth-recommend-config.create",
        "wealth.wealth-recommend-config.update",
        "wealth.wealth-annual-snapshot.read",
        "wealth.wealth-yearly-return.read",
        "wealth.wealth-money-income.read",
        // SSO 扩展（read 为主）
        "menu.sso-binding",
        "sso.third-party-binding.read",
        "sso.oauth-config.read",
        "menu.sso-token",
        "sso.token.read",
        "menu.sso-user-role",
        "sso.user-app-role.read",
        "menu.sso-invite",
        "sso.invite-code.read",
        "sso.invite-stats.read",
        "menu.sso-sms",
        "sso.sms-code.read",
        // 零散补全
        "oss.media-meta.read",
        "auth.admin-login"
      ]),
      [ROLES.INSTRUCTOR]: [
        // 课程中心
        "menu.course-center",
        "menu.course",
        "course.read",
        "course.create",
        "course.update",
        "course.publish",
        "menu.lesson",
        "lesson.read",
        "lesson.create",
        "lesson.update",
        "lesson.delete",
        "menu.category",
        "course-category.read",
        "course-category.create",
        "course-category.update",
        "menu.auth",
        "user-course.read",
        "user-course.grant",
        // 学习数据
        "menu.study-center",
        "menu.progress",
        "course-progress.read",
        "course-progress.update",
        "menu.lesson-progress",
        "lesson-progress.read",
        "lesson-progress.update",
        // 标签体系
        "menu.tag-center",
        "menu.tag",
        "tag.read",
        "tag.create",
        "tag.update",
        "menu.knowledge",
        "knowledge-point.read",
        "knowledge-point.create",
        "knowledge-point.update",
        // 官网中心（只读）
        "menu.website-center",
        "menu.website-brand",
        "brand-info.read",
        "menu.website-article",
        "article.read",
        "menu.website-product",
        "product.read",
        "menu.website-case",
        "case.read",
        "menu.website-compliance",
        "compliance.read",
        "menu.website-faq",
        "faq.read",
        "menu.website-tutorial",
        "tutorial.read",
        "menu.website-download",
        "download.read",
        "menu.website-lead",
        "lead.read",
        // 物流中心（只读）
        "menu.logistics-center",
        "menu.logistics-quote",
        "logistics.quote-request.read",
        "logistics.quote-field-rule.read",
        "logistics.quote-price-rule.read",
        "menu.logistics-tracking",
        "logistics.tracking-shipment.read",
        "logistics.tracking-node.read",
        "menu.logistics-contact",
        "logistics.contact-matrix.read",
        "menu.logistics-review",
        "logistics.review.read",
        "menu.logistics-landing",
        "logistics.landing-page.read",
        // 理财中心（只读）
        "menu.wealth-center",
        "menu.wealth-product",
        "wealth.wealth-product.read",
        "wealth.wealth-nav.read",
        "menu.wealth-company",
        "wealth.wealth-company.read",
        "menu.wealth-collect",
        "wealth.wealth-collect-config.read",
        "wealth.wealth-customer-product.read",
        "menu.wealth-metrics",
        "wealth.wealth-risk-metric.read",
        "wealth.wealth-recommend-config.read",
        "wealth.wealth-annual-snapshot.read",
        "wealth.wealth-yearly-return.read",
        "wealth.wealth-money-income.read",
        // 直播工作室（只读）
        "menu.studio-collect",
        "studio.article-draft.read",
        "studio.collect-source.read",
        "studio.collect-task.read",
        "menu.studio-publish",
        "studio.publish-platform.read",
        "studio.publish-account.read",
        "studio.publish-record.read",
        "menu.studio-stats",
        "studio.stat-summary.read",
        "menu.studio-ad",
        "studio.ad-slot.read",
        // 零散补全（只读）
        "point.rule-template.read",
        "point.sign-in-record.read",
        "quiz.quiz-batch.read",
        "tag.tag-index.read",
        "auth.admin-login"
        // 允许讲师登录后台
      ],
      [ROLES.USER]: [],
      // ===== 11 个中心 × 2 = 22 个新角色 =====
      // 所有中心角色追加 auth.admin-login，被分配即可登录后台（菜单权限仍由 centerPermissions 限定）
      [ROLES.WEBSITE_MANAGER]: centerPermissions("menu.website-center").filter((k) => !k.endsWith("-global")).concat(["auth.admin-login"]),
      [ROLES.WEBSITE_EDITOR]: centerEditorPermissions("menu.website-center").filter((k) => !k.endsWith("-global")).concat(["auth.admin-login"]),
      [ROLES.LOGISTICS_MANAGER]: centerPermissions("menu.logistics-center").concat(["auth.admin-login"]),
      [ROLES.LOGISTICS_EDITOR]: centerEditorPermissions("menu.logistics-center").concat(["auth.admin-login"]),
      [ROLES.COURSE_MANAGER]: centerPermissions("menu.course-center").concat(["auth.admin-login"]),
      [ROLES.COURSE_EDITOR]: centerEditorPermissions("menu.course-center").concat(["auth.admin-login"]),
      [ROLES.STUDY_MANAGER]: centerPermissions("menu.study-center").concat(["auth.admin-login"]),
      [ROLES.STUDY_EDITOR]: centerEditorPermissions("menu.study-center").concat(["auth.admin-login"]),
      [ROLES.QUIZ_MANAGER]: centerPermissions("menu.quiz-center").concat(["auth.admin-login"]),
      [ROLES.QUIZ_EDITOR]: centerEditorPermissions("menu.quiz-center").concat(["auth.admin-login"]),
      [ROLES.POINT_MANAGER]: centerPermissions("menu.point-center").concat(["auth.admin-login"]),
      [ROLES.POINT_EDITOR]: centerEditorPermissions("menu.point-center").concat(["auth.admin-login"]),
      [ROLES.MARKETING_MANAGER]: centerPermissions("menu.marketing-center").concat(["auth.admin-login"]),
      [ROLES.MARKETING_EDITOR]: centerEditorPermissions("menu.marketing-center").concat(["auth.admin-login"]),
      [ROLES.SYSTEM_MANAGER]: centerPermissions("menu.system-center").concat(["auth.admin-login"]),
      [ROLES.SYSTEM_EDITOR]: centerEditorPermissions("menu.system-center").concat(["auth.admin-login"]),
      [ROLES.TAG_MANAGER]: centerPermissions("menu.tag-center").concat(["auth.admin-login"]),
      [ROLES.TAG_EDITOR]: centerEditorPermissions("menu.tag-center").concat(["auth.admin-login"]),
      [ROLES.STUDIO_MANAGER]: centerPermissions("menu.studio-center").concat(["auth.admin-login"]),
      [ROLES.STUDIO_EDITOR]: centerEditorPermissions("menu.studio-center").concat(["auth.admin-login"]),
      [ROLES.WEALTH_MANAGER]: centerPermissions("menu.wealth-center").concat(["auth.admin-login"]),
      [ROLES.WEALTH_EDITOR]: centerEditorPermissions("menu.wealth-center").concat(["auth.admin-login"])
    };
  }
});

// plugins/zhao-auth/server/src/constants/module-visibility.ts
var VISIBILITY_MODULES, DEFAULT_MODULE_VISIBILITY;
var init_module_visibility = __esm({
  "plugins/zhao-auth/server/src/constants/module-visibility.ts"() {
    VISIBILITY_MODULES = [
      "website",
      "logistics",
      "studio",
      "points",
      "course",
      "quiz",
      "channel",
      "sso",
      "thirdParty",
      "oss",
      "payment",
      "community",
      "forum"
    ];
    DEFAULT_MODULE_VISIBILITY = {
      website: ["channel-admin", "plugin-manager", "website-manager", "website-editor"],
      logistics: ["channel-admin", "plugin-manager", "logistics-manager", "logistics-editor"],
      studio: ["channel-admin", "plugin-manager", "studio-manager", "studio-editor"],
      points: ["channel-admin", "plugin-manager", "point-manager", "point-editor"],
      course: ["channel-admin", "plugin-manager", "course-manager", "course-editor"],
      quiz: ["channel-admin", "plugin-manager", "quiz-manager", "quiz-editor"],
      channel: ["channel-admin", "plugin-manager", "marketing-manager"],
      sso: ["plugin-manager", "system-manager", "system-editor"],
      thirdParty: ["plugin-manager", "system-manager"],
      oss: ["plugin-manager", "system-manager"],
      payment: ["plugin-manager", "wealth-manager"],
      community: ["channel-admin", "plugin-manager", "marketing-manager"],
      forum: ["channel-admin", "plugin-manager", "marketing-manager"]
    };
  }
});

// plugins/zhao-auth/server/src/services/permission.service.ts
var permission_service_exports = {};
__export(permission_service_exports, {
  default: () => permission_service_default,
  invalidatePermissionCache: () => invalidatePermissionCache
});
function invalidatePermissionCache(userId, tenantDocumentId) {
  if (userId && tenantDocumentId) {
    permissionCache2.delete(`${userId}|${tenantDocumentId}`);
  } else if (userId) {
    for (const key of [...permissionCache2.keys()]) {
      if (key.startsWith(`${userId}|`)) permissionCache2.delete(key);
    }
  } else if (tenantDocumentId) {
    for (const key of [...permissionCache2.keys()]) {
      if (key.endsWith(`|${tenantDocumentId}`)) permissionCache2.delete(key);
    }
  } else {
    permissionCache2.clear();
  }
}
function normalizeRoleName(name) {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, "-");
}
function findNode(key, tree) {
  for (const [k, node] of Object.entries(tree)) {
    if (k === key) return node;
    if (node?.children) {
      const found = findNode(key, node.children);
      if (found) return found;
    }
  }
  return null;
}
function expandPermissionKeys2(keys) {
  const result = /* @__PURE__ */ new Set();
  for (const key of keys) {
    result.add(key);
    const found = findNode(key, PERMISSION_TREE);
    if (found?.children && found.type !== "menu") {
      flattenPermissions(found.children).forEach((k) => result.add(k));
    }
  }
  return Array.from(result);
}
var PERMISSION_UID2, USER_UID3, PERMISSION_CACHE_TTL, permissionCache2, permission_service_default;
var init_permission_service = __esm({
  "plugins/zhao-auth/server/src/services/permission.service.ts"() {
    init_permissions();
    init_module_visibility();
    PERMISSION_UID2 = "plugin::zhao-auth.permission";
    USER_UID3 = "plugin::users-permissions.user";
    PERMISSION_CACHE_TTL = 6e4;
    permissionCache2 = /* @__PURE__ */ new Map();
    permission_service_default = ({ strapi: strapi2 }) => ({
      /**
       * 获取权限树定义
       */
      getPermissionTree() {
        return PERMISSION_TREE;
      },
      /**
       * 角色列表（分页）
       */
      async listRoles(page = 1, pageSize = 20, filters = {}) {
        const where = {};
        if (filters.role) where.role = { $contains: filters.role };
        const records = await strapi2.db.query(PERMISSION_UID2).findMany({
          where,
          orderBy: { id: "asc" },
          limit: pageSize,
          offset: (page - 1) * pageSize
        });
        const total = await strapi2.db.query(PERMISSION_UID2).count({ where });
        const list = records.map((r) => ({
          id: r.id,
          documentId: r.documentId,
          name: r.role,
          role: r.role,
          displayName: r.displayName || r.role,
          description: r.description || "",
          isSystem: !!r.isSystem,
          permissions: r.permissions || [],
          userCount: 0,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt
        }));
        return {
          list,
          pagination: {
            page,
            pageSize,
            total,
            pageCount: Math.ceil(total / pageSize)
          }
        };
      },
      /**
       * 获取所有角色（不分页，用于下拉）
       */
      async getAllRoles() {
        const records = await strapi2.db.query(PERMISSION_UID2).findMany({
          orderBy: { id: "asc" }
        });
        return records.map((r) => ({
          name: r.role,
          role: r.role,
          displayName: r.displayName || r.role,
          isSystem: !!r.isSystem
        }));
      },
      /**
       * 获取单个角色
       */
      async getRole(roleName) {
        const record = await strapi2.db.query(PERMISSION_UID2).findOne({
          where: { role: roleName }
        });
        if (!record) return null;
        return {
          id: record.id,
          documentId: record.documentId,
          name: record.role,
          role: record.role,
          displayName: record.displayName || record.role,
          description: record.description || "",
          isSystem: !!record.isSystem,
          permissions: record.permissions || [],
          createdAt: record.createdAt,
          updatedAt: record.updatedAt
        };
      },
      /**
       * 创建角色
       */
      async createRole(data, operatorId, operatorLevel) {
        const role = normalizeRoleName(data.role);
        if (!role) {
          const e = new Error("\u89D2\u8272\u540D\u4E0D\u80FD\u4E3A\u7A7A");
          e.status = 400;
          throw e;
        }
        const targetLevel = data.level ?? 20;
        if (operatorLevel < 100 && targetLevel >= operatorLevel) {
          const e = new Error("\u4E0D\u80FD\u521B\u5EFA\u540C\u7EA7\u6216\u66F4\u9AD8\u5C42\u7EA7\u89D2\u8272");
          e.code = "ROLE_003";
          e.status = 403;
          throw e;
        }
        const existing = await strapi2.db.query(PERMISSION_UID2).findOne({
          where: { role }
        });
        if (existing) {
          const e = new Error(`\u89D2\u8272 ${role} \u5DF2\u5B58\u5728`);
          e.status = 409;
          throw e;
        }
        if (operatorLevel < 100) {
          const operator = await strapi2.db.query(USER_UID3).findOne({ where: { id: operatorId } });
          const operatorRoles = Array.isArray(operator?.zhaoRoles) ? operator.zhaoRoles : [];
          if (!operatorRoles.includes("admin")) {
            const operatorPermsResult = await this.getMyPermissions(operatorId);
            const operatorPerms = new Set(operatorPermsResult.permissions);
            const requestedPerms = Array.isArray(data.permissions) ? data.permissions : [];
            const unauthorizedPerms = requestedPerms.filter((p) => !operatorPerms.has(p));
            if (unauthorizedPerms.length > 0) {
              const e = new Error(
                `\u4E0D\u80FD\u521B\u5EFA\u5305\u542B\u8D85\u51FA\u81EA\u8EAB\u6743\u9650\u7684\u89D2\u8272\uFF0C\u672A\u6388\u6743\u6743\u9650\uFF1A${unauthorizedPerms.join(", ")}`
              );
              e.code = "PERM_010";
              e.status = 403;
              throw e;
            }
          }
        }
        const created = await strapi2.documents(PERMISSION_UID2).create({
          data: {
            role,
            displayName: data.displayName || role,
            description: data.description || "",
            permissions: data.permissions || [],
            isSystem: !!data.isSystem,
            level: targetLevel
          }
        });
        return {
          id: created.id,
          documentId: created.documentId,
          name: created.role,
          role: created.role,
          displayName: created.displayName,
          description: created.description || "",
          isSystem: !!created.isSystem,
          permissions: created.permissions || [],
          level: created.level ?? targetLevel
        };
      },
      /**
       * 更新角色
       */
      async updateRole(roleName, data) {
        const existing = await strapi2.db.query(PERMISSION_UID2).findOne({
          where: { role: roleName }
        });
        if (!existing) {
          const e = new Error(`\u89D2\u8272 ${roleName} \u4E0D\u5B58\u5728`);
          e.status = 404;
          throw e;
        }
        const updateData = {};
        if (data.displayName !== void 0) updateData.displayName = data.displayName;
        if (data.description !== void 0) updateData.description = data.description;
        if (data.permissions !== void 0) updateData.permissions = data.permissions;
        const updated = await strapi2.documents(PERMISSION_UID2).update({
          documentId: existing.documentId,
          data: updateData
        });
        return {
          id: updated.id,
          documentId: updated.documentId,
          name: updated.role,
          role: updated.role,
          displayName: updated.displayName,
          description: updated.description || "",
          isSystem: !!updated.isSystem,
          permissions: updated.permissions || []
        };
      },
      /**
       * 删除角色（系统角色不允许删除）
       */
      async deleteRole(roleName) {
        const existing = await strapi2.db.query(PERMISSION_UID2).findOne({
          where: { role: roleName }
        });
        if (!existing) {
          const e = new Error(`\u89D2\u8272 ${roleName} \u4E0D\u5B58\u5728`);
          e.status = 404;
          throw e;
        }
        if (existing.isSystem) {
          const e = new Error("\u7CFB\u7EDF\u89D2\u8272\u4E0D\u5141\u8BB8\u5220\u9664");
          e.status = 400;
          throw e;
        }
        await strapi2.documents(PERMISSION_UID2).delete({ documentId: existing.documentId });
        return { success: true, role: roleName };
      },
      /**
       * 获取某角色权限
       */
      async getRolePermissions(role) {
        const record = await strapi2.db.query(PERMISSION_UID2).findOne({
          where: { role }
        });
        if (!record) {
          const defaults = DEFAULT_ROLE_PERMISSIONS[role];
          return { role, permissions: defaults || [] };
        }
        return { role, permissions: record.permissions || [] };
      },
      /**
       * 更新某角色权限
       */
      async updateRolePermissions(role, permissionKeys) {
        const existing = await strapi2.db.query(PERMISSION_UID2).findOne({
          where: { role }
        });
        if (existing) {
          const updated = await strapi2.documents(PERMISSION_UID2).update({
            documentId: existing.documentId,
            data: { permissions: permissionKeys }
          });
          return { role, permissions: updated.permissions };
        }
        const created = await strapi2.documents(PERMISSION_UID2).create({
          data: {
            role,
            displayName: ROLE_LABELS[role] || role,
            description: "",
            permissions: permissionKeys,
            isSystem: Object.values(ROLES).includes(role)
          }
        });
        return { role, permissions: created.permissions };
      },
      /**
       * 获取当前用户的所有权限
       */
      async getMyPermissions(userId, tenantDocumentId) {
        const cacheKey = `${userId}|${tenantDocumentId || "global"}`;
        const cached = permissionCache2.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < PERMISSION_CACHE_TTL) {
          return { permissions: cached.data };
        }
        const user = await strapi2.db.query(USER_UID3).findOne({
          where: { id: userId },
          select: ["id", "zhaoRoles"],
          populate: ["role"]
        });
        if (!user) return { permissions: [] };
        let userRoles = [];
        if (Array.isArray(user.zhaoRoles) && user.zhaoRoles.length > 0) {
          userRoles = user.zhaoRoles.map((r) => typeof r === "string" ? r : String(r)).filter((r) => r && r.trim());
        } else if (user.role) {
          const roleObj = user.role;
          if (Array.isArray(roleObj)) {
            userRoles = roleObj.map((r) => r?.type).filter((type) => type && type.trim());
          } else if (roleObj.type) {
            userRoles = [roleObj.type];
          } else if (roleObj.name) {
            userRoles = [roleObj.name];
          }
        }
        if (userRoles.length === 0) return { permissions: [] };
        if (userRoles.includes("admin")) {
          const allPerms = flattenPermissions(PERMISSION_TREE);
          permissionCache2.set(cacheKey, { data: allPerms, timestamp: Date.now() });
          return { permissions: allPerms };
        }
        const allExpanded = /* @__PURE__ */ new Set();
        for (const roleName of userRoles) {
          try {
            const record = await strapi2.db.query(PERMISSION_UID2).findOne({
              where: { role: roleName }
            });
            if (record?.permissions && Array.isArray(record.permissions)) {
              expandPermissionKeys2(record.permissions).forEach(
                (k) => allExpanded.add(k)
              );
            } else {
              const defaults = DEFAULT_ROLE_PERMISSIONS[roleName] || [];
              expandPermissionKeys2(defaults).forEach((k) => allExpanded.add(k));
            }
          } catch {
          }
        }
        if (userRoles.includes(ROLES.CHANNEL_ADMIN)) {
          const moduleVisibility = await this.resolveModuleVisibility(tenantDocumentId);
          for (const [moduleKey, roles] of Object.entries(moduleVisibility)) {
            if (roles.includes(ROLES.CHANNEL_ADMIN)) {
              const managerRole = MODULE_MANAGER_MAP[moduleKey];
              if (managerRole) {
                try {
                  const record = await strapi2.db.query(PERMISSION_UID2).findOne({
                    where: { role: managerRole }
                  });
                  const managerPerms = record?.permissions || DEFAULT_ROLE_PERMISSIONS[managerRole] || [];
                  expandPermissionKeys2(managerPerms).forEach((k) => allExpanded.add(k));
                } catch {
                  const defaults = DEFAULT_ROLE_PERMISSIONS[managerRole] || [];
                  expandPermissionKeys2(defaults).forEach((k) => allExpanded.add(k));
                }
              }
            }
          }
        }
        const result = Array.from(allExpanded);
        permissionCache2.set(cacheKey, { data: result, timestamp: Date.now() });
        return { permissions: result };
      },
      /**
       * 解析合并后的 moduleVisibility（全局默认 ∩ 租户覆盖，交集收窄）
       */
      async resolveModuleVisibility(tenantDocumentId) {
        let globalVisibility = {};
        try {
          const globalConfig = await strapi2.plugin("zhao-common").service("global-config").getGlobalConfig();
          globalVisibility = globalConfig?.moduleVisibility ?? {};
        } catch {
        }
        let tenantVisibility = {};
        if (tenantDocumentId) {
          try {
            const siteConfig = await strapi2.plugin("zhao-common").service("site-config").getConfig(tenantDocumentId);
            tenantVisibility = siteConfig?.moduleVisibility ?? {};
          } catch {
          }
        }
        const merged = {};
        for (const moduleKey of VISIBILITY_MODULES) {
          const globalRoles = globalVisibility[moduleKey] ?? DEFAULT_MODULE_VISIBILITY[moduleKey] ?? [];
          const tenantRoles = tenantVisibility[moduleKey];
          merged[moduleKey] = tenantRoles ? globalRoles.filter((r) => tenantRoles.includes(r)) : globalRoles;
        }
        return merged;
      },
      /**
       * 失效权限缓存（代理方法，供外部通过 strapi.plugin().service() 调用）
       */
      invalidateCache(userId, tenantDocumentId) {
        invalidatePermissionCache(userId, tenantDocumentId);
      },
      /**
       * 初始化并同步默认角色权限（每次启动时调用）
       * 系统角色的权限会与代码配置保持同步
       */
      async initDefaultRoles() {
        const results = [];
        for (const [role, defaultPerms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
          const existing = await strapi2.db.query(PERMISSION_UID2).findOne({
            where: { role }
          });
          if (!existing) {
            await strapi2.documents(PERMISSION_UID2).create({
              data: {
                role,
                displayName: ROLE_LABELS[role] || role,
                description: "",
                permissions: defaultPerms,
                isSystem: Object.values(ROLES).includes(role)
              }
            });
            results.push(`Created role: ${role}`);
          } else {
            const isSystemRole = Object.values(ROLES).includes(role);
            if (isSystemRole) {
              await strapi2.documents(PERMISSION_UID2).update({
                documentId: existing.documentId,
                data: {
                  displayName: ROLE_LABELS[role] || role,
                  description: existing.description || "",
                  permissions: defaultPerms,
                  isSystem: true
                }
              });
              results.push(`Synced permissions for system role: ${role}`);
            } else {
              if (!existing.displayName) {
                await strapi2.documents(PERMISSION_UID2).update({
                  documentId: existing.documentId,
                  data: {
                    displayName: ROLE_LABELS[role] || role,
                    description: "",
                    isSystem: false
                  }
                });
                results.push(`Updated role fields for: ${role}`);
              } else {
                results.push(`Role ${role} already exists, skipped (non-system)`);
              }
            }
          }
        }
        return results;
      }
    });
  }
});

// plugins/zhao-auth/server/src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default,
  getEffectiveRoles: () => getEffectiveRoles,
  hasAnyRole: () => hasAnyRole,
  hasPermission: () => hasPermission2,
  parsePermission: () => parsePermission,
  validatePermissionFormat: () => validatePermissionFormat
});
module.exports = __toCommonJS(index_exports);

// node_modules/bcryptjs/index.js
var import_crypto = __toESM(require("crypto"), 1);
var randomFallback = null;
function randomBytes(len) {
  try {
    return crypto.getRandomValues(new Uint8Array(len));
  } catch {
  }
  try {
    return import_crypto.default.randomBytes(len);
  } catch {
  }
  if (!randomFallback) {
    throw Error(
      "Neither WebCryptoAPI nor a crypto module is available. Use bcrypt.setRandomFallback to set an alternative"
    );
  }
  return randomFallback(len);
}
function setRandomFallback(random) {
  randomFallback = random;
}
function genSaltSync(rounds, seed_length) {
  rounds = rounds || GENSALT_DEFAULT_LOG2_ROUNDS;
  if (typeof rounds !== "number")
    throw Error(
      "Illegal arguments: " + typeof rounds + ", " + typeof seed_length
    );
  if (rounds < 4) rounds = 4;
  else if (rounds > 31) rounds = 31;
  var salt = [];
  salt.push("$2b$");
  if (rounds < 10) salt.push("0");
  salt.push(rounds.toString());
  salt.push("$");
  salt.push(base64_encode(randomBytes(BCRYPT_SALT_LEN), BCRYPT_SALT_LEN));
  return salt.join("");
}
function genSalt(rounds, seed_length, callback) {
  if (typeof seed_length === "function")
    callback = seed_length, seed_length = void 0;
  if (typeof rounds === "function") callback = rounds, rounds = void 0;
  if (typeof rounds === "undefined") rounds = GENSALT_DEFAULT_LOG2_ROUNDS;
  else if (typeof rounds !== "number")
    throw Error("illegal arguments: " + typeof rounds);
  function _async(callback2) {
    nextTick(function() {
      try {
        callback2(null, genSaltSync(rounds));
      } catch (err) {
        callback2(err);
      }
    });
  }
  if (callback) {
    if (typeof callback !== "function")
      throw Error("Illegal callback: " + typeof callback);
    _async(callback);
  } else
    return new Promise(function(resolve, reject) {
      _async(function(err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
}
function hashSync(password, salt) {
  if (typeof salt === "undefined") salt = GENSALT_DEFAULT_LOG2_ROUNDS;
  if (typeof salt === "number") salt = genSaltSync(salt);
  if (typeof password !== "string" || typeof salt !== "string")
    throw Error("Illegal arguments: " + typeof password + ", " + typeof salt);
  return _hash(password, salt);
}
function hash(password, salt, callback, progressCallback) {
  function _async(callback2) {
    if (typeof password === "string" && typeof salt === "number")
      genSalt(salt, function(err, salt2) {
        _hash(password, salt2, callback2, progressCallback);
      });
    else if (typeof password === "string" && typeof salt === "string")
      _hash(password, salt, callback2, progressCallback);
    else
      nextTick(
        callback2.bind(
          this,
          Error("Illegal arguments: " + typeof password + ", " + typeof salt)
        )
      );
  }
  if (callback) {
    if (typeof callback !== "function")
      throw Error("Illegal callback: " + typeof callback);
    _async(callback);
  } else
    return new Promise(function(resolve, reject) {
      _async(function(err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
}
function safeStringCompare(known, unknown) {
  var diff = known.length ^ unknown.length;
  for (var i = 0; i < known.length; ++i) {
    diff |= known.charCodeAt(i) ^ unknown.charCodeAt(i);
  }
  return diff === 0;
}
function compareSync(password, hash2) {
  if (typeof password !== "string" || typeof hash2 !== "string")
    throw Error("Illegal arguments: " + typeof password + ", " + typeof hash2);
  if (hash2.length !== 60) return false;
  return safeStringCompare(
    hashSync(password, hash2.substring(0, hash2.length - 31)),
    hash2
  );
}
function compare(password, hashValue, callback, progressCallback) {
  function _async(callback2) {
    if (typeof password !== "string" || typeof hashValue !== "string") {
      nextTick(
        callback2.bind(
          this,
          Error(
            "Illegal arguments: " + typeof password + ", " + typeof hashValue
          )
        )
      );
      return;
    }
    if (hashValue.length !== 60) {
      nextTick(callback2.bind(this, null, false));
      return;
    }
    hash(
      password,
      hashValue.substring(0, 29),
      function(err, comp) {
        if (err) callback2(err);
        else callback2(null, safeStringCompare(comp, hashValue));
      },
      progressCallback
    );
  }
  if (callback) {
    if (typeof callback !== "function")
      throw Error("Illegal callback: " + typeof callback);
    _async(callback);
  } else
    return new Promise(function(resolve, reject) {
      _async(function(err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
}
function getRounds(hash2) {
  if (typeof hash2 !== "string")
    throw Error("Illegal arguments: " + typeof hash2);
  return parseInt(hash2.split("$")[2], 10);
}
function getSalt(hash2) {
  if (typeof hash2 !== "string")
    throw Error("Illegal arguments: " + typeof hash2);
  if (hash2.length !== 60)
    throw Error("Illegal hash length: " + hash2.length + " != 60");
  return hash2.substring(0, 29);
}
function truncates(password) {
  if (typeof password !== "string")
    throw Error("Illegal arguments: " + typeof password);
  return utf8Length(password) > 72;
}
var nextTick = typeof setImmediate === "function" ? setImmediate : typeof scheduler === "object" && typeof scheduler.postTask === "function" ? scheduler.postTask.bind(scheduler) : setTimeout;
function utf8Length(string) {
  var len = 0, c = 0;
  for (var i = 0; i < string.length; ++i) {
    c = string.charCodeAt(i);
    if (c < 128) len += 1;
    else if (c < 2048) len += 2;
    else if ((c & 64512) === 55296 && (string.charCodeAt(i + 1) & 64512) === 56320) {
      ++i;
      len += 4;
    } else len += 3;
  }
  return len;
}
function utf8Array(string) {
  var offset = 0, c1, c2;
  var buffer = new Array(utf8Length(string));
  for (var i = 0, k = string.length; i < k; ++i) {
    c1 = string.charCodeAt(i);
    if (c1 < 128) {
      buffer[offset++] = c1;
    } else if (c1 < 2048) {
      buffer[offset++] = c1 >> 6 | 192;
      buffer[offset++] = c1 & 63 | 128;
    } else if ((c1 & 64512) === 55296 && ((c2 = string.charCodeAt(i + 1)) & 64512) === 56320) {
      c1 = 65536 + ((c1 & 1023) << 10) + (c2 & 1023);
      ++i;
      buffer[offset++] = c1 >> 18 | 240;
      buffer[offset++] = c1 >> 12 & 63 | 128;
      buffer[offset++] = c1 >> 6 & 63 | 128;
      buffer[offset++] = c1 & 63 | 128;
    } else {
      buffer[offset++] = c1 >> 12 | 224;
      buffer[offset++] = c1 >> 6 & 63 | 128;
      buffer[offset++] = c1 & 63 | 128;
    }
  }
  return buffer;
}
var BASE64_CODE = "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
var BASE64_INDEX = [
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  0,
  1,
  54,
  55,
  56,
  57,
  58,
  59,
  60,
  61,
  62,
  63,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
  27,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  28,
  29,
  30,
  31,
  32,
  33,
  34,
  35,
  36,
  37,
  38,
  39,
  40,
  41,
  42,
  43,
  44,
  45,
  46,
  47,
  48,
  49,
  50,
  51,
  52,
  53,
  -1,
  -1,
  -1,
  -1,
  -1
];
function base64_encode(b, len) {
  var off = 0, rs = [], c1, c2;
  if (len <= 0 || len > b.length) throw Error("Illegal len: " + len);
  while (off < len) {
    c1 = b[off++] & 255;
    rs.push(BASE64_CODE[c1 >> 2 & 63]);
    c1 = (c1 & 3) << 4;
    if (off >= len) {
      rs.push(BASE64_CODE[c1 & 63]);
      break;
    }
    c2 = b[off++] & 255;
    c1 |= c2 >> 4 & 15;
    rs.push(BASE64_CODE[c1 & 63]);
    c1 = (c2 & 15) << 2;
    if (off >= len) {
      rs.push(BASE64_CODE[c1 & 63]);
      break;
    }
    c2 = b[off++] & 255;
    c1 |= c2 >> 6 & 3;
    rs.push(BASE64_CODE[c1 & 63]);
    rs.push(BASE64_CODE[c2 & 63]);
  }
  return rs.join("");
}
function base64_decode(s, len) {
  var off = 0, slen = s.length, olen = 0, rs = [], c1, c2, c3, c4, o, code;
  if (len <= 0) throw Error("Illegal len: " + len);
  while (off < slen - 1 && olen < len) {
    code = s.charCodeAt(off++);
    c1 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    code = s.charCodeAt(off++);
    c2 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    if (c1 == -1 || c2 == -1) break;
    o = c1 << 2 >>> 0;
    o |= (c2 & 48) >> 4;
    rs.push(String.fromCharCode(o));
    if (++olen >= len || off >= slen) break;
    code = s.charCodeAt(off++);
    c3 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    if (c3 == -1) break;
    o = (c2 & 15) << 4 >>> 0;
    o |= (c3 & 60) >> 2;
    rs.push(String.fromCharCode(o));
    if (++olen >= len || off >= slen) break;
    code = s.charCodeAt(off++);
    c4 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    o = (c3 & 3) << 6 >>> 0;
    o |= c4;
    rs.push(String.fromCharCode(o));
    ++olen;
  }
  var res = [];
  for (off = 0; off < olen; off++) res.push(rs[off].charCodeAt(0));
  return res;
}
var BCRYPT_SALT_LEN = 16;
var GENSALT_DEFAULT_LOG2_ROUNDS = 10;
var BLOWFISH_NUM_ROUNDS = 16;
var MAX_EXECUTION_TIME = 100;
var P_ORIG = [
  608135816,
  2242054355,
  320440878,
  57701188,
  2752067618,
  698298832,
  137296536,
  3964562569,
  1160258022,
  953160567,
  3193202383,
  887688300,
  3232508343,
  3380367581,
  1065670069,
  3041331479,
  2450970073,
  2306472731
];
var S_ORIG = [
  3509652390,
  2564797868,
  805139163,
  3491422135,
  3101798381,
  1780907670,
  3128725573,
  4046225305,
  614570311,
  3012652279,
  134345442,
  2240740374,
  1667834072,
  1901547113,
  2757295779,
  4103290238,
  227898511,
  1921955416,
  1904987480,
  2182433518,
  2069144605,
  3260701109,
  2620446009,
  720527379,
  3318853667,
  677414384,
  3393288472,
  3101374703,
  2390351024,
  1614419982,
  1822297739,
  2954791486,
  3608508353,
  3174124327,
  2024746970,
  1432378464,
  3864339955,
  2857741204,
  1464375394,
  1676153920,
  1439316330,
  715854006,
  3033291828,
  289532110,
  2706671279,
  2087905683,
  3018724369,
  1668267050,
  732546397,
  1947742710,
  3462151702,
  2609353502,
  2950085171,
  1814351708,
  2050118529,
  680887927,
  999245976,
  1800124847,
  3300911131,
  1713906067,
  1641548236,
  4213287313,
  1216130144,
  1575780402,
  4018429277,
  3917837745,
  3693486850,
  3949271944,
  596196993,
  3549867205,
  258830323,
  2213823033,
  772490370,
  2760122372,
  1774776394,
  2652871518,
  566650946,
  4142492826,
  1728879713,
  2882767088,
  1783734482,
  3629395816,
  2517608232,
  2874225571,
  1861159788,
  326777828,
  3124490320,
  2130389656,
  2716951837,
  967770486,
  1724537150,
  2185432712,
  2364442137,
  1164943284,
  2105845187,
  998989502,
  3765401048,
  2244026483,
  1075463327,
  1455516326,
  1322494562,
  910128902,
  469688178,
  1117454909,
  936433444,
  3490320968,
  3675253459,
  1240580251,
  122909385,
  2157517691,
  634681816,
  4142456567,
  3825094682,
  3061402683,
  2540495037,
  79693498,
  3249098678,
  1084186820,
  1583128258,
  426386531,
  1761308591,
  1047286709,
  322548459,
  995290223,
  1845252383,
  2603652396,
  3431023940,
  2942221577,
  3202600964,
  3727903485,
  1712269319,
  422464435,
  3234572375,
  1170764815,
  3523960633,
  3117677531,
  1434042557,
  442511882,
  3600875718,
  1076654713,
  1738483198,
  4213154764,
  2393238008,
  3677496056,
  1014306527,
  4251020053,
  793779912,
  2902807211,
  842905082,
  4246964064,
  1395751752,
  1040244610,
  2656851899,
  3396308128,
  445077038,
  3742853595,
  3577915638,
  679411651,
  2892444358,
  2354009459,
  1767581616,
  3150600392,
  3791627101,
  3102740896,
  284835224,
  4246832056,
  1258075500,
  768725851,
  2589189241,
  3069724005,
  3532540348,
  1274779536,
  3789419226,
  2764799539,
  1660621633,
  3471099624,
  4011903706,
  913787905,
  3497959166,
  737222580,
  2514213453,
  2928710040,
  3937242737,
  1804850592,
  3499020752,
  2949064160,
  2386320175,
  2390070455,
  2415321851,
  4061277028,
  2290661394,
  2416832540,
  1336762016,
  1754252060,
  3520065937,
  3014181293,
  791618072,
  3188594551,
  3933548030,
  2332172193,
  3852520463,
  3043980520,
  413987798,
  3465142937,
  3030929376,
  4245938359,
  2093235073,
  3534596313,
  375366246,
  2157278981,
  2479649556,
  555357303,
  3870105701,
  2008414854,
  3344188149,
  4221384143,
  3956125452,
  2067696032,
  3594591187,
  2921233993,
  2428461,
  544322398,
  577241275,
  1471733935,
  610547355,
  4027169054,
  1432588573,
  1507829418,
  2025931657,
  3646575487,
  545086370,
  48609733,
  2200306550,
  1653985193,
  298326376,
  1316178497,
  3007786442,
  2064951626,
  458293330,
  2589141269,
  3591329599,
  3164325604,
  727753846,
  2179363840,
  146436021,
  1461446943,
  4069977195,
  705550613,
  3059967265,
  3887724982,
  4281599278,
  3313849956,
  1404054877,
  2845806497,
  146425753,
  1854211946,
  1266315497,
  3048417604,
  3681880366,
  3289982499,
  290971e4,
  1235738493,
  2632868024,
  2414719590,
  3970600049,
  1771706367,
  1449415276,
  3266420449,
  422970021,
  1963543593,
  2690192192,
  3826793022,
  1062508698,
  1531092325,
  1804592342,
  2583117782,
  2714934279,
  4024971509,
  1294809318,
  4028980673,
  1289560198,
  2221992742,
  1669523910,
  35572830,
  157838143,
  1052438473,
  1016535060,
  1802137761,
  1753167236,
  1386275462,
  3080475397,
  2857371447,
  1040679964,
  2145300060,
  2390574316,
  1461121720,
  2956646967,
  4031777805,
  4028374788,
  33600511,
  2920084762,
  1018524850,
  629373528,
  3691585981,
  3515945977,
  2091462646,
  2486323059,
  586499841,
  988145025,
  935516892,
  3367335476,
  2599673255,
  2839830854,
  265290510,
  3972581182,
  2759138881,
  3795373465,
  1005194799,
  847297441,
  406762289,
  1314163512,
  1332590856,
  1866599683,
  4127851711,
  750260880,
  613907577,
  1450815602,
  3165620655,
  3734664991,
  3650291728,
  3012275730,
  3704569646,
  1427272223,
  778793252,
  1343938022,
  2676280711,
  2052605720,
  1946737175,
  3164576444,
  3914038668,
  3967478842,
  3682934266,
  1661551462,
  3294938066,
  4011595847,
  840292616,
  3712170807,
  616741398,
  312560963,
  711312465,
  1351876610,
  322626781,
  1910503582,
  271666773,
  2175563734,
  1594956187,
  70604529,
  3617834859,
  1007753275,
  1495573769,
  4069517037,
  2549218298,
  2663038764,
  504708206,
  2263041392,
  3941167025,
  2249088522,
  1514023603,
  1998579484,
  1312622330,
  694541497,
  2582060303,
  2151582166,
  1382467621,
  776784248,
  2618340202,
  3323268794,
  2497899128,
  2784771155,
  503983604,
  4076293799,
  907881277,
  423175695,
  432175456,
  1378068232,
  4145222326,
  3954048622,
  3938656102,
  3820766613,
  2793130115,
  2977904593,
  26017576,
  3274890735,
  3194772133,
  1700274565,
  1756076034,
  4006520079,
  3677328699,
  720338349,
  1533947780,
  354530856,
  688349552,
  3973924725,
  1637815568,
  332179504,
  3949051286,
  53804574,
  2852348879,
  3044236432,
  1282449977,
  3583942155,
  3416972820,
  4006381244,
  1617046695,
  2628476075,
  3002303598,
  1686838959,
  431878346,
  2686675385,
  1700445008,
  1080580658,
  1009431731,
  832498133,
  3223435511,
  2605976345,
  2271191193,
  2516031870,
  1648197032,
  4164389018,
  2548247927,
  300782431,
  375919233,
  238389289,
  3353747414,
  2531188641,
  2019080857,
  1475708069,
  455242339,
  2609103871,
  448939670,
  3451063019,
  1395535956,
  2413381860,
  1841049896,
  1491858159,
  885456874,
  4264095073,
  4001119347,
  1565136089,
  3898914787,
  1108368660,
  540939232,
  1173283510,
  2745871338,
  3681308437,
  4207628240,
  3343053890,
  4016749493,
  1699691293,
  1103962373,
  3625875870,
  2256883143,
  3830138730,
  1031889488,
  3479347698,
  1535977030,
  4236805024,
  3251091107,
  2132092099,
  1774941330,
  1199868427,
  1452454533,
  157007616,
  2904115357,
  342012276,
  595725824,
  1480756522,
  206960106,
  497939518,
  591360097,
  863170706,
  2375253569,
  3596610801,
  1814182875,
  2094937945,
  3421402208,
  1082520231,
  3463918190,
  2785509508,
  435703966,
  3908032597,
  1641649973,
  2842273706,
  3305899714,
  1510255612,
  2148256476,
  2655287854,
  3276092548,
  4258621189,
  236887753,
  3681803219,
  274041037,
  1734335097,
  3815195456,
  3317970021,
  1899903192,
  1026095262,
  4050517792,
  356393447,
  2410691914,
  3873677099,
  3682840055,
  3913112168,
  2491498743,
  4132185628,
  2489919796,
  1091903735,
  1979897079,
  3170134830,
  3567386728,
  3557303409,
  857797738,
  1136121015,
  1342202287,
  507115054,
  2535736646,
  337727348,
  3213592640,
  1301675037,
  2528481711,
  1895095763,
  1721773893,
  3216771564,
  62756741,
  2142006736,
  835421444,
  2531993523,
  1442658625,
  3659876326,
  2882144922,
  676362277,
  1392781812,
  170690266,
  3921047035,
  1759253602,
  3611846912,
  1745797284,
  664899054,
  1329594018,
  3901205900,
  3045908486,
  2062866102,
  2865634940,
  3543621612,
  3464012697,
  1080764994,
  553557557,
  3656615353,
  3996768171,
  991055499,
  499776247,
  1265440854,
  648242737,
  3940784050,
  980351604,
  3713745714,
  1749149687,
  3396870395,
  4211799374,
  3640570775,
  1161844396,
  3125318951,
  1431517754,
  545492359,
  4268468663,
  3499529547,
  1437099964,
  2702547544,
  3433638243,
  2581715763,
  2787789398,
  1060185593,
  1593081372,
  2418618748,
  4260947970,
  69676912,
  2159744348,
  86519011,
  2512459080,
  3838209314,
  1220612927,
  3339683548,
  133810670,
  1090789135,
  1078426020,
  1569222167,
  845107691,
  3583754449,
  4072456591,
  1091646820,
  628848692,
  1613405280,
  3757631651,
  526609435,
  236106946,
  48312990,
  2942717905,
  3402727701,
  1797494240,
  859738849,
  992217954,
  4005476642,
  2243076622,
  3870952857,
  3732016268,
  765654824,
  3490871365,
  2511836413,
  1685915746,
  3888969200,
  1414112111,
  2273134842,
  3281911079,
  4080962846,
  172450625,
  2569994100,
  980381355,
  4109958455,
  2819808352,
  2716589560,
  2568741196,
  3681446669,
  3329971472,
  1835478071,
  660984891,
  3704678404,
  4045999559,
  3422617507,
  3040415634,
  1762651403,
  1719377915,
  3470491036,
  2693910283,
  3642056355,
  3138596744,
  1364962596,
  2073328063,
  1983633131,
  926494387,
  3423689081,
  2150032023,
  4096667949,
  1749200295,
  3328846651,
  309677260,
  2016342300,
  1779581495,
  3079819751,
  111262694,
  1274766160,
  443224088,
  298511866,
  1025883608,
  3806446537,
  1145181785,
  168956806,
  3641502830,
  3584813610,
  1689216846,
  3666258015,
  3200248200,
  1692713982,
  2646376535,
  4042768518,
  1618508792,
  1610833997,
  3523052358,
  4130873264,
  2001055236,
  3610705100,
  2202168115,
  4028541809,
  2961195399,
  1006657119,
  2006996926,
  3186142756,
  1430667929,
  3210227297,
  1314452623,
  4074634658,
  4101304120,
  2273951170,
  1399257539,
  3367210612,
  3027628629,
  1190975929,
  2062231137,
  2333990788,
  2221543033,
  2438960610,
  1181637006,
  548689776,
  2362791313,
  3372408396,
  3104550113,
  3145860560,
  296247880,
  1970579870,
  3078560182,
  3769228297,
  1714227617,
  3291629107,
  3898220290,
  166772364,
  1251581989,
  493813264,
  448347421,
  195405023,
  2709975567,
  677966185,
  3703036547,
  1463355134,
  2715995803,
  1338867538,
  1343315457,
  2802222074,
  2684532164,
  233230375,
  2599980071,
  2000651841,
  3277868038,
  1638401717,
  4028070440,
  3237316320,
  6314154,
  819756386,
  300326615,
  590932579,
  1405279636,
  3267499572,
  3150704214,
  2428286686,
  3959192993,
  3461946742,
  1862657033,
  1266418056,
  963775037,
  2089974820,
  2263052895,
  1917689273,
  448879540,
  3550394620,
  3981727096,
  150775221,
  3627908307,
  1303187396,
  508620638,
  2975983352,
  2726630617,
  1817252668,
  1876281319,
  1457606340,
  908771278,
  3720792119,
  3617206836,
  2455994898,
  1729034894,
  1080033504,
  976866871,
  3556439503,
  2881648439,
  1522871579,
  1555064734,
  1336096578,
  3548522304,
  2579274686,
  3574697629,
  3205460757,
  3593280638,
  3338716283,
  3079412587,
  564236357,
  2993598910,
  1781952180,
  1464380207,
  3163844217,
  3332601554,
  1699332808,
  1393555694,
  1183702653,
  3581086237,
  1288719814,
  691649499,
  2847557200,
  2895455976,
  3193889540,
  2717570544,
  1781354906,
  1676643554,
  2592534050,
  3230253752,
  1126444790,
  2770207658,
  2633158820,
  2210423226,
  2615765581,
  2414155088,
  3127139286,
  673620729,
  2805611233,
  1269405062,
  4015350505,
  3341807571,
  4149409754,
  1057255273,
  2012875353,
  2162469141,
  2276492801,
  2601117357,
  993977747,
  3918593370,
  2654263191,
  753973209,
  36408145,
  2530585658,
  25011837,
  3520020182,
  2088578344,
  530523599,
  2918365339,
  1524020338,
  1518925132,
  3760827505,
  3759777254,
  1202760957,
  3985898139,
  3906192525,
  674977740,
  4174734889,
  2031300136,
  2019492241,
  3983892565,
  4153806404,
  3822280332,
  352677332,
  2297720250,
  60907813,
  90501309,
  3286998549,
  1016092578,
  2535922412,
  2839152426,
  457141659,
  509813237,
  4120667899,
  652014361,
  1966332200,
  2975202805,
  55981186,
  2327461051,
  676427537,
  3255491064,
  2882294119,
  3433927263,
  1307055953,
  942726286,
  933058658,
  2468411793,
  3933900994,
  4215176142,
  1361170020,
  2001714738,
  2830558078,
  3274259782,
  1222529897,
  1679025792,
  2729314320,
  3714953764,
  1770335741,
  151462246,
  3013232138,
  1682292957,
  1483529935,
  471910574,
  1539241949,
  458788160,
  3436315007,
  1807016891,
  3718408830,
  978976581,
  1043663428,
  3165965781,
  1927990952,
  4200891579,
  2372276910,
  3208408903,
  3533431907,
  1412390302,
  2931980059,
  4132332400,
  1947078029,
  3881505623,
  4168226417,
  2941484381,
  1077988104,
  1320477388,
  886195818,
  18198404,
  3786409e3,
  2509781533,
  112762804,
  3463356488,
  1866414978,
  891333506,
  18488651,
  661792760,
  1628790961,
  3885187036,
  3141171499,
  876946877,
  2693282273,
  1372485963,
  791857591,
  2686433993,
  3759982718,
  3167212022,
  3472953795,
  2716379847,
  445679433,
  3561995674,
  3504004811,
  3574258232,
  54117162,
  3331405415,
  2381918588,
  3769707343,
  4154350007,
  1140177722,
  4074052095,
  668550556,
  3214352940,
  367459370,
  261225585,
  2610173221,
  4209349473,
  3468074219,
  3265815641,
  314222801,
  3066103646,
  3808782860,
  282218597,
  3406013506,
  3773591054,
  379116347,
  1285071038,
  846784868,
  2669647154,
  3771962079,
  3550491691,
  2305946142,
  453669953,
  1268987020,
  3317592352,
  3279303384,
  3744833421,
  2610507566,
  3859509063,
  266596637,
  3847019092,
  517658769,
  3462560207,
  3443424879,
  370717030,
  4247526661,
  2224018117,
  4143653529,
  4112773975,
  2788324899,
  2477274417,
  1456262402,
  2901442914,
  1517677493,
  1846949527,
  2295493580,
  3734397586,
  2176403920,
  1280348187,
  1908823572,
  3871786941,
  846861322,
  1172426758,
  3287448474,
  3383383037,
  1655181056,
  3139813346,
  901632758,
  1897031941,
  2986607138,
  3066810236,
  3447102507,
  1393639104,
  373351379,
  950779232,
  625454576,
  3124240540,
  4148612726,
  2007998917,
  544563296,
  2244738638,
  2330496472,
  2058025392,
  1291430526,
  424198748,
  50039436,
  29584100,
  3605783033,
  2429876329,
  2791104160,
  1057563949,
  3255363231,
  3075367218,
  3463963227,
  1469046755,
  985887462
];
var C_ORIG = [
  1332899944,
  1700884034,
  1701343084,
  1684370003,
  1668446532,
  1869963892
];
function _encipher(lr, off, P, S) {
  var n, l = lr[off], r = lr[off + 1];
  l ^= P[0];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[1];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[2];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[3];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[4];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[5];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[6];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[7];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[8];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[9];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[10];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[11];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[12];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[13];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[14];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[15];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[16];
  lr[off] = r ^ P[BLOWFISH_NUM_ROUNDS + 1];
  lr[off + 1] = l;
  return lr;
}
function _streamtoword(data, offp) {
  for (var i = 0, word = 0; i < 4; ++i)
    word = word << 8 | data[offp] & 255, offp = (offp + 1) % data.length;
  return { key: word, offp };
}
function _key(key, P, S) {
  var offset = 0, lr = [0, 0], plen = P.length, slen = S.length, sw;
  for (var i = 0; i < plen; i++)
    sw = _streamtoword(key, offset), offset = sw.offp, P[i] = P[i] ^ sw.key;
  for (i = 0; i < plen; i += 2)
    lr = _encipher(lr, 0, P, S), P[i] = lr[0], P[i + 1] = lr[1];
  for (i = 0; i < slen; i += 2)
    lr = _encipher(lr, 0, P, S), S[i] = lr[0], S[i + 1] = lr[1];
}
function _ekskey(data, key, P, S) {
  var offp = 0, lr = [0, 0], plen = P.length, slen = S.length, sw;
  for (var i = 0; i < plen; i++)
    sw = _streamtoword(key, offp), offp = sw.offp, P[i] = P[i] ^ sw.key;
  offp = 0;
  for (i = 0; i < plen; i += 2)
    sw = _streamtoword(data, offp), offp = sw.offp, lr[0] ^= sw.key, sw = _streamtoword(data, offp), offp = sw.offp, lr[1] ^= sw.key, lr = _encipher(lr, 0, P, S), P[i] = lr[0], P[i + 1] = lr[1];
  for (i = 0; i < slen; i += 2)
    sw = _streamtoword(data, offp), offp = sw.offp, lr[0] ^= sw.key, sw = _streamtoword(data, offp), offp = sw.offp, lr[1] ^= sw.key, lr = _encipher(lr, 0, P, S), S[i] = lr[0], S[i + 1] = lr[1];
}
function _crypt(b, salt, rounds, callback, progressCallback) {
  var cdata = C_ORIG.slice(), clen = cdata.length, err;
  if (rounds < 4 || rounds > 31) {
    err = Error("Illegal number of rounds (4-31): " + rounds);
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  if (salt.length !== BCRYPT_SALT_LEN) {
    err = Error(
      "Illegal salt length: " + salt.length + " != " + BCRYPT_SALT_LEN
    );
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  rounds = 1 << rounds >>> 0;
  var P, S, i = 0, j;
  if (typeof Int32Array === "function") {
    P = new Int32Array(P_ORIG);
    S = new Int32Array(S_ORIG);
  } else {
    P = P_ORIG.slice();
    S = S_ORIG.slice();
  }
  _ekskey(salt, b, P, S);
  function next() {
    if (progressCallback) progressCallback(i / rounds);
    if (i < rounds) {
      var start = Date.now();
      for (; i < rounds; ) {
        i = i + 1;
        _key(b, P, S);
        _key(salt, P, S);
        if (Date.now() - start > MAX_EXECUTION_TIME) break;
      }
    } else {
      for (i = 0; i < 64; i++)
        for (j = 0; j < clen >> 1; j++) _encipher(cdata, j << 1, P, S);
      var ret = [];
      for (i = 0; i < clen; i++)
        ret.push((cdata[i] >> 24 & 255) >>> 0), ret.push((cdata[i] >> 16 & 255) >>> 0), ret.push((cdata[i] >> 8 & 255) >>> 0), ret.push((cdata[i] & 255) >>> 0);
      if (callback) {
        callback(null, ret);
        return;
      } else return ret;
    }
    if (callback) nextTick(next);
  }
  if (typeof callback !== "undefined") {
    next();
  } else {
    var res;
    while (true) if (typeof (res = next()) !== "undefined") return res || [];
  }
}
function _hash(password, salt, callback, progressCallback) {
  var err;
  if (typeof password !== "string" || typeof salt !== "string") {
    err = Error("Invalid string / salt: Not a string");
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  var minor, offset;
  if (salt.charAt(0) !== "$" || salt.charAt(1) !== "2") {
    err = Error("Invalid salt version: " + salt.substring(0, 2));
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  if (salt.charAt(2) === "$") minor = String.fromCharCode(0), offset = 3;
  else {
    minor = salt.charAt(2);
    if (minor !== "a" && minor !== "b" && minor !== "y" || salt.charAt(3) !== "$") {
      err = Error("Invalid salt revision: " + salt.substring(2, 4));
      if (callback) {
        nextTick(callback.bind(this, err));
        return;
      } else throw err;
    }
    offset = 4;
  }
  if (salt.charAt(offset + 2) > "$") {
    err = Error("Missing salt rounds");
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  var r1 = parseInt(salt.substring(offset, offset + 1), 10) * 10, r2 = parseInt(salt.substring(offset + 1, offset + 2), 10), rounds = r1 + r2, real_salt = salt.substring(offset + 3, offset + 25);
  password += minor >= "a" ? "\0" : "";
  var passwordb = utf8Array(password), saltb = base64_decode(real_salt, BCRYPT_SALT_LEN);
  function finish(bytes) {
    var res = [];
    res.push("$2");
    if (minor >= "a") res.push(minor);
    res.push("$");
    if (rounds < 10) res.push("0");
    res.push(rounds.toString());
    res.push("$");
    res.push(base64_encode(saltb, saltb.length));
    res.push(base64_encode(bytes, C_ORIG.length * 4 - 1));
    return res.join("");
  }
  if (typeof callback == "undefined")
    return finish(_crypt(passwordb, saltb, rounds));
  else {
    _crypt(
      passwordb,
      saltb,
      rounds,
      function(err2, bytes) {
        if (err2) callback(err2, null);
        else callback(null, finish(bytes));
      },
      progressCallback
    );
  }
}
function encodeBase64(bytes, length) {
  return base64_encode(bytes, length);
}
function decodeBase64(string, length) {
  return base64_decode(string, length);
}
var bcryptjs_default = {
  setRandomFallback,
  genSaltSync,
  genSalt,
  hashSync,
  hash,
  compareSync,
  compare,
  getRounds,
  getSalt,
  truncates,
  encodeBase64,
  decodeBase64
};

// plugins/zhao-auth/server/src/services/auth.service.ts
var USER_UID = "plugin::users-permissions.user";
var ssoCache = null;
var SSO_CACHE_TTL = 5 * 60 * 1e3;
var auth_service_default = ({ strapi: strapi2 }) => {
  function throwErr2(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  const getJwtService = () => strapi2.plugin("zhao-auth").service("jwt");
  const normalizeUser = (decoded) => {
    const user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      roles: []
    };
    if (Array.isArray(decoded.zhaoRoles) && decoded.zhaoRoles.length > 0) {
      user.roles = decoded.zhaoRoles.map((r) => typeof r === "string" ? r : r?.name || r?.type || r?.role).filter((r) => r && r.trim() !== "");
    } else if (Array.isArray(decoded.roles) && decoded.roles.length > 0) {
      user.roles = decoded.roles.map((r) => typeof r === "string" ? r : r?.name || r?.type || r?.role).filter((r) => r && r.trim() !== "");
    } else if (typeof decoded.role === "string" && decoded.role.trim()) {
      user.roles = [decoded.role];
    } else if (decoded.role && typeof decoded.role === "object") {
      if (decoded.role.type) {
        user.roles = [decoded.role.type];
      } else if (decoded.role.name) {
        user.roles = [decoded.role.name];
      }
    }
    const normalizedRoles = user.roles;
    Object.assign(user, decoded);
    user.roles = normalizedRoles;
    return user;
  };
  return {
    /**
     * 验证 JWT token，返回用户信息
     * 如 JWT 中无角色信息，从数据库加载
     */
    async authenticate(token) {
      try {
        const decoded = await getJwtService().verify(token);
        const user = normalizeUser(decoded);
        if (!Array.isArray(user.roles) || user.roles.length === 0) {
          strapi2.log.debug("[zhao-auth] JWT \u4E2D\u6CA1\u6709\u89D2\u8272\uFF0C\u4ECE\u6570\u636E\u5E93\u52A0\u8F7D");
          try {
            const dbUser = await strapi2.db.query("plugin::users-permissions.user").findOne({
              where: { id: user.id },
              populate: ["role"]
            });
            if (dbUser) {
              if (Array.isArray(dbUser.zhaoRoles) && dbUser.zhaoRoles.length > 0) {
                user.roles = dbUser.zhaoRoles.map((r) => typeof r === "string" ? r : String(r)).filter((r) => r && r.trim());
              } else if (dbUser.role) {
                if (Array.isArray(dbUser.role)) {
                  user.roles = dbUser.role.map((r) => r?.type).filter((type) => type && type.trim());
                } else if (dbUser.role.type) {
                  user.roles = [dbUser.role.type];
                }
              } else {
                user.roles = [];
              }
            }
            strapi2.log.debug(`[zhao-auth] Loaded roles from DB for user ${user.id}: ${JSON.stringify(user.roles)}`);
          } catch (err) {
            strapi2.log.error("[zhao-auth] \u4ECE\u6570\u636E\u5E93\u52A0\u8F7D\u89D2\u8272\u5931\u8D25:", err);
          }
        }
        return user;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throwErr2("AUTH_001", 401, `\u8BA4\u8BC1\u5931\u8D25: ${message}`);
      }
    },
    /**
     * 兼容保留：策略链执行
     * 新代码应使用 Strapi 原生 config.policies 机制
     */
    async authorize(context, policies) {
      if (!policies || policies.length === 0) {
        return { passed: true };
      }
      const user = context.user;
      if (!user?.id) {
        return { passed: false, code: "UNAUTHENTICATED", message: "\u672A\u8BA4\u8BC1" };
      }
      return { passed: true };
    },
    extractToken(ctx) {
      return getJwtService().extractToken(ctx);
    },
    getUser(ctx) {
      return ctx.state.user || null;
    },
    /**
    * 按用户名或邮箱查找用户（注册时用）
    */
    async findUserByIdentifier(username, email) {
      return strapi2.db.query(USER_UID).findOne({
        where: {
          $or: [
            { username },
            { email: email.toLowerCase() }
          ]
        }
      });
    },
    /**
     * 按用户名或邮箱查找本地认证用户（登录时用）
     */
    async findUserForLogin(identifier) {
      return strapi2.db.query(USER_UID).findOne({
        where: {
          provider: "local",
          $or: [
            { email: identifier.toLowerCase() },
            { username: identifier }
          ]
        },
        populate: ["role"]
      });
    },
    /**
     * 创建用户
     */
    async createUser(data) {
      const hashedPassword = await bcryptjs_default.hash(data.password, 10);
      return strapi2.db.query(USER_UID).create({
        data: {
          username: data.username,
          email: data.email.toLowerCase(),
          password: hashedPassword,
          provider: "local",
          confirmed: true,
          blocked: false
        }
      });
    },
    /**
     * 更新用户密码
     */
    async updateUserPassword(userId, newPassword) {
      const hashedPassword = await bcryptjs_default.hash(newPassword, 10);
      return strapi2.db.query(USER_UID).update({
        where: { id: userId },
        data: { password: hashedPassword }
      });
    },
    /**
     * 检查 SSO 是否启用
     */
    async isSsoEnabled() {
      if (ssoCache && Date.now() < ssoCache.expireAt) {
        return { enabled: ssoCache.enabled, loginUrl: ssoCache.loginUrl };
      }
      try {
        const ssoFlag = await strapi2.documents("plugin::zhao-common.feature-flag").findMany({
          filters: { flagKey: "sso_enabled" }
        });
        const flag = Array.isArray(ssoFlag) ? ssoFlag[0] : null;
        if (flag && flag.flagValue === true && flag.enabled !== false) {
          const loginUrl = strapi2.plugin("zhao-sso")?.config?.("loginUrl") || "/sso/login";
          ssoCache = { enabled: true, loginUrl, expireAt: Date.now() + SSO_CACHE_TTL };
          return { enabled: true, loginUrl };
        }
      } catch {
      }
      ssoCache = { enabled: false, loginUrl: "", expireAt: Date.now() + SSO_CACHE_TTL };
      return { enabled: false, loginUrl: "" };
    },
    /**
     * 本地登录验证
     */
    async localLogin(identifier, password) {
      const user = await this.findUserForLogin(identifier);
      if (!user) {
        return { success: false, error: "Invalid identifier or password" };
      }
      const isValidPassword = await bcryptjs_default.compare(password, user.password);
      if (!isValidPassword) {
        return { success: false, error: "Invalid identifier or password" };
      }
      if (user.blocked) {
        return { success: false, error: "\u8D26\u6237\u5DF2\u88AB\u9501\u5B9A" };
      }
      let roles = [];
      let formattedRole = null;
      if (Array.isArray(user.zhaoRoles) && user.zhaoRoles.length > 0) {
        roles = user.zhaoRoles.map((r) => typeof r === "string" ? r : String(r)).filter((r) => r && r.trim());
        formattedRole = roles.map((r) => ({ name: r, type: r }));
      } else if (user.role) {
        if (Array.isArray(user.role)) {
          roles = user.role.map((r) => r?.type).filter((type) => type && type.trim());
          formattedRole = user.role.map((r) => ({ id: r.id, name: r.name, type: r.type }));
        } else if (user.role.type) {
          roles = [user.role.type];
          formattedRole = { id: user.role.id, name: user.role.name, type: user.role.type };
        }
      }
      return { success: true, user, roles, formattedRole };
    },
    /**
     * 兼容保留：策略注册
     * 新代码应通过 Strapi 原生 policies 导出机制注册
     */
    registerPolicy(_name, _handler) {
    }
  };
};

// plugins/zhao-auth/server/src/services/jwt.service.ts
var import_jsonwebtoken = __toESM(require_jsonwebtoken());
var jwt_service_default = ({ strapi: strapi2 }) => {
  function throwErr2(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  let cachedSecret = null;
  const getSecret = () => {
    if (cachedSecret) return cachedSecret;
    const isValidSecret = (secret) => typeof secret === "string" && secret.trim() !== "";
    try {
      const apiJwt = strapi2.config.get("plugin::users-permissions.jwtSecret");
      if (isValidSecret(apiJwt)) {
        cachedSecret = apiJwt;
        return cachedSecret;
      }
    } catch {
    }
    try {
      const adminJwt = strapi2.config.get("admin.auth.secret");
      if (isValidSecret(adminJwt)) {
        cachedSecret = adminJwt;
        return cachedSecret;
      }
    } catch {
    }
    const envJwt = process.env.JWT_SECRET;
    if (isValidSecret(envJwt)) {
      cachedSecret = envJwt;
      return cachedSecret;
    }
    throwErr2(
      "JWT_001",
      500,
      "JWT secret not configured. Set JWT_SECRET env or configure users-permissions plugin."
    );
  };
  const refreshSecret = () => {
    cachedSecret = null;
  };
  const extractToken = (ctx) => {
    const authHeader = ctx.request?.headers?.authorization || ctx.headers?.authorization;
    if (!authHeader || typeof authHeader !== "string") return null;
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return null;
    return parts[1];
  };
  return {
    async verify(token, secret, options) {
      const resolvedSecret = secret || getSecret();
      return import_jsonwebtoken.default.verify(token, resolvedSecret, options);
    },
    async sign(payload, options) {
      const secret = getSecret();
      const signOptions = { expiresIn: "30d", ...options };
      return import_jsonwebtoken.default.sign(payload, secret, signOptions);
    },
    getSecret,
    extractToken,
    refreshSecret
    // 可选暴露，便于测试
  };
};

// plugins/zhao-auth/server/src/services/role-management.service.ts
init_permissions();
var USER_UID2 = "plugin::users-permissions.user";
function throwErr(code, status, message) {
  const e = new Error(message);
  e.code = code;
  e.status = status;
  throw e;
}
var ROLE_HIERARCHY = {
  admin: 100,
  "channel-admin": 80,
  "plugin-manager": 60,
  instructor: 40,
  user: 20
};
var ROLE_INHERITANCE = {
  admin: ["channel-admin", "plugin-manager", "instructor", "user"],
  "channel-admin": ["plugin-manager", "instructor", "user"],
  "plugin-manager": ["instructor", "user"],
  instructor: ["user"],
  user: []
};
var CACHE_TTL = 3e5;
var permissionCache = /* @__PURE__ */ new Map();
function invalidateUserCache(userId) {
  permissionCache.delete(userId);
}
function extractRoleNames(user) {
  if (Array.isArray(user.zhaoRoles) && user.zhaoRoles.length > 0) {
    return user.zhaoRoles.map((r) => typeof r === "string" ? r : String(r)).filter((name) => name && name.trim());
  }
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles.map((r) => typeof r === "string" ? r : r?.name || r?.type).filter((name) => name && name.trim());
  }
  if (user.role) {
    if (Array.isArray(user.role)) {
      return user.role.map((r) => r?.name || r?.type).filter((name2) => name2 && name2.trim());
    }
    const name = user.role.name || user.role.type;
    return name ? [name] : [];
  }
  return [];
}
var PERMISSION_UID = "plugin::zhao-auth.permission";
async function getRoleLevel(role) {
  if (ROLE_HIERARCHY[role] != null) return ROLE_HIERARCHY[role];
  const roleRecord = await strapi.db.query(PERMISSION_UID).findOne({
    where: { role },
    select: ["level"]
  });
  return roleRecord?.level ?? 20;
}
async function getUserLevel(userId) {
  const user = await strapi.db.query(USER_UID2).findOne({
    where: { id: userId },
    select: ["zhaoRoles"],
    populate: ["role"]
  });
  if (!user) return 20;
  const roles = extractRoleNames(user);
  if (roles.length === 0) return 20;
  const levels = await Promise.all(roles.map(getRoleLevel));
  return Math.max(...levels);
}
async function computeOperatorOwnedRoles(operatorId, operatorTenantDocumentId) {
  const operator = await strapi.db.query(USER_UID2).findOne({
    where: { id: operatorId },
    select: ["zhaoRoles"]
  });
  const operatorRoles = Array.isArray(operator?.zhaoRoles) ? operator.zhaoRoles.map((r) => typeof r === "string" ? r : String(r)).filter((r) => r && r.trim()) : [];
  if (operatorRoles.includes("admin")) {
    const { ROLES: ROLES2 } = await Promise.resolve().then(() => (init_permissions(), permissions_exports));
    return Object.values(ROLES2);
  }
  const ownedSet = new Set(operatorRoles);
  try {
    const moduleVisibility = await strapi.plugin("zhao-auth").service("permission").resolveModuleVisibility(operatorTenantDocumentId);
    const { MODULE_MANAGER_MAP: MODULE_MANAGER_MAP2 } = await Promise.resolve().then(() => (init_permissions(), permissions_exports));
    for (const [moduleKey, roles] of Object.entries(moduleVisibility)) {
      if (roles.includes("channel-admin")) {
        const managerRole = MODULE_MANAGER_MAP2[moduleKey];
        if (managerRole) {
          ownedSet.add(managerRole);
        }
      }
    }
  } catch {
  }
  return Array.from(ownedSet);
}
async function resolveTenantUserIds(operatorId, _tenantDocumentId) {
  try {
    const operatorChannels = await strapi.db.query("plugin::zhao-channel.channel-member").findMany({
      where: { user: operatorId, isCurrent: true },
      populate: { channel: { select: ["id"] } }
    });
    const operatorChannelIds = operatorChannels.map((cm) => cm.channel?.id).filter(Boolean);
    if (operatorChannelIds.length === 0) return null;
    const targetMembers = await strapi.db.query("plugin::zhao-channel.channel-member").findMany({
      where: { channel: { id: { $in: operatorChannelIds } } },
      populate: { user: { select: ["id"] } }
    });
    return targetMembers.map((m) => m.user?.id).filter((id) => id != null);
  } catch {
    return null;
  }
}
async function annotateUserRoles(user, tenantDocumentId) {
  const { ROLE_LABELS: ROLE_LABELS2 } = await Promise.resolve().then(() => (init_permissions(), permissions_exports));
  const directRoles = extractRoleNames(user);
  const isAdmin = directRoles.includes("admin");
  let autoRoles = /* @__PURE__ */ new Set();
  if (!isAdmin) {
    try {
      const moduleVisibility = await strapi.plugin("zhao-auth").service("permission").resolveModuleVisibility(tenantDocumentId);
      const { MODULE_MANAGER_MAP: MODULE_MANAGER_MAP2 } = await Promise.resolve().then(() => (init_permissions(), permissions_exports));
      for (const [moduleKey, roles] of Object.entries(moduleVisibility)) {
        if (roles.includes("channel-admin")) {
          const managerRole = MODULE_MANAGER_MAP2[moduleKey];
          if (managerRole) autoRoles.add(managerRole);
        }
      }
    } catch {
    }
  }
  const mergedRoles = new Set(directRoles);
  for (const r of autoRoles) mergedRoles.add(r);
  return Array.from(mergedRoles).map((role) => {
    let source = "explicit";
    let sourceDescription = "\u663E\u5F0F\u5206\u914D";
    if (isAdmin) {
      source = "explicit";
      sourceDescription = "admin \u663E\u5F0F\u5206\u914D";
    } else if (directRoles.includes(role) && autoRoles.has(role)) {
      source = "explicit";
      sourceDescription = "\u663E\u5F0F\u5206\u914D\uFF08\u540C\u65F6\u4E3A moduleVisibility \u81EA\u52A8\u6388\u6743\u89D2\u8272\uFF09";
    } else if (autoRoles.has(role)) {
      source = "auto";
      sourceDescription = "moduleVisibility \u81EA\u52A8\u6388\u6743";
    } else {
      const CORE_ROLES = ["channel-admin", "instructor", "user", "plugin-manager", "admin"];
      if (CORE_ROLES.includes(role)) {
        source = "core";
        sourceDescription = "\u6838\u5FC3\u89D2\u8272";
      } else {
        source = "explicit";
        sourceDescription = "admin \u663E\u5F0F\u5206\u914D";
      }
    }
    return {
      role,
      label: ROLE_LABELS2[role] || role,
      source,
      sourceDescription
    };
  });
}
var role_management_service_default = ({ strapi: strapi2 }) => {
  async function getUserEffectivePermissions(userId) {
    const cached = permissionCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    const user = await strapi2.db.query(USER_UID2).findOne({
      where: { id: userId },
      select: ["id", "zhaoRoles"],
      populate: ["role"]
    });
    if (!user) {
      return { direct: [], inherited: [], effective: [] };
    }
    let directRoles = [];
    if (Array.isArray(user.zhaoRoles) && user.zhaoRoles.length > 0) {
      directRoles = user.zhaoRoles.map((r) => typeof r === "string" ? r : String(r)).filter((name) => name && name.trim());
    } else if (user.role?.type) {
      directRoles = [user.role.type];
    } else if (user.role?.name) {
      directRoles = [user.role.name];
    }
    const inheritedRoles = [];
    for (const role of directRoles) {
      const parents = ROLE_INHERITANCE[role];
      if (parents) {
        for (const parent of parents) {
          if (!inheritedRoles.includes(parent)) {
            inheritedRoles.push(parent);
          }
        }
      }
    }
    const effective = [...directRoles, ...inheritedRoles];
    const permissions = {
      direct: directRoles,
      inherited: inheritedRoles,
      effective
    };
    permissionCache.set(userId, { data: permissions, timestamp: Date.now() });
    return permissions;
  }
  return {
    /**
     * 查询用户列表
     * @param filters 筛选条件（支持 username/email/role）
     * @param page 页码
     * @param pageSize 每页数量
     * @param operatorId 操作者 ID（用于租户过滤）
     * @param tenantDocumentId 当前租户 documentId（来自 ctx.state.siteDocumentId）
     */
    async findUsers(filters = {}, page = 1, pageSize = 20, operatorId, tenantDocumentId) {
      const where = {};
      if (filters["filters[username][$contains]"]) {
        where.username = { $contains: filters["filters[username][$contains]"] };
      } else if (filters.username) {
        where.username = { $contains: filters.username };
      }
      if (filters["filters[email][$contains]"]) {
        where.email = { $contains: filters["filters[email][$contains]"] };
      } else if (filters.email) {
        where.email = { $contains: filters.email };
      }
      const roleFilter = filters["filters[role][$contains]"] || filters.role;
      if (roleFilter) {
        where.zhaoRoles = { $contains: roleFilter };
      }
      let tenantUserIds = null;
      if (operatorId) {
        const operator = await strapi2.db.query(USER_UID2).findOne({
          where: { id: operatorId },
          select: ["zhaoRoles"]
        });
        const operatorRoles = Array.isArray(operator?.zhaoRoles) ? operator.zhaoRoles.map((r) => typeof r === "string" ? r : String(r)).filter((r) => r && r.trim()) : [];
        const isAdmin = operatorRoles.includes("admin");
        if (!isAdmin) {
          tenantUserIds = await resolveTenantUserIds(operatorId, tenantDocumentId);
          if (tenantUserIds && tenantUserIds.length > 0) {
            where.id = { $in: tenantUserIds };
          } else if (tenantUserIds && tenantUserIds.length === 0) {
            return {
              list: [],
              pagination: { page, pageSize, total: 0, pageCount: 0 }
            };
          }
        }
      }
      const users = await strapi2.db.query(USER_UID2).findMany({
        where,
        select: ["id", "email", "username", "createdAt", "zhaoRoles"],
        populate: ["role"],
        orderBy: { id: "asc" },
        offset: (page - 1) * pageSize,
        limit: pageSize
      });
      const total = await strapi2.db.query(USER_UID2).count({ where });
      const list = await Promise.all(
        users.map(async (user) => {
          const rolesWithSource = await annotateUserRoles(user, tenantDocumentId);
          return {
            id: user.id,
            documentId: user.id,
            username: user.username,
            email: user.email,
            roles: rolesWithSource.map((r) => r.role),
            roleSources: rolesWithSource,
            createdAt: user.createdAt
          };
        })
      );
      return {
        list,
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize)
        }
      };
    },
    /**
     * 分配角色给用户
     *
     * 业务约束：
     * - channel-admin 角色仅可分配给 ADMIN_CHANNEL_TIERS 渠道所有者
     * - 非 admin 操作者只能分配自己拥有的角色（子集校验，ROLE_006）
     * - 非 admin 操作者只能分配自己渠道内成员（ROLE_005）
     *
     * @param userId 用户ID
     * @param role 角色名称
     * @param operatorId 操作人ID
     * @param reason 操作原因
     * @param operatorTenantDocumentId 操作者当前租户 documentId（来自 ctx.state.siteDocumentId）
     */
    async assignRole(userId, role, operatorId, reason, operatorTenantDocumentId) {
      if (!role || typeof role !== "string" || !role.trim()) {
        throwErr("INVALID_ROLE", 400, `\u89D2\u8272\u540D\u4E0D\u80FD\u4E3A\u7A7A`);
      }
      const normalizedRole = role.trim();
      const user = await strapi2.db.query(USER_UID2).findOne({
        where: { id: userId },
        select: ["id", "zhaoRoles"],
        populate: ["role"]
      });
      if (!user) {
        throwErr("USER_NOT_FOUND", 404, "\u7528\u6237\u4E0D\u5B58\u5728");
      }
      const currentRoles = extractRoleNames(user);
      if (currentRoles.includes(normalizedRole)) {
        throwErr("ROLE_ALREADY_ASSIGNED", 409, `\u7528\u6237\u5DF2\u62E5\u6709\u89D2\u8272: ${normalizedRole}`);
      }
      const operatorLevel = await getUserLevel(operatorId);
      const isOperatorAdmin = operatorLevel >= 100;
      if (!isOperatorAdmin) {
        const targetLevel = await getRoleLevel(normalizedRole);
        if (targetLevel > operatorLevel) {
          throwErr("ROLE_004", 403, "\u4E0D\u80FD\u5206\u914D\u540C\u7EA7\u6216\u66F4\u9AD8\u5C42\u7EA7\u89D2\u8272");
        }
      }
      if (!isOperatorAdmin) {
        const operatorChannels = await strapi2.db.query("plugin::zhao-channel.channel-member").findMany({
          where: { user: operatorId, isCurrent: true },
          populate: { channel: { select: ["id"] } }
        });
        const operatorChannelIds = operatorChannels.map((cm) => cm.channel?.id).filter(Boolean);
        if (operatorChannelIds.length === 0) {
          throwErr("ROLE_005", 403, "\u64CD\u4F5C\u8005\u672A\u5F52\u5C5E\u4EFB\u4F55\u6E20\u9053");
        }
        const targetUserChannels = await strapi2.db.query("plugin::zhao-channel.channel-member").findMany({
          where: { user: userId, channel: { id: { $in: operatorChannelIds } } }
        });
        if (targetUserChannels.length === 0) {
          throwErr("ROLE_005", 403, "\u53EA\u80FD\u5206\u914D\u81EA\u5DF1\u6E20\u9053\u5185\u6210\u5458");
        }
      }
      if (!isOperatorAdmin) {
        const ownedRoles = await computeOperatorOwnedRoles(operatorId, operatorTenantDocumentId);
        if (!ownedRoles.includes(normalizedRole)) {
          throwErr(
            "ROLE_006",
            403,
            `\u53EA\u80FD\u5206\u914D\u81EA\u5DF1\u62E5\u6709\u7684\u89D2\u8272\uFF0C\u672A\u62E5\u6709: ${normalizedRole}`
          );
        }
      }
      const newRoles = [...currentRoles, normalizedRole];
      await strapi2.db.query(USER_UID2).update({
        where: { id: userId },
        data: { zhaoRoles: newRoles }
      });
      if (!isOperatorAdmin) {
        const operatorChannels = await strapi2.db.query("plugin::zhao-channel.channel-member").findMany({
          where: { user: operatorId, isCurrent: true },
          populate: { channel: { select: ["id"] } }
        });
        const currentChannelId = operatorChannels[0]?.channel?.id;
        if (currentChannelId != null) {
          const existing = await strapi2.db.query("plugin::zhao-auth.role-channel").findOne({
            where: { role: normalizedRole, channel: currentChannelId }
          });
          if (!existing) {
            await strapi2.db.query("plugin::zhao-auth.role-channel").create({
              data: { role: normalizedRole, channel: currentChannelId, assignedBy: operatorId }
            });
          }
        }
      }
      invalidateUserCache(userId);
      try {
        strapi2.plugin("zhao-auth")?.service("permission")?.invalidateCache?.(userId);
      } catch {
      }
      await this.logAction(operatorId, userId, "assign", role, reason);
      return {
        success: true,
        message: `\u89D2\u8272 ${role} \u5206\u914D\u6210\u529F`,
        user: {
          id: userId,
          roles: newRoles
        }
      };
    },
    /**
     * 撤销用户角色
     * - 非 admin：渠道校验（只能撤销自己渠道内成员）+ 子集校验（只能撤销自己拥有的角色）
     * - 保留"至少一个角色"校验
     *
     * @param userId 用户ID
     * @param role 角色名称
     * @param operatorId 操作人ID
     * @param reason 操作原因
     * @param operatorTenantDocumentId 操作者当前租户 documentId
     */
    async revokeRole(userId, role, operatorId, reason, operatorTenantDocumentId) {
      const user = await strapi2.db.query(USER_UID2).findOne({
        where: { id: userId },
        select: ["id", "zhaoRoles"],
        populate: ["role"]
      });
      if (!user) {
        throwErr("USER_NOT_FOUND", 404, "\u7528\u6237\u4E0D\u5B58\u5728");
      }
      const currentRoles = extractRoleNames(user);
      if (!currentRoles.includes(role)) {
        throwErr("ROLE_NOT_ASSIGNED", 400, `\u7528\u6237\u672A\u62E5\u6709\u89D2\u8272: ${role}`);
      }
      if (currentRoles.length === 1) {
        throwErr("MIN_ROLE_REQUIRED", 400, "\u7528\u6237\u81F3\u5C11\u9700\u8981\u62E5\u6709\u4E00\u4E2A\u89D2\u8272");
      }
      const operatorLevel = await getUserLevel(operatorId);
      const isOperatorAdmin = operatorLevel >= 100;
      if (!isOperatorAdmin) {
        const operatorChannels = await strapi2.db.query("plugin::zhao-channel.channel-member").findMany({
          where: { user: operatorId, isCurrent: true },
          populate: { channel: { select: ["id"] } }
        });
        const operatorChannelIds = operatorChannels.map((cm) => cm.channel?.id).filter(Boolean);
        if (operatorChannelIds.length === 0) {
          throwErr("ROLE_005", 403, "\u64CD\u4F5C\u8005\u672A\u5F52\u5C5E\u4EFB\u4F55\u6E20\u9053");
        }
        const targetUserChannels = await strapi2.db.query("plugin::zhao-channel.channel-member").findMany({
          where: { user: userId, channel: { id: { $in: operatorChannelIds } } }
        });
        if (targetUserChannels.length === 0) {
          throwErr("ROLE_005", 403, "\u53EA\u80FD\u64A4\u9500\u81EA\u5DF1\u6E20\u9053\u5185\u6210\u5458\u7684\u89D2\u8272");
        }
        const ownedRoles = await computeOperatorOwnedRoles(operatorId, operatorTenantDocumentId);
        if (!ownedRoles.includes(role)) {
          throwErr(
            "ROLE_006",
            403,
            `\u53EA\u80FD\u64A4\u9500\u81EA\u5DF1\u62E5\u6709\u7684\u89D2\u8272\uFF0C\u672A\u62E5\u6709: ${role}`
          );
        }
      }
      const newRoles = currentRoles.filter((r) => r !== role);
      await strapi2.db.query(USER_UID2).update({
        where: { id: userId },
        data: { zhaoRoles: newRoles }
      });
      invalidateUserCache(userId);
      try {
        strapi2.plugin("zhao-auth")?.service("permission")?.invalidateCache?.(userId);
      } catch {
      }
      await this.logAction(operatorId, userId, "revoke", role, reason);
      return {
        success: true,
        message: `\u89D2\u8272 ${role} \u64A4\u9500\u6210\u529F`,
        user: {
          id: userId,
          roles: newRoles
        }
      };
    },
    /**
     * 获取用户角色列表
     * @param userId 用户ID
     */
    async getUserRoles(userId) {
      const user = await strapi2.db.query(USER_UID2).findOne({
        where: { id: userId },
        select: ["id", "email", "username", "zhaoRoles"],
        populate: ["role"]
      });
      if (!user) {
        throwErr("USER_NOT_FOUND", 404, "\u7528\u6237\u4E0D\u5B58\u5728");
      }
      const roleNames = extractRoleNames(user);
      const roles = roleNames.map((name) => {
        const roleObj = user.role;
        return {
          id: roleObj?.id,
          name,
          description: roleObj?.description
        };
      });
      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        },
        roles
      };
    },
    /**
     * 获取用户详情（含角色来源标注）
     * @param userId 目标用户 ID
     * @param operatorId 操作者 ID（保留参数，便于未来加审计）
     * @param tenantDocumentId 当前租户 documentId
     */
    async getUserDetail(userId, operatorId, tenantDocumentId) {
      const user = await strapi2.db.query(USER_UID2).findOne({
        where: { id: userId },
        select: ["id", "email", "username", "createdAt", "zhaoRoles"],
        populate: ["role"]
      });
      if (!user) {
        throwErr("USER_NOT_FOUND", 404, "\u7528\u6237\u4E0D\u5B58\u5728");
      }
      const rolesWithSource = await annotateUserRoles(user, tenantDocumentId);
      const bySource = {
        core: rolesWithSource.filter((r) => r.source === "core"),
        auto: rolesWithSource.filter((r) => r.source === "auto"),
        explicit: rolesWithSource.filter((r) => r.source === "explicit")
      };
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        },
        roles: rolesWithSource,
        rolesBySource: bySource
      };
    },
    /**
     * 获取当前操作者可分配的角色列表
     * - admin：返回全部角色（ROLES 全集 + 数据库自定义角色）
     * - 非 admin：返回"拥有的角色全集"（zhaoRoles ∪ moduleVisibility 自动授权）
     *
     * @param operatorId 操作者 ID
     * @param tenantDocumentId 当前租户 documentId
     */
    async getAssignableRoles(operatorId, tenantDocumentId) {
      const { ROLES: ROLES2, ROLE_LABELS: ROLE_LABELS2 } = await Promise.resolve().then(() => (init_permissions(), permissions_exports));
      const ownedRoles = await computeOperatorOwnedRoles(operatorId, tenantDocumentId);
      const ownedSet = new Set(ownedRoles);
      let dbRoles = [];
      try {
        dbRoles = await strapi2.db.query(PERMISSION_UID).findMany({
          orderBy: { id: "asc" }
        });
      } catch {
      }
      const allRoleNames = new Set(Object.values(ROLES2));
      for (const r of dbRoles) {
        if (r?.role) allRoleNames.add(r.role);
      }
      const operator = await strapi2.db.query(USER_UID2).findOne({
        where: { id: operatorId },
        select: ["zhaoRoles"]
      });
      const operatorRoles = Array.isArray(operator?.zhaoRoles) ? operator.zhaoRoles.map((r) => typeof r === "string" ? r : String(r)).filter((r) => r && r.trim()) : [];
      const isAdmin = operatorRoles.includes("admin");
      const result = [];
      for (const role of allRoleNames) {
        if (!isAdmin && !ownedSet.has(role)) continue;
        let source = "explicit";
        if (isAdmin) {
          source = "explicit";
        } else {
          const CORE_ROLES = ["channel-admin", "instructor", "user", "plugin-manager", "admin"];
          let autoRoles = /* @__PURE__ */ new Set();
          try {
            const moduleVisibility = await strapi2.plugin("zhao-auth").service("permission").resolveModuleVisibility(tenantDocumentId);
            const { MODULE_MANAGER_MAP: MODULE_MANAGER_MAP2 } = await Promise.resolve().then(() => (init_permissions(), permissions_exports));
            for (const [moduleKey, roles] of Object.entries(moduleVisibility)) {
              if (roles.includes("channel-admin")) {
                const managerRole = MODULE_MANAGER_MAP2[moduleKey];
                if (managerRole) autoRoles.add(managerRole);
              }
            }
          } catch {
          }
          if (autoRoles.has(role) && operatorRoles.includes(role)) {
            source = "explicit";
          } else if (autoRoles.has(role)) {
            source = "auto";
          } else if (CORE_ROLES.includes(role)) {
            source = "core";
          } else {
            source = "explicit";
          }
        }
        result.push({
          role,
          label: ROLE_LABELS2[role] || role,
          source
        });
      }
      return {
        roles: result,
        isAdmin
      };
    },
    /**
     * 批量分配角色
     * 透传 operatorTenantDocumentId 给 assignRole，自动执行子集校验
     */
    async batchAssignRoles(userIds, role, operatorId, reason, operatorTenantDocumentId) {
      const results = [];
      for (const userId of userIds) {
        try {
          await this.assignRole(userId, role, operatorId, reason, operatorTenantDocumentId);
          results.push({ userId, success: true, message: "\u5206\u914D\u6210\u529F" });
        } catch (error) {
          results.push({ userId, success: false, message: error.message });
        }
      }
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;
      return {
        success: failCount === 0,
        message: `\u6279\u91CF\u5206\u914D\u5B8C\u6210: ${successCount} \u6210\u529F, ${failCount} \u5931\u8D25`,
        results
      };
    },
    /**
     * 记录操作日志
     * @param operatorId 操作人ID
     * @param targetUserId 目标用户ID
     * @param action 操作类型
     * @param role 角色名称
     * @param reason 操作原因
     */
    async logAction(operatorId, targetUserId, action, role, reason) {
      try {
        const logEntry = {
          operatorId,
          targetUserId,
          action,
          role,
          reason,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
        strapi2.log.info(`[zhao-auth] Role action: ${action} ${role} for user ${targetUserId} by operator ${operatorId}`);
        await strapi2.db.query("plugin::zhao-auth.role-action-log").create({
          data: logEntry
        });
      } catch (error) {
        strapi2.log.error(`[zhao-auth] Failed to log role action: ${error}`);
      }
    },
    /**
     * 获取角色操作日志
     * @param userId 可选，按目标用户筛选
     * @param operatorId 可选，按操作人筛选
     * @param page 页码
     * @param pageSize 每页数量
     */
    async getActionLogs(userId, operatorId, page = 1, pageSize = 20) {
      const filters = {};
      if (userId) {
        filters.targetUserId = userId;
      }
      if (operatorId) {
        filters.operatorId = operatorId;
      }
      const logs = await strapi2.db.query("plugin::zhao-auth.role-action-log").findMany({
        where: filters,
        orderBy: { timestamp: "desc" },
        offset: (page - 1) * pageSize,
        limit: pageSize
      });
      const total = await strapi2.db.query("plugin::zhao-auth.role-action-log").count({
        where: filters
      });
      return {
        data: logs,
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize)
        }
      };
    },
    /**
     * 检查用户是否具有特定权限（包含继承权限）
     * @param userId 用户ID
     * @param requiredRole 所需角色
     * @returns 是否具有权限
     */
    async checkPermission(userId, requiredRole) {
      const effectiveRoles = await getUserEffectivePermissions(userId);
      return effectiveRoles.effective.includes(requiredRole);
    },
    /**
     * 获取用户有效权限信息
     * @param userId 用户ID
     * @returns 用户权限信息
     */
    async getUserEffectivePermissions(userId) {
      return await getUserEffectivePermissions(userId);
    },
    /**
     * 清除用户权限缓存
     * @param userId 用户ID
     */
    async invalidateUserCache(userId) {
      invalidateUserCache(userId);
    },
    /**
     * 获取用户层级（取所有角色中的最高层级）
     * @param userId 用户ID
     * @returns 层级数值（1-100）
     */
    async getUserLevel(userId) {
      return getUserLevel(userId);
    },
    /**
     * 根据角色列表计算权限映射
     * @param roles 用户角色列表
     * @returns 角色和权限映射
     */
    computePermissions(roles) {
      const permissions = {};
      for (const role of roles) {
        const rolePerms = DEFAULT_ROLE_PERMISSIONS[role] || [];
        for (const action of rolePerms) {
          permissions[action] = true;
        }
      }
      return { roles, permissions };
    }
  };
};

// plugins/zhao-auth/server/src/services/index.ts
init_permission_service();

// plugins/zhao-auth/server/src/services/channel-scope.service.ts
var channel_scope_service_default = ({ strapi: strapi2 }) => ({
  /**
   * 解析用户可见渠道范围
   * @param user 用户对象（含 id, roles）
   * @returns ChannelScope
   */
  async resolve(user) {
    const userRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : Array.isArray(user.zhaoRoles) ? user.zhaoRoles : [];
    if (userRoles.includes("admin")) {
      return { all: true, channelIds: [] };
    }
    try {
      const channelPermService = strapi2.plugin("zhao-channel").service("channel-permission");
      const channelIds = await channelPermService.getUserAllChannels(user.id);
      return { all: false, channelIds };
    } catch (err) {
      strapi2.log.warn(`[zhao-auth:channel-scope] zhao-channel \u670D\u52A1\u4E0D\u53EF\u7528: ${err.message}`);
      return { all: false, channelIds: [] };
    }
  },
  /**
   * 构造 filters 中的 channel 过滤条件（纯函数，不调用 resolve）
   * @param scope 渠道范围（来自 ctx.state.channelScope）
   * @param field 关系字段名："channel"（manyToOne）/ "channels"（manyToMany）/ "id"（channel 自身）
   * @returns 过滤条件对象；null 表示不过滤
   */
  buildChannelFilter(scope, field) {
    if (!scope) return null;
    if (scope.all) return null;
    const ids = Array.isArray(scope.channelIds) ? scope.channelIds : [];
    const idList = ids.length === 0 ? [-1] : ids;
    if (field === "id") {
      return { id: { $in: idList } };
    }
    return { [field]: { id: { $in: idList } } };
  },
  /**
   * 校验单条记录的 channel 关系是否在 scope 内（纯函数）
   * @param scope 渠道范围
   * @param record 含 channel 关系的记录
   * @param field 关系字段名："channel"（对象）/ "channels"（数组）/ "id"（channel 自身，数字）
   * @throws 403 当记录的 channel 不在 scope 内
   */
  assertRecordInScope(scope, record, field) {
    if (!scope || scope.all) return;
    const rel = record?.[field];
    if (rel == null) return;
    const allowed = Array.isArray(scope.channelIds) ? scope.channelIds : [];
    let recordChannelIds = [];
    if (Array.isArray(rel)) {
      recordChannelIds = rel.map((c) => typeof c === "number" ? c : c?.id).filter((id) => typeof id === "number");
    } else if (typeof rel === "number") {
      recordChannelIds = [rel];
    } else if (typeof rel === "object" && rel != null) {
      if (typeof rel.id === "number") recordChannelIds = [rel.id];
    }
    if (recordChannelIds.length === 0) return;
    const hasIntersection = recordChannelIds.some((id) => allowed.includes(id));
    if (!hasIntersection) {
      const e = new Error("\u65E0\u6743\u8BBF\u95EE\u8BE5\u6E20\u9053\u7684\u6570\u636E");
      e.status = 403;
      throw e;
    }
  },
  /**
   * 通过 channel documentId 校验是否在 scope 内（async，需查 DB）
   * @param scope 渠道范围
   * @param channelDocumentId channel 的 documentId
   * @throws 403 当 channel 不在 scope 内
   */
  async assertChannelDocIdInScope(scope, channelDocumentId) {
    if (!scope || scope.all) return;
    if (!channelDocumentId) return;
    const channel = await strapi2.db.query("plugin::zhao-channel.channel").findOne({
      where: { documentId: channelDocumentId },
      select: ["id"]
    });
    if (!channel) return;
    this.assertRecordInScope(scope, channel, "id");
  },
  /**
   * 构造嵌套关系过滤条件（纯函数，用于间接渠道关联）
   * @param scope 渠道范围
   * @param path 关系路径数组，如 ["course", "channel"] 生成 { course: { channel: { id: { $in: ids } } } }
   * @returns 过滤条件对象；null 表示不过滤
   */
  buildChannelFilterDeep(scope, path) {
    if (!scope) return null;
    if (scope.all) return null;
    if (!Array.isArray(path) || path.length === 0) return null;
    const ids = Array.isArray(scope.channelIds) ? scope.channelIds : [];
    const idList = ids.length === 0 ? [-1] : ids;
    let filter = { id: { $in: idList } };
    for (let i = path.length - 1; i >= 0; i--) {
      filter = { [path[i]]: filter };
    }
    return filter;
  }
});

// plugins/zhao-auth/server/src/services/role-channel.service.ts
var UID = "plugin::zhao-auth.role-channel";
var CHANNEL_UID = "plugin::zhao-channel.channel";
var role_channel_service_default = ({ strapi: strapi2 }) => ({
  /**
   * 角色渠道列表（分页）
   */
  async listRoleChannels(page = 1, pageSize = 20, filters = {}) {
    const where = {};
    if (filters.role) where.role = { $contains: filters.role };
    const records = await strapi2.db.query(UID).findMany({
      where,
      populate: { channel: true, grantedBy: true },
      orderBy: { id: "asc" },
      limit: pageSize,
      offset: (page - 1) * pageSize
    });
    const total = await strapi2.db.query(UID).count({ where });
    const list = records.map((r) => ({
      id: r.id,
      role: r.role,
      channel: r.channel ? { id: r.channel.id, name: r.channel.name, code: r.channel.code } : null,
      grantedBy: r.grantedBy ? { id: r.grantedBy.id, username: r.grantedBy.username } : null,
      createdAt: r.createdAt
    }));
    return {
      list,
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize)
      }
    };
  },
  /**
   * 查询角色被授权的所有渠道 ID
   */
  async getRoleChannelIds(roles) {
    if (!roles || roles.length === 0) return [];
    const records = await strapi2.db.query(UID).findMany({
      where: { role: { $in: roles } },
      populate: { channel: true }
    });
    const channelIds = /* @__PURE__ */ new Set();
    for (const r of records) {
      if (r.channel?.id) channelIds.add(r.channel.id);
    }
    return Array.from(channelIds);
  },
  /**
   * 授权角色渠道（单个）
   */
  async grant(data) {
    const role = data.role.trim();
    if (!role) {
      const e = new Error("\u89D2\u8272\u540D\u4E0D\u80FD\u4E3A\u7A7A");
      e.status = 400;
      throw e;
    }
    const channel = await strapi2.db.query(CHANNEL_UID).findOne({
      where: { id: data.channelId }
    });
    if (!channel) {
      const e = new Error("\u6E20\u9053\u4E0D\u5B58\u5728");
      e.status = 404;
      throw e;
    }
    const existing = await strapi2.db.query(UID).findOne({
      where: { role, channel: { id: data.channelId } }
    });
    if (existing) {
      return {
        id: existing.id,
        role: existing.role,
        channel: { id: data.channelId, name: channel.name, code: channel.code }
      };
    }
    const created = await strapi2.db.query(UID).create({
      data: {
        role,
        channel: data.channelId,
        grantedBy: data.grantedBy || null
      },
      populate: { channel: true, grantedBy: true }
    });
    return {
      id: created.id,
      role: created.role,
      channel: created.channel ? { id: created.channel.id, name: created.channel.name, code: created.channel.code } : null,
      grantedBy: created.grantedBy ? { id: created.grantedBy.id, username: created.grantedBy.username } : null,
      createdAt: created.createdAt
    };
  },
  /**
   * 批量授权
   */
  async batchGrant(data) {
    const role = data.role.trim();
    if (!role) {
      const e = new Error("\u89D2\u8272\u540D\u4E0D\u80FD\u4E3A\u7A7A");
      e.status = 400;
      throw e;
    }
    if (!data.channelIds || data.channelIds.length === 0) {
      const e = new Error("channelIds \u4E0D\u80FD\u4E3A\u7A7A");
      e.status = 400;
      throw e;
    }
    const results = [];
    for (const channelId of data.channelIds) {
      try {
        const r = await this.grant({
          role,
          channelId,
          grantedBy: data.grantedBy
        });
        results.push({ success: true, channelId, result: r });
      } catch (err) {
        results.push({ success: false, channelId, error: err.message });
      }
    }
    return { results };
  },
  /**
   * 撤销角色渠道
   */
  async revoke(id) {
    const existing = await strapi2.db.query(UID).findOne({
      where: { id }
    });
    if (!existing) {
      const e = new Error("\u8BB0\u5F55\u4E0D\u5B58\u5728");
      e.status = 404;
      throw e;
    }
    await strapi2.db.query(UID).delete({ where: { id } });
    return { success: true, id, role: existing.role };
  },
  /**
   * 按角色名删除
   */
  async revokeByRole(role) {
    const records = await strapi2.db.query(UID).findMany({
      where: { role }
    });
    for (const r of records) {
      await strapi2.db.query(UID).delete({ where: { id: r.id } });
    }
    return { success: true, role, deleted: records.length };
  }
});

// plugins/zhao-auth/server/src/services/tenant.service.ts
var SITE_CONFIG_UID = "plugin::zhao-common.site-config";
var tenant_service_default = ({ strapi: strapi2 }) => ({
  async getMyTenants(userId, roles) {
    if (roles.includes("admin")) {
      const all = await strapi2.db.query(SITE_CONFIG_UID).findMany({
        select: ["id", "documentId", "siteName", "domain"],
        limit: 1e3
      });
      return all.map((s) => ({
        id: s.id,
        documentId: s.documentId,
        name: s.siteName,
        domain: s.domain
      }));
    }
    let channelIds = [];
    try {
      const channelPermission = strapi2.plugin("zhao-channel").service("channel-permission");
      const userChannels = await channelPermission.getUserAllChannels(userId);
      channelIds = (userChannels || []).filter(
        (id) => typeof id === "number"
      );
    } catch (e) {
      strapi2.log.warn(
        `[tenant] failed to get user channels: ${e?.message || e}`
      );
    }
    if (channelIds.length === 0) return [];
    const links = await strapi2.db.connection("zhao_channels_sites_lnk").whereIn("channel_id", channelIds).select("site_config_id");
    const siteIds = [
      ...new Set(links.map((l) => l.site_config_id))
    ].filter(Boolean);
    if (siteIds.length === 0) return [];
    const sites = await strapi2.db.query(SITE_CONFIG_UID).findMany({
      where: { id: { $in: siteIds } },
      select: ["id", "documentId", "siteName", "domain"]
    });
    return sites.map((s) => ({
      id: s.id,
      documentId: s.documentId,
      name: s.siteName,
      domain: s.domain
    }));
  }
});

// plugins/zhao-auth/server/src/services/index.ts
var services_default = {
  auth: auth_service_default,
  jwt: jwt_service_default,
  "role-management": role_management_service_default,
  permission: permission_service_default,
  "channel-scope": channel_scope_service_default,
  "role-channel": role_channel_service_default,
  tenant: tenant_service_default
};

// plugins/zhao-auth/server/src/middlewares/index.ts
var middlewares_default = {};

// plugins/zhao-auth/server/src/controllers/role-management.ts
var role_management_default = ({ strapi: strapi2 }) => ({
  async findUsers(ctx) {
    try {
      const { page = 1, pageSize = 20, ...filters } = ctx.query;
      const operatorId = ctx.state.user?.id;
      const tenantDocumentId = ctx.state.siteDocumentId;
      const result = await strapi2.plugin("zhao-auth").service("role-management").findUsers(
        filters,
        parseInt(page, 10),
        parseInt(pageSize, 10),
        operatorId,
        tenantDocumentId
      );
      ctx.body = result;
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Find users failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },
  async assignRole(ctx) {
    try {
      const { userId, role, reason } = ctx.request.body;
      const operatorId = ctx.state.user?.id;
      const operatorTenantDocumentId = ctx.state.siteDocumentId;
      if (!userId || !role) {
        ctx.status = 400;
        ctx.body = { error: "\u7F3A\u5C11\u5FC5\u8981\u53C2\u6570: userId \u548C role" };
        return;
      }
      if (!operatorId) {
        ctx.status = 401;
        ctx.body = { error: "\u672A\u8BA4\u8BC1" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("role-management").assignRole(userId, role, operatorId, reason, operatorTenantDocumentId);
      ctx.body = result;
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Assign role failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },
  async revokeRole(ctx) {
    try {
      const { userId, role, reason } = ctx.request.body;
      const operatorId = ctx.state.user?.id;
      const operatorTenantDocumentId = ctx.state.siteDocumentId;
      if (!userId || !role) {
        ctx.status = 400;
        ctx.body = { error: "\u7F3A\u5C11\u5FC5\u8981\u53C2\u6570: userId \u548C role" };
        return;
      }
      if (!operatorId) {
        ctx.status = 401;
        ctx.body = { error: "\u672A\u8BA4\u8BC1" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("role-management").revokeRole(userId, role, operatorId, reason, operatorTenantDocumentId);
      ctx.body = result;
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Revoke role failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },
  async getUserRoles(ctx) {
    try {
      const userId = parseInt(ctx.params.id, 10);
      if (isNaN(userId)) {
        ctx.status = 400;
        ctx.body = { error: "\u65E0\u6548\u7684\u7528\u6237ID" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("role-management").getUserRoles(userId);
      ctx.body = result;
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Get user roles failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },
  async batchAssignRoles(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { userIds, role, reason } = body;
      const operatorId = ctx.state.user?.id;
      const operatorTenantDocumentId = ctx.state.siteDocumentId;
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        ctx.status = 400;
        ctx.body = { error: "\u7F3A\u5C11\u5FC5\u8981\u53C2\u6570: userIds \u5FC5\u987B\u662F\u975E\u7A7A\u6570\u7EC4" };
        return;
      }
      if (!role) {
        ctx.status = 400;
        ctx.body = { error: "\u7F3A\u5C11\u5FC5\u8981\u53C2\u6570: role" };
        return;
      }
      if (!operatorId) {
        ctx.status = 401;
        ctx.body = { error: "\u672A\u8BA4\u8BC1" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("role-management").batchAssignRoles(userIds, role, operatorId, reason, operatorTenantDocumentId);
      ctx.body = result;
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Batch assign roles failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },
  async getActionLogs(ctx) {
    try {
      const { userId, operatorId, page = 1, pageSize = 20 } = ctx.query;
      const result = await strapi2.plugin("zhao-auth").service("role-management").getActionLogs(
        userId ? parseInt(userId, 10) : void 0,
        operatorId ? parseInt(operatorId, 10) : void 0,
        parseInt(page, 10),
        parseInt(pageSize, 10)
      );
      ctx.body = result;
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Get action logs failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },
  async getMyRoles(ctx) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) {
        ctx.status = 401;
        ctx.body = { error: "\u672A\u8BA4\u8BC1" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("role-management").getUserRoles(userId);
      ctx.body = result;
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Get my roles failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },
  async getMyPermissions(ctx) {
    try {
      const user = ctx.state.user;
      if (!user?.id) {
        ctx.status = 401;
        ctx.body = { error: "\u672A\u8BA4\u8BC1" };
        return;
      }
      const roles = user.roles || [];
      ctx.body = strapi2.plugin("zhao-auth").service("role-management").computePermissions(roles);
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Get my permissions failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },
  async getUserDetail(ctx) {
    try {
      const userId = parseInt(ctx.params.id, 10);
      if (isNaN(userId)) {
        ctx.status = 400;
        ctx.body = { error: "\u65E0\u6548\u7684\u7528\u6237ID" };
        return;
      }
      const operatorId = ctx.state.user?.id;
      const tenantDocumentId = ctx.state.siteDocumentId;
      const result = await strapi2.plugin("zhao-auth").service("role-management").getUserDetail(userId, operatorId, tenantDocumentId);
      ctx.body = result;
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Get user detail failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  },
  async getAssignableRoles(ctx) {
    try {
      const operatorId = ctx.state.user?.id;
      const tenantDocumentId = ctx.state.siteDocumentId;
      if (!operatorId) {
        ctx.status = 401;
        ctx.body = { error: "\u672A\u8BA4\u8BC1" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("role-management").getAssignableRoles(operatorId, tenantDocumentId);
      ctx.body = result;
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Get assignable roles failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message, code: error.code };
    }
  }
});

// plugins/zhao-auth/server/src/controllers/auth.ts
var auth_default = ({ strapi: strapi2 }) => ({
  async register(ctx) {
    try {
      const { username, email, password, inviteCode } = ctx.request.body;
      if (!username || !email || !password) {
        ctx.status = 400;
        ctx.body = { error: "\u8BF7\u63D0\u4F9B username, email \u548C password" };
        return;
      }
      if (password.length < 6) {
        ctx.status = 400;
        ctx.body = { error: "\u5BC6\u7801\u957F\u5EA6\u81F3\u5C116\u4F4D" };
        return;
      }
      const authService = strapi2.plugin("zhao-auth").service("auth");
      const existingUser = await authService.findUserByIdentifier(username, email);
      if (existingUser) {
        if (existingUser.username === username) {
          ctx.status = 400;
          ctx.body = { error: "\u7528\u6237\u540D\u5DF2\u5B58\u5728" };
          return;
        }
        ctx.status = 400;
        ctx.body = { error: "\u90AE\u7BB1\u5DF2\u88AB\u6CE8\u518C" };
        return;
      }
      const user = await authService.createUser({ username, email, password });
      let inviteInfo = null;
      try {
        const channelService = strapi2.service("plugin::zhao-channel.user-invite");
        if (channelService && typeof channelService.createForUser === "function") {
          inviteInfo = await channelService.createForUser(user.id, inviteCode);
        }
      } catch (e) {
        strapi2.log.warn(`[zhao-auth] \u521B\u5EFA\u9080\u8BF7\u7801\u5931\u8D25: ${e.message}`);
      }
      const jwtService = strapi2.plugin("zhao-auth").service("jwt");
      const jwt2 = await jwtService.sign({ id: user.id, email: user.email, username: user.username, zhaoRoles: ["user"] });
      ctx.status = 201;
      ctx.body = {
        jwt: jwt2,
        user: { id: user.id, username: user.username, email: user.email },
        inviteInfo: inviteInfo ? strapi2.service("plugin::zhao-channel.user-invite")?.formatInviteInfo?.(inviteInfo) || null : null
      };
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Register failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  async resetPassword(ctx) {
    const body = ctx.request.body?.data || ctx.request.body;
    const { identifier, password } = body;
    if (!identifier || !password) {
      ctx.status = 400;
      ctx.body = { error: "\u8BF7\u63D0\u4F9B identifier \u548C password" };
      return;
    }
    if (password.length < 6) {
      ctx.status = 400;
      ctx.body = { error: "\u5BC6\u7801\u957F\u5EA6\u81F3\u5C11 6 \u4F4D" };
      return;
    }
    try {
      const authService = strapi2.plugin("zhao-auth").service("auth");
      const user = await authService.findUserByIdentifier(identifier, identifier);
      if (!user) {
        ctx.status = 400;
        ctx.body = { error: "\u7528\u6237\u4E0D\u5B58\u5728" };
        return;
      }
      await authService.updateUserPassword(user.id, password);
      ctx.body = { success: true, message: "\u5BC6\u7801\u91CD\u7F6E\u6210\u529F" };
    } catch (error) {
      strapi2.log.error(`[zhao-auth] \u91CD\u7F6E\u5BC6\u7801\u5931\u8D25\uFF1A${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: "\u5BC6\u7801\u91CD\u7F6E\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5" };
    }
  },
  async adminLocal(ctx) {
    try {
      const { identifier, password } = ctx.request.body;
      if (!identifier || !password) {
        ctx.status = 400;
        ctx.body = { error: "\u8BF7\u63D0\u4F9B identifier \u548C password" };
        return;
      }
      const authService = strapi2.plugin("zhao-auth").service("auth");
      const result = await authService.localLogin(identifier, password);
      if (!result.success) {
        ctx.status = 400;
        ctx.body = { error: result.error };
        return;
      }
      const { user, roles, formattedRole } = result;
      const isSuperAdmin = roles.some(
        (r) => r === "super-admin" || r === "super_admin" || r === "SUPER_ADMIN"
      );
      if (!isSuperAdmin) {
        const permService = strapi2.plugin("zhao-auth").service("permission");
        const { permissions } = await permService.getMyPermissions(user.id);
        if (!permissions.includes("auth.admin-login")) {
          ctx.status = 403;
          ctx.body = { error: "\u65E0\u7BA1\u7406\u540E\u53F0\u8BBF\u95EE\u6743\u9650" };
          return;
        }
      }
      const jwtService = strapi2.plugin("zhao-auth").service("jwt");
      const jwt2 = await jwtService.sign({ id: user.id, email: user.email, username: user.username, zhaoRoles: roles });
      ctx.body = {
        jwt: jwt2,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: formattedRole
        }
      };
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Admin login failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  async login(ctx) {
    try {
      const authService = strapi2.plugin("zhao-auth").service("auth");
      const sso = await authService.isSsoEnabled();
      if (sso.enabled) {
        ctx.body = { mode: "sso", sso_login_url: sso.loginUrl, message: "SSO \u8BA4\u8BC1\u5DF2\u542F\u7528\uFF0C\u8BF7\u901A\u8FC7 SSO \u767B\u5F55" };
        return;
      }
      const { identifier, password } = ctx.request.body;
      if (!identifier || !password) {
        ctx.status = 400;
        ctx.body = { error: "\u8BF7\u63D0\u4F9B identifier \u548C password" };
        return;
      }
      const result = await authService.localLogin(identifier, password);
      if (!result.success) {
        ctx.status = 400;
        ctx.body = { error: result.error };
        return;
      }
      const { user, roles, formattedRole } = result;
      const jwtService = strapi2.plugin("zhao-auth").service("jwt");
      const jwt2 = await jwtService.sign({ id: user.id, email: user.email, username: user.username, zhaoRoles: roles });
      let inviteCode = null;
      try {
        const channelService = strapi2.service("plugin::zhao-channel.user-invite");
        if (channelService && typeof channelService.createForUser === "function") {
          const inviteInfo = await channelService.createForUser(user.id);
          inviteCode = inviteInfo?.inviteCode || null;
        }
      } catch (e) {
        strapi2.log.warn(`[zhao-auth] \u767B\u5F55\u65F6\u521B\u5EFA\u9080\u8BF7\u7801\u5931\u8D25: ${e.message}`);
      }
      ctx.body = {
        jwt: jwt2,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: formattedRole
        },
        inviteCode
      };
    } catch (error) {
      strapi2.log.error(`[zhao-auth] Login failed: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  async config(ctx) {
    try {
      const authService = strapi2.plugin("zhao-auth").service("auth");
      const sso = await authService.isSsoEnabled();
      const thirdEnabled = await this.checkThirdPartyEnabled();
      let mode = "local";
      if (sso.enabled) {
        mode = "sso";
      } else if (thirdEnabled) {
        mode = "third";
      }
      ctx.body = {
        mode,
        methods: ["password", "sms"],
        ssoLoginUrl: sso.enabled ? sso.loginUrl : null,
        wechatEnabled: thirdEnabled,
        registerEnabled: true
      };
    } catch (e) {
      strapi2.log.error("[zhao-auth] Failed to get auth config:", e);
      ctx.body = {
        mode: "local",
        methods: ["password"],
        ssoLoginUrl: null,
        wechatEnabled: false,
        registerEnabled: true
      };
    }
  },
  async checkThirdPartyEnabled() {
    try {
      const flag = await strapi2.documents("plugin::zhao-common.feature-flag").findFirst({
        filters: { flagKey: "third_party_enabled" }
      });
      return flag && flag.flagValue === true && flag.enabled !== false;
    } catch {
      return false;
    }
  },
  async switchTenant(ctx) {
    try {
      const user = ctx.state?.user;
      if (!user?.id) {
        ctx.status = 401;
        ctx.body = { error: "\u672A\u767B\u5F55" };
        return;
      }
      const body = ctx.request.body?.data || ctx.request.body;
      const { tenantId } = body;
      if (!tenantId) {
        ctx.status = 400;
        ctx.body = { error: "\u8BF7\u63D0\u4F9B tenantId" };
        return;
      }
      const roles = Array.isArray(user.roles) ? user.roles : Array.isArray(user.zhaoRoles) ? user.zhaoRoles : [];
      const tenantService = strapi2.plugin("zhao-auth").service("tenant");
      const tenants = await tenantService.getMyTenants(user.id, roles);
      const hasAccess = tenants.some(
        (t) => t.documentId === tenantId || String(t.id) === String(tenantId)
      );
      if (!hasAccess) {
        ctx.status = 403;
        ctx.body = { error: "\u65E0\u6743\u8BBF\u95EE\u8BE5\u79DF\u6237" };
        return;
      }
      const jwtService = strapi2.plugin("zhao-auth").service("jwt");
      const jwt2 = await jwtService.sign({
        id: user.id,
        email: user.email,
        username: user.username,
        zhaoRoles: roles,
        currentTenantId: tenantId
      });
      try {
        const { invalidatePermissionCache: invalidatePermissionCache2 } = (init_permission_service(), __toCommonJS(permission_service_exports));
        invalidatePermissionCache2(user.id);
      } catch {
      }
      ctx.body = {
        jwt: jwt2,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          currentTenantId: tenantId
        }
      };
    } catch (error) {
      strapi2.log.error(`[zhao-auth] switchTenant failed: ${error.message}`);
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }
});

// plugins/zhao-auth/server/src/controllers/permission.ts
var permission_default = ({ strapi: strapi2 }) => ({
  /**
   * GET /permissions/tree
   */
  async getTree(ctx) {
    try {
      const tree = strapi2.plugin("zhao-auth").service("permission").getPermissionTree();
      ctx.body = tree;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * GET /roles — 角色列表
   */
  async listRoles(ctx) {
    try {
      const { page = 1, pageSize = 20, role } = ctx.query;
      const result = await strapi2.plugin("zhao-auth").service("permission").listRoles(parseInt(page, 10), parseInt(pageSize, 10), { role });
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * GET /roles/all — 全部角色（下拉用）
   */
  async getAllRoles(ctx) {
    try {
      const result = await strapi2.plugin("zhao-auth").service("permission").getAllRoles();
      ctx.body = { list: result };
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * GET /roles/:role — 获取单个角色
   */
  async getRole(ctx) {
    try {
      const { role } = ctx.params;
      const result = await strapi2.plugin("zhao-auth").service("permission").getRole(role);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "\u89D2\u8272\u4E0D\u5B58\u5728" };
        return;
      }
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * POST /roles — 创建角色
   */
  async createRole(ctx) {
    try {
      const { role, displayName, description, permissions, level } = ctx.request.body;
      if (!role || !displayName) {
        ctx.status = 400;
        ctx.body = { error: "\u89D2\u8272\u540D\u548C\u663E\u793A\u540D\u79F0\u5FC5\u586B" };
        return;
      }
      const operatorId = ctx.state?.user?.id;
      if (!operatorId) {
        ctx.status = 401;
        ctx.body = { error: "\u672A\u8BA4\u8BC1" };
        return;
      }
      const operatorLevel = await strapi2.plugin("zhao-auth").service("role-management").getUserLevel(operatorId);
      const result = await strapi2.plugin("zhao-auth").service("permission").createRole(
        {
          role,
          displayName,
          description,
          permissions: Array.isArray(permissions) ? permissions : [],
          level: typeof level === "number" ? level : void 0
        },
        operatorId,
        operatorLevel
      );
      ctx.status = 201;
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * PUT /roles/:role — 更新角色
   */
  async updateRole(ctx) {
    try {
      const { role } = ctx.params;
      const { displayName, description, permissions } = ctx.request.body;
      const result = await strapi2.plugin("zhao-auth").service("permission").updateRole(role, { displayName, description, permissions });
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * DELETE /roles/:role — 删除角色
   */
  async deleteRole(ctx) {
    try {
      const { role } = ctx.params;
      const result = await strapi2.plugin("zhao-auth").service("permission").deleteRole(role);
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * GET /permissions/role/:role
   */
  async getRolePermissions(ctx) {
    try {
      const { role } = ctx.params;
      if (!role) {
        ctx.status = 400;
        ctx.body = { error: "\u7F3A\u5C11\u89D2\u8272\u53C2\u6570" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("permission").getRolePermissions(role);
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * PUT /permissions/role/:role
   */
  async updateRolePermissions(ctx) {
    try {
      const { role } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      const { permissions } = body;
      if (!role) {
        ctx.status = 400;
        ctx.body = { error: "\u7F3A\u5C11\u89D2\u8272\u53C2\u6570" };
        return;
      }
      if (!Array.isArray(permissions)) {
        ctx.status = 400;
        ctx.body = { error: "permissions \u5FC5\u987B\u662F\u6570\u7EC4" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("permission").updateRolePermissions(role, permissions);
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * POST /permissions/init — 初始化默认角色
   */
  async initRoles(ctx) {
    try {
      const results = await strapi2.plugin("zhao-auth").service("permission").initDefaultRoles();
      ctx.body = { results };
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * GET /my/permissions — 获取当前用户权限
   */
  async getMyPermissions(ctx) {
    try {
      const userId = ctx.state?.user?.id;
      if (!userId) {
        ctx.status = 401;
        ctx.body = { error: "\u672A\u8BA4\u8BC1" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("permission").getMyPermissions(userId, ctx.state?.siteDocumentId);
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * GET /my/channel-scope
   */
  async getMyChannelScope(ctx) {
    try {
      const user = ctx.state?.user;
      if (!user?.id) {
        ctx.status = 401;
        ctx.body = { error: "\u672A\u8BA4\u8BC1" };
        return;
      }
      const channelScopeService = strapi2.plugin("zhao-auth").service("channel-scope");
      const scope = await channelScopeService.resolve(user);
      ctx.body = scope;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  }
});

// plugins/zhao-auth/server/src/controllers/role-channel.ts
var role_channel_default = ({ strapi: strapi2 }) => ({
  /**
   * GET /admin/role-channels — 列表
   */
  async list(ctx) {
    try {
      const { page = 1, pageSize = 20, role } = ctx.query;
      const result = await strapi2.plugin("zhao-auth").service("role-channel").listRoleChannels(parseInt(page, 10), parseInt(pageSize, 10), { role });
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * POST /admin/role-channels — 授权角色渠道（单个）
   */
  async grant(ctx) {
    try {
      const { role, channelId, grantedBy } = ctx.request.body;
      if (!role || !channelId) {
        ctx.status = 400;
        ctx.body = { error: "role \u548C channelId \u5FC5\u586B" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("role-channel").grant({ role, channelId: parseInt(channelId, 10), grantedBy });
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * POST /admin/role-channels/batch — 批量授权
   */
  async batchGrant(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { role, channelIds, grantedBy } = body;
      if (!role || !channelIds) {
        ctx.status = 400;
        ctx.body = { error: "role \u548C channelIds \u5FC5\u586B" };
        return;
      }
      const result = await strapi2.plugin("zhao-auth").service("role-channel").batchGrant({ role, channelIds, grantedBy });
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * DELETE /admin/role-channels/:id — 撤销授权
   */
  async revoke(ctx) {
    try {
      const { id } = ctx.params;
      const result = await strapi2.plugin("zhao-auth").service("role-channel").revoke(parseInt(id, 10));
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  /**
   * DELETE /admin/role-channels/role/:role — 按角色删除所有渠道授权
   */
  async revokeByRole(ctx) {
    try {
      const { role } = ctx.params;
      const result = await strapi2.plugin("zhao-auth").service("role-channel").revokeByRole(role);
      ctx.body = result;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  }
});

// plugins/zhao-auth/server/src/controllers/tenant.ts
var tenant_default = ({ strapi: strapi2 }) => ({
  async getMyTenants(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) {
        ctx.status = 401;
        ctx.body = { error: "\u672A\u767B\u5F55" };
        return;
      }
      const roles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : Array.isArray(user.zhaoRoles) ? user.zhaoRoles : [];
      const tenants = await strapi2.plugin("zhao-auth").service("tenant").getMyTenants(user.id, roles);
      ctx.body = { data: tenants };
    } catch (err) {
      strapi2.log.error(`[zhao-auth] Get my tenants failed: ${err.message}`);
      ctx.status = err.status || 400;
      ctx.body = { error: err.message, code: err.code };
    }
  }
});

// plugins/zhao-auth/server/src/controllers/module-visibility.ts
init_permissions();
init_module_visibility();
var VALID_ROLES = new Set(Object.values(ROLES));
var module_visibility_default = {
  async get(ctx) {
    const siteId = ctx.state?.siteDocumentId;
    if (!siteId) {
      ctx.status = 400;
      ctx.body = { error: "\u7F3A\u5C11\u79DF\u6237\u4E0A\u4E0B\u6587" };
      return;
    }
    const siteConfigService = strapi.plugin("zhao-common").service("site-config");
    const config = await siteConfigService.getConfig(siteId);
    ctx.body = { data: config?.moduleVisibility ?? {} };
  },
  async update(ctx) {
    const siteId = ctx.state?.siteDocumentId;
    if (!siteId) {
      ctx.status = 400;
      ctx.body = { error: "\u7F3A\u5C11\u79DF\u6237\u4E0A\u4E0B\u6587" };
      return;
    }
    const body = ctx.request.body?.data || ctx.request.body;
    const { moduleVisibility } = body;
    if (typeof moduleVisibility !== "object" || Array.isArray(moduleVisibility)) {
      ctx.status = 400;
      ctx.body = { error: "moduleVisibility must be an object" };
      return;
    }
    const filtered = {};
    for (const [key, roles] of Object.entries(moduleVisibility)) {
      if (!VISIBILITY_MODULES.includes(key)) {
        strapi.log.warn(`[module-visibility] Unknown moduleKey ignored: ${key}`);
        continue;
      }
      if (!Array.isArray(roles)) {
        ctx.status = 400;
        ctx.body = { error: `moduleVisibility.${key} must be an array` };
        return;
      }
      filtered[key] = roles.filter(
        (r) => typeof r === "string" && VALID_ROLES.has(r)
      );
    }
    let globalVisibility = {};
    try {
      const globalConfig = await strapi.plugin("zhao-common").service("global-config").getGlobalConfig();
      globalVisibility = globalConfig?.moduleVisibility ?? {};
    } catch {
    }
    for (const [key, roles] of Object.entries(filtered)) {
      const globalRoles = globalVisibility[key] ?? DEFAULT_MODULE_VISIBILITY[key] ?? [];
      const invalidRoles = roles.filter((r) => !globalRoles.includes(r));
      if (invalidRoles.length > 0) {
        ctx.status = 400;
        ctx.body = {
          error: `moduleVisibility.${key} \u5305\u542B\u5168\u5C40\u672A\u6388\u6743\u7684\u89D2\u8272: ${invalidRoles.join(", ")}`
        };
        return;
      }
    }
    try {
      const siteConfigService = strapi.plugin("zhao-common").service("site-config");
      await siteConfigService.updateConfig(siteId, { moduleVisibility: filtered });
      try {
        strapi.plugin("zhao-auth")?.service("permission")?.invalidateCache?.(void 0, siteId);
      } catch {
      }
      ctx.body = { data: filtered };
    } catch (e) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  }
};

// plugins/zhao-auth/server/src/controllers/index.ts
var controllers_default = {
  "role-management": role_management_default,
  auth: auth_default,
  permission: permission_default,
  "role-channel": role_channel_default,
  tenant: tenant_default,
  "module-visibility": module_visibility_default
};

// plugins/zhao-auth/server/src/content-types/permission/schema.json
var schema_default = {
  kind: "collectionType",
  collectionName: "zhao_permissions",
  info: {
    singularName: "permission",
    pluralName: "permissions",
    displayName: "\u89D2\u8272\u6743\u9650"
  },
  options: {
    draftAndPublish: false
  },
  attributes: {
    role: {
      type: "string",
      required: true,
      unique: true,
      maxLength: 50
    },
    displayName: {
      type: "string",
      required: true,
      maxLength: 50
    },
    description: {
      type: "text"
    },
    permissions: {
      type: "json",
      required: true,
      default: []
    },
    isSystem: {
      type: "boolean",
      required: true,
      default: false
    },
    level: {
      type: "integer",
      default: 20,
      min: 1,
      max: 100
    }
  }
};

// plugins/zhao-auth/server/src/content-types/role-action-log/schema.json
var schema_default2 = {
  kind: "collectionType",
  collectionName: "zhao_role_action_logs",
  info: {
    name: "role-action-log",
    description: "\u89D2\u8272\u64CD\u4F5C\u65E5\u5FD7",
    singularName: "role-action-log",
    pluralName: "role-action-logs",
    displayName: "Role Action Log"
  },
  options: {
    draftAndPublish: false,
    timestamps: false
  },
  attributes: {
    operatorId: {
      type: "integer",
      required: true,
      description: "\u64CD\u4F5C\u4EBAID"
    },
    targetUserId: {
      type: "integer",
      required: true,
      description: "\u76EE\u6807\u7528\u6237ID"
    },
    action: {
      type: "string",
      required: true,
      enum: [
        "assign",
        "revoke"
      ],
      description: "\u64CD\u4F5C\u7C7B\u578B"
    },
    role: {
      type: "string",
      required: true,
      description: "\u89D2\u8272\u540D\u79F0"
    },
    reason: {
      type: "text",
      description: "\u64CD\u4F5C\u539F\u56E0"
    },
    timestamp: {
      type: "datetime",
      required: true,
      description: "\u64CD\u4F5C\u65F6\u95F4"
    }
  }
};

// plugins/zhao-auth/server/src/content-types/role-channel/schema.json
var schema_default3 = {
  kind: "collectionType",
  collectionName: "zhao_role_channels",
  info: {
    singularName: "role-channel",
    pluralName: "role-channels",
    displayName: "Role Channel",
    description: "\u89D2\u8272\u4E0E\u6E20\u9053\u7684\u7ED1\u5B9A\u5173\u7CFB"
  },
  options: {
    draftAndPublish: false
  },
  attributes: {
    role: {
      type: "string",
      required: true
    },
    channel: {
      type: "relation",
      relation: "manyToOne",
      target: "plugin::zhao-channel.channel"
    },
    assignedBy: {
      type: "integer"
    }
  }
};

// plugins/zhao-auth/server/src/content-types/index.ts
var content_types_default = {
  permission: {
    schema: schema_default
  },
  "role-action-log": {
    schema: schema_default2
  },
  "role-channel": {
    schema: schema_default3
  }
};

// plugins/zhao-auth/server/src/policies/is-authenticated.ts
var isAuthenticated = async (policyContext, config, { strapi: strapi2 }) => {
  const authService = strapi2.plugin("zhao-auth").service("auth");
  const token = authService.extractToken(policyContext);
  if (!token) {
    return false;
  }
  try {
    const user = await authService.authenticate(token);
    policyContext.state.user = user;
    policyContext.user = user;
    return true;
  } catch (e) {
    return false;
  }
};
var is_authenticated_default = isAuthenticated;

// plugins/zhao-auth/server/src/policies/tenant-context-injector.ts
var tenantContextInjector = async (policyContext, config, { strapi: strapi2 }) => {
  if (!policyContext.state?.siteDocumentId) {
    const user = policyContext.state?.user;
    const currentTenantId = user?.currentTenantId;
    if (currentTenantId) {
      policyContext.state.siteDocumentId = currentTenantId;
    }
  }
  return true;
};
var tenant_context_injector_default = tenantContextInjector;

// plugins/zhao-auth/server/src/policies/has-permission.ts
var hasPermission = async (policyContext, config, { strapi: strapi2 }) => {
  const user = policyContext.state?.user;
  if (!user?.id) {
    return false;
  }
  const action = config?.action;
  if (!action) {
    return false;
  }
  const userRoles = Array.isArray(user.zhaoRoles) ? user.zhaoRoles : Array.isArray(user.roles) ? user.roles : [];
  if (userRoles.includes("admin")) {
    return true;
  }
  try {
    const permissionService = strapi2.plugin("zhao-auth").service("permission");
    const tenantDocumentId = policyContext.state?.siteDocumentId;
    const result = await permissionService.getMyPermissions(user.id, tenantDocumentId);
    if (result.permissions.includes(action)) {
      return true;
    }
  } catch (e) {
  }
  return false;
};
var has_permission_default = hasPermission;

// plugins/zhao-auth/server/src/policies/has-channel-access.ts
var hasChannelAccess = async (policyContext, config, { strapi: strapi2 }) => {
  const user = policyContext.state?.user;
  if (!user?.id) {
    return false;
  }
  const rawId = config?.channelId ?? policyContext.params?.channelId ?? policyContext.params?.id ?? policyContext.request?.body?.channelId ?? policyContext.query?.channel;
  const channelId = typeof rawId === "string" ? parseInt(rawId, 10) : Number(rawId);
  if (isNaN(channelId) || channelId <= 0) {
    return false;
  }
  try {
    const channelPermService = strapi2.plugin("zhao-channel").service("channel-permission");
    const hasPermission3 = await channelPermService.checkUserChannelPermission(user.id, channelId);
    if (!hasPermission3) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};
var has_channel_access_default = hasChannelAccess;

// plugins/zhao-auth/server/src/policies/has-channel-scope.ts
var hasChannelScope = async (policyContext, config, { strapi: strapi2 }) => {
  let user = policyContext.state?.user;
  if (!user?.id && policyContext.request?.headers?.authorization) {
    try {
      const authHeader = policyContext.request.headers.authorization;
      const token = authHeader.replace("Bearer ", "");
      const jwt2 = require_jsonwebtoken();
      const decoded = jwt2.decode(token);
      if (decoded?.id) {
        user = await strapi2.entityService.findOne("plugin::users-permissions.user", decoded.id, {
          fields: ["id", "username", "email", "zhaoRoles"]
        });
      }
    } catch (err) {
      strapi2.log.error(`[has-channel-scope] \u89E3\u6790 token \u5931\u8D25: ${err.message}`);
    }
  }
  if (!user?.id) {
    policyContext.state.channelScope = { all: false, channelIds: [], isGuest: true };
    return true;
  }
  try {
    const channelScopeService = strapi2.plugin("zhao-auth").service("channel-scope");
    const scope = await channelScopeService.resolve(user);
    policyContext.state.channelScope = scope;
  } catch (err) {
    strapi2.log.error(`[has-channel-scope] \u9519\u8BEF: ${err.message}`);
    policyContext.state.channelScope = { all: false, channelIds: [], isGuest: false };
  }
  return true;
};
var has_channel_scope_default = hasChannelScope;

// plugins/zhao-auth/server/src/policies/has-tenant-access.ts
var hasTenantAccess = async (policyContext, config, { strapi: strapi2 }) => {
  const user = policyContext.state?.user;
  if (!user?.id) {
    return false;
  }
  const userRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : Array.isArray(user.zhaoRoles) ? user.zhaoRoles : [];
  if (userRoles.includes("admin")) {
    return true;
  }
  const siteId = policyContext.state?.siteDocumentId;
  if (!siteId) {
    return true;
  }
  const scope = policyContext.state?.channelScope;
  let userChannelIds;
  if (scope) {
    if (scope.all) {
      return true;
    }
    userChannelIds = Array.isArray(scope.channelIds) ? scope.channelIds : [];
  } else {
    try {
      const channelPermService = strapi2.plugin("zhao-channel").service("channel-permission");
      userChannelIds = await channelPermService.getUserAllChannels(user.id) || [];
    } catch (e) {
      strapi2.log.warn(`[has-tenant-access] failed to resolve user channels: ${e.message}`);
      return false;
    }
  }
  if (userChannelIds.length === 0) {
    return false;
  }
  let siteChannelIds = [];
  try {
    const siteConfig = await strapi2.db.query("plugin::zhao-common.site-config").findOne({
      where: { documentId: siteId },
      populate: { channels: { select: ["id"] } }
    });
    if (siteConfig?.channels && Array.isArray(siteConfig.channels)) {
      siteChannelIds = siteConfig.channels.map((c) => c?.id).filter((id) => typeof id === "number");
    }
  } catch (e) {
    strapi2.log.warn(`[has-tenant-access] failed to query site channels: ${e.message}`);
    return false;
  }
  if (siteChannelIds.length === 0) {
    return false;
  }
  return userChannelIds.some((uc) => siteChannelIds.includes(uc));
};
var has_tenant_access_default = hasTenantAccess;

// plugins/zhao-auth/server/src/policies/index.ts
var policies_default = {
  "is-authenticated": is_authenticated_default,
  "tenant-context-injector": tenant_context_injector_default,
  "has-permission": has_permission_default,
  "has-channel-access": has_channel_access_default,
  "has-channel-scope": has_channel_scope_default,
  "has-tenant-access": has_tenant_access_default
};

// plugins/zhao-auth/server/src/bootstrap.ts
async function ensureAdminUser(strapi2) {
  try {
    const knex = strapi2.db.connection;
    const existing = await knex("up_users").whereRaw("zhao_roles @> ?::jsonb", [JSON.stringify(["admin"])]).select("id", "username", "email").first();
    if (existing) {
      strapi2.log.info(
        `zhao-auth: \u5DF2\u5B58\u5728 admin \u7528\u6237\uFF08id=${existing.id}, username=${existing.username}\uFF09\uFF0C\u8DF3\u8FC7\u521D\u59CB\u5316`
      );
      return;
    }
    const username = process.env.INIT_ADMIN_USERNAME || "admin";
    const email = process.env.INIT_ADMIN_EMAIL || "admin@example.com";
    const password = process.env.INIT_ADMIN_PASSWORD || "Admin@12345";
    const dup = await knex("up_users").where("username", username).orWhere("email", email).select("id", "username", "email").first();
    if (dup) {
      strapi2.log.warn(
        `zhao-auth: \u7528\u6237\u540D\u6216\u90AE\u7BB1\u5DF2\u88AB\u5360\u7528\uFF08id=${dup.id}, username=${dup.username}\uFF09\uFF0C\u4F46\u8BE5\u7528\u6237\u975E admin \u89D2\u8272\u3002\u8DF3\u8FC7 admin \u521D\u59CB\u5316\uFF0C\u8BF7\u624B\u52A8\u5904\u7406\u3002`
      );
      return;
    }
    const hash2 = await bcryptjs_default.hash(password, 10);
    const documentId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : require("crypto").randomUUID();
    const now = /* @__PURE__ */ new Date();
    await knex("up_users").insert({
      document_id: documentId,
      username,
      email,
      password: hash2,
      provider: "local",
      confirmed: true,
      blocked: false,
      zhao_roles: JSON.stringify(["admin"]),
      created_at: now,
      updated_at: now,
      published_at: now
    });
    strapi2.log.info(
      `zhao-auth: \u2705 \u5DF2\u521B\u5EFA\u7B2C\u4E00\u4E2A admin \u7528\u6237\uFF08username=${username}, email=${email}\uFF09\u3002\u8BF7\u5C3D\u5FEB\u4FEE\u6539\u9ED8\u8BA4\u5BC6\u7801\u3002`
    );
  } catch (error) {
    strapi2.log.warn(
      `zhao-auth: admin \u7528\u6237\u521D\u59CB\u5316\u5931\u8D25: ${error?.message || String(error)}`
    );
  }
}
var bootstrap = async ({ strapi: strapi2 }) => {
  strapi2.log.info("zhao-auth: \u63D2\u4EF6\u5DF2\u542F\u52A8");
  setTimeout(async () => {
    try {
      const results = await strapi2.plugin("zhao-auth").service("permission").initDefaultRoles();
      if (results && results.length) {
        strapi2.log.info(
          `zhao-auth: \u89D2\u8272\u521D\u59CB\u5316\u5B8C\u6210 [${results.join(", ")}]`
        );
      }
      await ensureAdminUser(strapi2);
    } catch (error) {
      strapi2.log.warn(
        `zhao-auth: \u89D2\u8272\u521D\u59CB\u5316\u5931\u8D25\uFF08\u53EF\u80FD\u662F content-type \u5C1A\u672A\u5C31\u7EEA\uFF0C\u53EF\u901A\u8FC7 POST /api/zhao-auth/v1/admin/permissions/init \u624B\u52A8\u89E6\u53D1\uFF09: ${error?.message || String(error)}`
      );
    }
  }, 3e3);
};
var bootstrap_default = bootstrap;

// plugins/zhao-auth/server/src/register.ts
var register = ({ strapi: strapi2 }) => {
  const policyRegistry = strapi2.get("policies");
  policyRegistry.add("plugin::zhao-auth", policies_default);
  strapi2.log.info("[zhao-auth] \u7B56\u7565\u5DF2\u6CE8\u518C");
};
var register_default = register;

// plugins/zhao-auth/server/src/destroy.ts
var destroy = ({ strapi: strapi2 }) => {
  strapi2.log.info("zhao-auth plugin destroyed");
};
var destroy_default = destroy;

// plugins/zhao-auth/server/src/config.ts
var config_default = {
  default: {
    // 认证中间件默认配置
    authenticate: {
      publicPaths: []
    },
    // 授权中间件默认配置
    authorize: {
      policies: []
    }
  },
  validator: (config) => {
    if (config.authenticate && typeof config.authenticate !== "object") {
      throw new Error("authenticate \u914D\u7F6E\u5FC5\u987B\u662F\u5BF9\u8C61");
    }
    if (config.authorize && typeof config.authorize !== "object") {
      throw new Error("authorize \u914D\u7F6E\u5FC5\u987B\u662F\u5BF9\u8C61");
    }
  }
};

// plugins/zhao-auth/server/src/routes/content-api.ts
var publicRoute = (method, path, handler) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: { auth: false }
});
var userRoute = (method, path, handler) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      "plugin::zhao-auth.tenant-context-injector"
    ]
  }
});
var adminRoute = (method, path, handler, permission) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      "plugin::zhao-auth.tenant-context-injector",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } }
    ]
  }
});
var content_api_default = () => ({
  type: "content-api",
  routes: [
    publicRoute("GET", "/auth/config", "auth.config"),
    publicRoute("POST", "/login", "auth.login"),
    publicRoute("POST", "/admin/auth/local", "auth.adminLocal"),
    publicRoute("POST", "/register", "auth.register"),
    publicRoute("POST", "/reset-password", "auth.resetPassword"),
    userRoute("POST", "/auth/switch-tenant", "auth.switchTenant"),
    userRoute("GET", "/my/roles", "role-management.getMyRoles"),
    userRoute("GET", "/my/permissions", "role-management.getMyPermissions"),
    userRoute("GET", "/my/permission-keys", "permission.getMyPermissions"),
    // 角色管理
    adminRoute("GET", "/roles", "permission.listRoles", "role.read"),
    adminRoute("GET", "/roles/all", "permission.getAllRoles", "role.read"),
    adminRoute("GET", "/roles/:role", "permission.getRole", "role.read"),
    adminRoute("POST", "/roles", "permission.createRole", "role.create"),
    adminRoute("PUT", "/roles/:role", "permission.updateRole", "role.assign"),
    adminRoute("DELETE", "/roles/:role", "permission.deleteRole", "role.assign"),
    adminRoute("GET", "/users", "role-management.findUsers", "role.read"),
    adminRoute("GET", "/users/:id/roles", "role-management.getUserRoles", "role.read"),
    adminRoute("POST", "/roles/assign", "role-management.assignRole", "role.assign"),
    adminRoute("POST", "/roles/revoke", "role-management.revokeRole", "role.revoke"),
    adminRoute("POST", "/roles/batch-assign", "role-management.batchAssignRoles", "role.assign"),
    adminRoute("GET", "/roles/logs", "role-management.getActionLogs", "role.read-logs"),
    adminRoute("GET", "/users/:id/detail", "role-management.getUserDetail", "role.read"),
    adminRoute("GET", "/roles/assignable", "role-management.getAssignableRoles", "role.read"),
    // 权限管理
    adminRoute("GET", "/permissions/tree", "permission.getTree", "role.read"),
    adminRoute("GET", "/permissions/role/:role", "permission.getRolePermissions", "role.read"),
    adminRoute("PUT", "/permissions/role/:role", "permission.updateRolePermissions", "role.assign"),
    adminRoute("POST", "/permissions/init", "permission.initRoles", "role.assign"),
    // 渠道范围查询
    userRoute("GET", "/my/channel-scope", "permission.getMyChannelScope"),
    // 角色-渠道授权
    adminRoute("GET", "/role-channels", "role-channel.list", "role.assign"),
    adminRoute("POST", "/role-channels", "role-channel.grant", "role.assign"),
    adminRoute("POST", "/role-channels/batch", "role-channel.batchGrant", "role.assign"),
    adminRoute("DELETE", "/role-channels/:id", "role-channel.revoke", "role.assign"),
    adminRoute("DELETE", "/role-channels/role/:role", "role-channel.revokeByRole", "role.assign")
  ]
});

// plugins/zhao-auth/server/src/routes/tenant.ts
var tenant_default2 = () => ({
  type: "content-api",
  routes: [
    {
      method: "GET",
      path: "/v1/my/tenants",
      handler: "tenant.getMyTenants",
      config: {
        auth: false,
        policies: [
          "plugin::zhao-auth.is-authenticated",
          "plugin::zhao-auth.tenant-context-injector"
        ]
      }
    }
  ]
});

// plugins/zhao-auth/server/src/routes/module-visibility.ts
var adminRoute2 = (method, path, handler, permission) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      "plugin::zhao-auth.tenant-context-injector",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } }
    ]
  }
});
var module_visibility_default2 = () => ({
  type: "content-api",
  routes: [
    adminRoute2("GET", "/module-visibility", "module-visibility.get", "menu.module-visibility"),
    adminRoute2("PUT", "/module-visibility", "module-visibility.update", "menu.module-visibility")
  ]
});

// plugins/zhao-auth/server/src/routes/index.ts
var routes_default = {
  "content-api": {
    type: "content-api",
    routes: content_api_default().routes
  },
  tenant: {
    type: "content-api",
    routes: tenant_default2().routes
  },
  "module-visibility": {
    type: "content-api",
    routes: module_visibility_default2().routes
  }
};

// plugins/zhao-auth/server/src/utils/permission-helpers.ts
function hasPermission2(userRoles, requiredPermission, permissionConfig) {
  if (!userRoles || userRoles.length === 0) {
    return false;
  }
  const effectiveRoles = getEffectiveRoles(userRoles);
  for (const role of effectiveRoles) {
    const permissions = permissionConfig[role];
    if (permissions && permissions.includes(requiredPermission)) {
      return true;
    }
    if (permissions && permissions.includes("*")) {
      return true;
    }
  }
  return false;
}
function hasAnyRole(userRoles, requiredRoles) {
  if (!userRoles || userRoles.length === 0) {
    return false;
  }
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }
  const effectiveRoles = getEffectiveRoles(userRoles);
  return requiredRoles.some((requiredRole) => effectiveRoles.includes(requiredRole));
}
function getEffectiveRoles(userRoles) {
  if (!userRoles || userRoles.length === 0) {
    return [];
  }
  const effectiveSet = new Set(userRoles);
  for (const role of userRoles) {
    const inheritedRoles = ROLE_INHERITANCE[role];
    if (inheritedRoles) {
      for (const inheritedRole of inheritedRoles) {
        effectiveSet.add(inheritedRole);
      }
    }
  }
  return Array.from(effectiveSet);
}
function validatePermissionFormat(permission) {
  if (!permission || typeof permission !== "string") {
    return false;
  }
  const validFormats = [
    /^[a-z]+:[a-z_]+$/,
    /^[a-z]+\.[a-z_]+$/
  ];
  return validFormats.some((format) => format.test(permission));
}
function parsePermission(permission) {
  if (!validatePermissionFormat(permission)) {
    return null;
  }
  if (permission.includes(":")) {
    const [plugin, action] = permission.split(":");
    return { plugin, action };
  }
  if (permission.includes(".")) {
    const [resource, action] = permission.split(".");
    return { resource, action };
  }
  return null;
}

// plugins/zhao-auth/server/src/index.ts
var index_default = {
  register: register_default,
  bootstrap: bootstrap_default,
  destroy: destroy_default,
  config: config_default,
  services: services_default,
  controllers: controllers_default,
  contentTypes: content_types_default,
  policies: policies_default,
  middlewares: middlewares_default,
  routes: routes_default
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getEffectiveRoles,
  hasAnyRole,
  hasPermission,
  parsePermission,
  validatePermissionFormat
});
/*! Bundled license information:

safe-buffer/index.js:
  (*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> *)

lodash/lodash.js:
  (**
   * @license
   * Lodash <https://lodash.com/>
   * Copyright OpenJS Foundation and other contributors <https://openjsf.org/>
   * Released under MIT license <https://lodash.com/license>
   * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
   * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
   *)
*/
