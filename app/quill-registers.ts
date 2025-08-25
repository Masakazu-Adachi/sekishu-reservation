'use client';
import Quill from 'quill';
import ImageResize from 'quill-image-resize-module';

// Avoid double registration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyQ = Quill as any;
if (!anyQ.__IMAGE_RESIZE_REGISTERED__) {
  anyQ.register('modules/imageResize', ImageResize);
  anyQ.__IMAGE_RESIZE_REGISTERED__ = true;
}
