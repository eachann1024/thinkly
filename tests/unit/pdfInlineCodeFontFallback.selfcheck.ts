import assert from "node:assert/strict";
import {
  PDF_DM_MONO_FAMILY,
  PDF_FONT_FAMILY,
  PDF_INLINE_CODE_FONT_FAMILIES,
} from "../../src/lib/pdfExport/fontConfig";

assert.deepEqual(PDF_INLINE_CODE_FONT_FAMILIES, [
  PDF_DM_MONO_FAMILY,
  PDF_FONT_FAMILY,
]);
